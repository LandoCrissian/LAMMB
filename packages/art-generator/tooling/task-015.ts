import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { canonicalJson, canonicalSha256 } from '../src/canonical.ts';
import {
  evaluateComposition,
  specimenFingerprint,
} from '../src/constraints.ts';
import { generateCollection, verifyCollection } from '../src/engine.ts';
import type { EngineArtifacts } from '../src/engine.ts';
import { validateInputs } from '../src/inputs.ts';
import {
  GENERATED_ROOT,
  REPOSITORY_ROOT,
  readArtifacts,
  readJson,
  writeGeneratedBundle,
} from '../src/io.ts';
import {
  openSeaMetadataSchema,
  createProposalMetadataAdapter,
} from '../src/opensea-metadata.ts';
import {
  productionSpecSchema,
  simulationInputs,
} from '../src/production-spec.ts';
import type { ProductionSpec } from '../src/production-spec.ts';
import { relativePathSchema } from '../src/schema.ts';

const specPath = join(
  REPOSITORY_ROOT,
  'packages/art-generator/specs/lammb-traits-v1.json',
);
const baseSha = '13f100365b7a386805fefa32a2b8f6e190bb61d5';
const spec = productionSpecSchema.parse(await readJson(specPath));
const inputs = simulationInputs(spec);
validateInputs(
  inputs.catalog,
  inputs.manifest,
  inputs.request,
  inputs.assetBytes,
);
const traits = new Map(spec.traits.map((t) => [t.id, t]));
const engineTraits = new Map(inputs.catalog.traits.map((t) => [t.id, t]));
const assets = new Map(inputs.manifest.assets.map((a) => [a.id, a]));
const metadata = createProposalMetadataAdapter(spec);

export function auditSimulation(artifacts: EngineArtifacts) {
  assert.equal(artifacts.logicalCollection.specimens.length, spec.supply);
  assert.equal(
    new Set(artifacts.logicalCollection.specimens.map((s) => s.fingerprint))
      .size,
    spec.supply,
  );
  const reserved = new Map(spec.grails.map((g) => [g.index, g]));
  const frequencies = Object.fromEntries(spec.traits.map((t) => [t.id, 0]));
  const previews = [];
  for (const specimen of artifacts.logicalCollection.specimens) {
    const selected = specimen.traitIds.map((id) => engineTraits.get(id)!);
    const evaluated = evaluateComposition(selected, inputs.catalog, assets);
    assert.deepEqual(evaluated.rejections, []);
    assert.equal(
      specimenFingerprint(selected, evaluated.composition),
      specimen.fingerprint,
    );
    assert.deepEqual(evaluated.composition, specimen.composition);
    assert.equal(
      specimen.grailId,
      reserved.has(specimen.index)
        ? `dev-${reserved.get(specimen.index)!.id}`
        : null,
    );
    if (reserved.has(specimen.index))
      assert.deepEqual(
        [...specimen.traitIds].sort(),
        reserved
          .get(specimen.index)!
          .traitIds.map((id) => `dev-${id}`)
          .sort(),
      );
    const ids = specimen.traitIds.map((id) => id.slice(4));
    for (const id of ids) frequencies[id]!++;
    const publicRecord = artifacts.publicMetadata.specimens[specimen.index]!;
    assert.deepEqual(
      publicRecord.publicTraits,
      selected
        .filter((t) => t.publicMetadata)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((t) => ({ label: t.category, value: t.label })),
    );
    previews.push({
      logicalIndex: specimen.index,
      purpose: 'DEVELOPMENT_ONLY',
      published: false,
      metadata: metadata.revealed(
        `SIM-${String(specimen.index).padStart(4, '0')}`,
        ids,
        `https://example.invalid/task-015/${specimen.index}.png`,
        specimen.grailId?.slice(4) ?? null,
      ),
    });
  }
  const frequencyResults = spec.traits.map((t) => {
    const reservedCount = spec.grails.filter((g) =>
      g.traitIds.includes(t.id),
    ).length;
    const observedTotal = frequencies[t.id]!;
    const observedOrdinary =
      artifacts.summary.ordinaryTraitFrequencies[`dev-${t.id}`]!;
    assert.equal(observedTotal, observedOrdinary + reservedCount);
    const exact =
      spec.categories.find((c) => c.category === t.category)!
        .frequencyPolicy === 'EXACT_TOTAL' || t.ordinaryDisabled;
    if (exact) assert.equal(observedTotal, t.proposedTotalCount);
    assert.equal(
      artifacts.summary.categoryFrequencies[t.category][`dev-${t.id}`],
      observedTotal,
    );
    return {
      id: t.id,
      category: t.category,
      proposedTotal: t.proposedTotalCount,
      approvedTotal: null,
      observedTotal,
      observedOrdinary,
      reservedCount,
      policy: exact ? 'EXACT_TOTAL' : 'WEIGHTED_TARGET',
      delta: observedTotal - t.proposedTotalCount,
    };
  });
  for (const category of spec.categories)
    assert.equal(
      frequencyResults
        .filter((t) => t.category === category.category)
        .reduce((n, t) => n + t.observedTotal, 0),
      spec.supply,
    );
  const metadataCounts: Record<string, Record<string, number>> = {};
  for (const preview of previews)
    for (const attribute of preview.metadata.attributes) {
      const values = (metadataCounts[attribute.trait_type] ??= {});
      values[attribute.value] = (values[attribute.value] ?? 0) + 1;
    }
  assert.equal(artifacts.summary.grailCount, spec.grails.length);
  const { perSpecimenAttempts, ...attempts } =
    artifacts.summary.attemptStatistics;
  assert.equal(
    perSpecimenAttempts.reduce((a, b) => a + b, 0),
    attempts.totalCandidates,
  );
  return {
    previews,
    report: {
      schemaVersion: 1,
      purpose: 'DEVELOPMENT_ONLY',
      artworkGenerated: false,
      productionApproved: false,
      specSha256: canonicalSha256(spec),
      requested: spec.supply,
      generated: spec.supply,
      uniqueIdentities: spec.supply,
      compatibilityFailuresInAcceptedSpecimens: 0,
      mutationCount: artifacts.summary.mutationCount,
      grailReservations: spec.grails.map((g) => ({ id: g.id, index: g.index })),
      seedHex: inputs.request.seedHex,
      sourceReference: inputs.request.sourceReference,
      engineRecipe: artifacts.logicalCollection.recipe,
      attemptStatistics: attempts,
      rejectionCounts: artifacts.summary.rejectionCounts,
      frequencies: frequencyResults,
      visibleMetadataFrequencies: metadataCounts,
      logicalCollectionSha256: artifacts.provenance.logicalCollectionSha256,
      engineMetadataSha256: artifacts.provenance.publicMetadataSha256,
      metadataPreviewSha256: canonicalSha256(previews),
      provenanceSha256: canonicalSha256(artifacts.provenance),
    },
  };
}

function compatibility(trait: ProductionSpec['traits'][number]) {
  return (
    [
      ...trait.requiresTraitIds.map(
        (id) => `Requires ${traits.get(id)!.displayName} (${id}).`,
      ),
      ...trait.incompatibleTraitIds.map(
        (id) => `Excludes ${traits.get(id)!.displayName} (${id}).`,
      ),
      ...spec.compatibilityRules
        .filter(
          (r) => r.type === 'INCOMPATIBLE' && r.traitIds.includes(trait.id),
        )
        .map((r) => `${r.id}: ${r.reason}`),
      ...(trait.mutation?.categoryEffects.map(
        (e) =>
          `${e.category}: allowed ${e.allowedTraitIds.join(', ')}; ${e.replacementAssetIds ? `replace with ${e.replacementAssetIds.join(', ')}` : 'retain selected registered assets'}.`,
      ) ?? []),
    ].join(' ') ||
    'Shared registered sheep frame, protected landmarks and anatomy-family variant requirements. No additional logical exclusion.'
  );
}

async function documents(check: boolean) {
  const outputs = new Map<string, string>();
  const simulation = (await readJson(
    join(REPOSITORY_ROOT, 'docs/trait-bible/SIMULATION.json'),
  )) as ReturnType<typeof auditSimulation>['report'];
  assert.equal(
    simulation.specSha256,
    canonicalSha256(spec),
    'Simulation snapshot does not match the specification; run a fresh simulation',
  );
  let frequencies =
    '# Proposed and observed collection frequencies\n\nAll proposed per-category totals cover 5280; all approved counts remain unset. EXACT_TOTAL values are hard quotas after reserved contributions are subtracted. For WEIGHTED_TARGET, proposed totals are owner preferences and selectionWeight is a raw draw weight; neither is the compatibility-conditioned expected final count. Observed totals belong to this exact recipe only. See [the adversarial frequency audit](ADVERSARIAL_REVIEW.md#frequency-audit) for the original 240/82 dental discrepancy, revised results and seed sensitivity. Do not substitute these tables for owner frequency approval or a custom rarity ranking.\n\n';
  for (const category of spec.categories) {
    frequencies += `## ${category.displayName}\n\n| Stable trait ID | Display name | Proposed total | Observed total | Ordinary | Reserved | Difference | Policy |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |\n`;
    for (const row of simulation.frequencies.filter(
      (r) => r.category === category.category,
    ))
      frequencies += `| ${row.id} | ${traits.get(row.id)!.displayName} | ${row.proposedTotal} | ${row.observedTotal} | ${row.observedOrdinary} | ${row.reservedCount} | ${row.delta} | ${row.policy} |\n`;
    frequencies += '\n';
  }
  const proposedFacets: Record<string, Record<string, number>> = {};
  for (const trait of spec.traits)
    for (const attribute of trait.metadata) {
      const values = (proposedFacets[attribute.trait_type] ??= {});
      values[attribute.value] =
        (values[attribute.value] ?? 0) + trait.proposedTotalCount;
    }
  for (const grail of spec.grails)
    for (const attribute of grail.metadata) {
      const values = (proposedFacets[attribute.trait_type] ??= {});
      values[attribute.value] = (values[attribute.value] ?? 0) + 1;
    }
  frequencies +=
    '## Visible OpenSea facet counts\n\nOptional facet rows do not each total 5280. Accessory configurations can contribute multiple facets; absent facets are omitted. These are visible categorical counts, not rarity scores.\n\n| Attribute | Value | Proposed total | Observed total |\n| --- | --- | ---: | ---: |\n';
  for (const name of Object.keys(proposedFacets).sort())
    for (const value of Object.keys(proposedFacets[name]!).sort())
      frequencies += `| ${name} | ${value} | ${proposedFacets[name]![value]} | ${simulation.visibleMetadataFrequencies[name]?.[value] ?? 0} |\n`;
  const gold = simulation.frequencies.find(
    (r) => r.id === 'lammb-accessories-gold-tooth',
  )!;
  frequencies += `\nThe Gold Dental Accent target is ${gold.proposedTotal}; ${gold.observedTotal} were accepted. The accent requires a visible dental expression and excludes refractive crystal mouths; compatibility substantially reduces its weighted realization; whole-collection uniqueness and quotas also condition the draws. Owner must approve realized counts or request a separately feasible exact-count schedule. No constraint or timeout was relaxed to meet a target.\n\n## Actual logical simulation\n\n- Requested / generated / unique: ${simulation.requested} / ${simulation.generated} / ${simulation.uniqueIdentities}.\n- Structural specimens: ${simulation.mutationCount}; proposed reserved compositions: ${simulation.grailReservations.length}.\n- Ordinary accepted: ${simulation.attemptStatistics.ordinaryAccepted}; total candidates ${simulation.attemptStatistics.totalCandidates}; rejected ${simulation.attemptStatistics.rejectedCandidates}; maximum per specimen ${simulation.attemptStatistics.maxSpecimenAttempts}.\n- Accepted incompatibilities: ${simulation.compatibilityFailuresInAcceptedSpecimens}.\n- Exact quota categories and reserved Observer Array matched their specified totals.\n- Logical collection SHA256: \`${simulation.logicalCollectionSha256}\`.\n- Metadata preview SHA256: \`${simulation.metadataPreviewSha256}\`.\n\nTwo fresh runs produced nine byte-identical files. Stored-bundle reconstruction, effective replacements, reserved slots, all metadata records and all per-category counts were checked. The two complete bundles and raw hashes remain under ignored \`artifacts/generated/task-015a/validation-a\`, \`validation-b\` and \`reproducibility.json\`. [Full committed evidence](SIMULATION.json) contains recipe versions, input digests, rejection counts and detailed frequencies. Zero artwork was generated. The disclosed seed proves this construction instance, not every possible seed or final image/assignment correctness.\n`;
  outputs.set('docs/trait-bible/FREQUENCIES.md', frequencies);
  let definitions =
    '# Complete trait definitions — proposal v1.0.0\n\nAll 63 values are PROPOSED. No artwork or count is owner-approved. One selected configuration per existing engine category; headwear, materials and effects are facets, not extra independent draws.\n\n';
  for (const category of spec.categories) {
    definitions += `## ${category.displayName} (${category.category})\n\n${category.definition}\n\nFrequency policy: ${category.frequencyPolicy}; proposed totals cover 5280.\n\n`;
    for (const t of spec.traits.filter(
      (t) => t.category === category.category,
    )) {
      definitions += `### ${t.displayName}\n\n- Stable ID: \`${t.id}\`.\n- Visual definition: ${t.visualDefinition}\n- Compatibility: ${compatibility(t)}\n- Production source requirements: ${t.assetRequirementIds.map((id) => `\`${id}\``).join(', ')}; all MISSING. Family variants are explicitly inventoried in the machine specification.\n- Proposed total: ${t.proposedTotalCount}/5280 (${((100 * t.proposedTotalCount) / spec.supply).toFixed(2)}%); integer weight ${t.selectionWeight}; ${t.ordinaryDisabled ? 'ordinary selection disabled; reserved compositions only' : category.frequencyPolicy}. Approved count: unset.\n- Metadata: ${t.metadata.length ? t.metadata.map((a) => `${a.trait_type} = ${a.value}`).join('; ') : 'optional attributes omitted because no accessory is visible'}.\n- Evidence: ${t.referenceIds.join(', ')}. References are REVIEW, not source art.\n- Approval: PROPOSED; owner approval reference absent.\n\n`;
    }
  }
  outputs.set('docs/trait-bible/TRAITS.md', definitions);
  outputs.set(
    'docs/trait-bible/MUTATIONS.md',
    '# Structural mutation specifications\n\nFamilies are exclusive; neither mutation status nor unusual anatomy assigns a rarity tier. Fixed base replacements are representable by the existing engine. Conditional face/garment sources remain a production blocker. Horns are mutation-only.\n\n' +
      spec.mutationSpecifications
        .map(
          (m) =>
            `## ${traits.get(m.traitId)!.displayName}\n\nStable trait: \`${m.traitId}\`; PROPOSED.\n\n${m.anatomyReplacement}\n\nPreserve: ${m.preservedLandmarks.join('; ')}.\n\nWool: ${m.woolTreatment}\n\nEyes/expression: ${m.eyesAndExpression}\n\nClothing/accessories: ${m.clothingAndAccessories}\n\nMaterial: ${m.material}. Effects: ${m.effects}\n\nForbidden: ${m.forbiddenCombinations.join('; ')}.\n\nEnforced logical replacement/allowed sets: ${compatibility(traits.get(m.traitId)!)}\n`,
        )
        .join('\n'),
  );
  outputs.set(
    'docs/trait-bible/GRAILS.md',
    '# Reserved grail design proposals\n\nSix proposed singleton compositions occupy internal logical indices only, never token IDs or favored wallet allocations. All six classifications and counts require owner approval. A normal skeletal mutation, clothing or jewelry alone is not a grail. The engine excludes these fingerprints from ordinary selection. Production planning may use its existing reviewed `grailCompositions` source override after art approval.\n\n' +
      spec.grails
        .map(
          (g) =>
            `## ${g.displayName}\n\nStable ID \`${g.id}\`; proposed count 1; logical reservation ${g.index}; approval PROPOSED.\n\n${g.visualDefinition}\n\nSilhouette gate: ${g.silhouetteTest}\n\nMaterial gate: ${g.materialTest}\n\nExact composition: ${g.traitIds.map((id) => `\`${id}\``).join(', ')}.\n\nRequired curated source: ${g.assetRequirementIds.join(', ')} (MISSING). Public visible phenomenon: ${g.metadata.map((a) => a.value).join(', ')}; no Grail/Rank/Tier attribute.\n`,
        )
        .join('\n'),
  );
  let requirements =
    '# Production source asset inventory\n\n76 logical source templates are MISSING. No SHA256 or approval declaration is fabricated. All proposed sources use `lammb-bust-three-quarter-v1`, 3072×3072, sRGB, full-frame source-over placement without implicit scaling. Backgrounds/curated scenes are opaque; character/effect sources require actual alpha. Layer order: background 0, anatomy 10, clothing 20, wool 30, expression 40, eyes 50, accessory configuration 60, structural effects 70, pixel effects 80. Replacement anatomy reuses its exclusive slot.\n\nImageGen must not be assumed to return aligned layers or requested native resolution. Preserve native masters, record actual dimensions and generation evidence, align/mask deliberately, decode/QA and obtain digest-bound approval before ingestion. Clear layers and exact backgrounds/tag typography use reviewed deterministic tools rather than hallucinated pixels.\n\n| Stable source ID | Category | Role | Production method | Alpha | Order | Variant declarations |\n| --- | --- | --- | --- | --- | --- | --- |\n';
  for (const a of spec.assetRequirements)
    requirements += `| ${a.id} | ${a.category} | ${a.role} | ${a.method} | ${a.alpha} | ${a.order} | ${spec.variantRequirements.filter((v) => v.assetRequirementId === a.id).length} |\n`;
  requirements += `\n${spec.variantRequirements.length} anatomy-family variant bindings are explicitly listed in \`lammb-traits-v1.json\`. These replace the corresponding generic templates during future reviewed production compilation, not additional independent traits. Their absence blocks pixel production. The current engine cannot condition an asset substitution on both the selected expression/accessory and mutation; no automatic variant resolution is implemented here.\n\n| Variant ID | Template | Anatomy family | Status |\n| --- | --- | --- | --- |\n`;
  for (const v of spec.variantRequirements)
    requirements += `| ${v.id} | ${v.assetRequirementId} | ${v.mutationTraitId} | MISSING |\n`;
  outputs.set('docs/trait-bible/ASSET_REQUIREMENTS.md', requirements);
  outputs.set(
    'docs/trait-bible/REFERENCE_REVIEW.md',
    '# Recovered reference evidence\n\nThe local Studio ingestion 002 package has 13 original sheets and 40 cropped panels; every source remains REVIEW. All four active approved identity/anatomy/mutation roles are null. Files were read and raw SHA256 verified, without changing source bytes. The contact sheet was inspected without generating screenshots or running a renderer. Original sheets may contain prohibited crowns/logos; those are exclusions, not trait approvals. Crystalline is a new owner-requested design proposal; Multi Eye is an existing mutation-only review concept. Exact prototype counts and corruption-mask coverage ranges are new proposals, not facts inferred from historical captions.\n\n| Evidence ID | Preserved filename | SHA256 | State | Note |\n| --- | --- | --- | --- | --- |\n' +
      spec.referenceEvidence
        .map(
          (r) =>
            `| ${r.id} | ${r.filename} | ${r.sha256} | ${r.status} | ${r.note.replaceAll('|', '/')} |\n`,
        )
        .join('') +
      '\nNo source image was republished into the repository. ART 005 QA rejected production compliance for exact background, framing, pose and drips. Those failures inform the new QA gates; its candidate is not an approved Genesis Base.\n',
  );
  for (const [name, schema] of [
    ['lammb-traits-v1.schema.json', productionSpecSchema],
    ['opensea-metadata-v1.schema.json', openSeaMetadataSchema],
  ] as const)
    outputs.set(
      `packages/art-generator/specs/${name}`,
      `${JSON.stringify(z.toJSONSchema(schema, { target: 'draft-2020-12' }), null, 2)}\n`,
    );
  const prettier = await import('prettier');
  for (const [path, content] of outputs) {
    const formatted = await prettier.format(content, {
      filepath: path,
      ...(await prettier.resolveConfig(join(REPOSITORY_ROOT, path))),
    });
    const destination = join(REPOSITORY_ROOT, path);
    if (check)
      assert.equal(
        await readFile(destination, 'utf8'),
        formatted,
        `Generated specification documentation drift: ${path}`,
      );
    else {
      await mkdir(join(destination, '..'), { recursive: true });
      await writeFile(destination, formatted, 'utf8');
    }
  }
  return {
    checked: check,
    files: [...outputs.keys()],
    variants: spec.variantRequirements.length,
  };
}

const [command, ...args] = process.argv.slice(2);
if (command === 'validate') {
  for (const grail of spec.grails) {
    const selected = grail.traitIds.map((id) => engineTraits.get(`dev-${id}`)!);
    assert.deepEqual(
      evaluateComposition(selected, inputs.catalog, assets).rejections,
      [],
    );
  }
  console.log(
    JSON.stringify({
      valid: true,
      specSha256: canonicalSha256(spec),
      categories: spec.categories.length,
      traitValues: spec.traits.length,
      mutationFamilies: spec.mutationSpecifications.length,
      grails: spec.grails.length,
      missingTemplates: spec.assetRequirements.length,
      missingVariants: spec.variantRequirements.length,
      productionApproved: false,
    }),
  );
} else if (command === 'documents') {
  assert(
    args.length === 0 || canonicalJson(args) === canonicalJson(['--check']),
    'Only --check is supported',
  );
  console.log(JSON.stringify(await documents(args.includes('--check'))));
} else if (command === 'simulate' || command === 'verify') {
  assert(
    args.length === 2 && args[0] === '--out',
    'Use --out with a fresh relative generated directory',
  );
  const output = relativePathSchema.parse(args[1]);
  const started = performance.now();
  const generated = generateCollection(inputs);
  assert(generated.ok, generated.ok ? '' : canonicalJson(generated.error));
  const { artifacts } = generated;
  const audited = auditSimulation(artifacts);
  assert(
    verifyCollection(inputs, artifacts).ok,
    'Engine reconstruction failed',
  );
  if (command === 'simulate') {
    const directory = await writeGeneratedBundle(
      output,
      {
        ...artifacts,
        report: audited.report,
        metadataPreview: audited.previews,
        catalog: inputs.catalog,
        manifest: inputs.manifest,
        request: inputs.request,
      },
      {
        logicalCollection: 'collection.json',
        publicMetadata: 'metadata.json',
        provenance: 'provenance.json',
        summary: 'summary.json',
        report: 'validation.json',
        metadataPreview: 'metadata-preview.json',
        catalog: 'simulation-catalog.json',
        manifest: 'simulation-assets.json',
        request: 'simulation-request.json',
      },
    );
    console.log(
      JSON.stringify({
        ok: true,
        directory,
        elapsedMs: Math.round(performance.now() - started),
        generated: audited.report.generated,
        uniqueIdentities: audited.report.uniqueIdentities,
        logicalCollectionSha256: audited.report.logicalCollectionSha256,
        metadataPreviewSha256: audited.report.metadataPreviewSha256,
        attemptStatistics: audited.report.attemptStatistics,
      }),
    );
  } else {
    assert(
      verifyCollection(inputs, await readArtifacts(output)).ok,
      'Stored logical bundle failed reconstruction',
    );
    assert.equal(
      canonicalJson(
        await readJson(join(GENERATED_ROOT, output, 'validation.json')),
      ),
      canonicalJson(audited.report),
    );
    assert.equal(
      canonicalJson(
        await readJson(
          join(GENERATED_ROOT, output, 'metadata-preview.json'),
          64 * 1024 * 1024,
        ),
      ),
      canonicalJson(audited.previews),
    );
    for (const [name, expected] of [
      ['simulation-catalog.json', inputs.catalog],
      ['simulation-assets.json', inputs.manifest],
      ['simulation-request.json', inputs.request],
    ] as const)
      assert.equal(
        canonicalJson(await readJson(join(GENERATED_ROOT, output, name))),
        canonicalJson(expected),
      );
    assert.equal(
      canonicalJson(
        await readJson(
          join(REPOSITORY_ROOT, 'docs/trait-bible/SIMULATION.json'),
        ),
      ),
      canonicalJson(audited.report),
      'Committed simulation snapshot differs from fresh reconstruction',
    );
    console.log(
      JSON.stringify({
        ok: true,
        output,
        elapsedMs: Math.round(performance.now() - started),
        logicalCollectionSha256: audited.report.logicalCollectionSha256,
        metadataPreviewSha256: audited.report.metadataPreviewSha256,
      }),
    );
  }
} else if (command === 'boundary') {
  assert(args.length === 0, 'Task 015 uses its recorded main baseline');
  const git = (arguments_: string[]) =>
    execFileSync('git', arguments_, { cwd: REPOSITORY_ROOT, encoding: 'utf8' })
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
  const paths = [
    ...new Set([
      ...git(['diff', '--no-renames', '--name-only', baseSha, '--']),
      ...git(['ls-files', '--others', '--exclude-standard']),
    ]),
  ].sort();
  const allowed =
    /^(?:packages\/(?:art-generator|collection)\/|docs\/trait-bible\/|tests\/(?:generator|generator-io|art-pipeline|art-ingestion|art-ingestion-io|collection|trait-bible)\.test\.ts$)/;
  const violations = paths.filter((path) => !allowed.test(path));
  assert.deepEqual(
    violations,
    [],
    `STOP_FOR_OWNER_REVIEW: out-of-scope changes ${violations.join(', ')}`,
  );
  console.log(
    JSON.stringify({
      ok: true,
      baseline: baseSha,
      changedFiles: paths,
      websiteChanges: 0,
      ciChanges: 0,
    }),
  );
} else
  throw new Error(
    'Use validate, documents [--check], simulate --out <fresh>, verify --out <existing>, or boundary',
  );
