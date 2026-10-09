import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  canonicalJson,
  canonicalSha256,
  compareText,
} from '../src/canonical.ts';
import {
  evaluateComposition,
  specimenFingerprint,
} from '../src/constraints.ts';
import { generateCollection, verifyCollection } from '../src/engine.ts';
import type { EngineArtifacts } from '../src/engine.ts';
import { validateInputs } from '../src/inputs.ts';
import { constructionPrng } from '../src/prng.ts';
import {
  productionSpecSchema,
  simulationInputs,
} from '../src/production-spec.ts';
import type { ProductionSpec } from '../src/production-spec.ts';

// Audit the rejected draws against an independently reconstructed accepted bundle.
// This cannot construct/export a collection: every final draw must match the real
// engine's recorded specimen, attempts, fingerprints, quotas and rejection totals.
export function auditCandidateTrace(
  spec: ProductionSpec,
  artifacts: EngineArtifacts,
) {
  const inputs = simulationInputs(
    spec,
    artifacts.logicalCollection.recipe.seedHex,
  );
  assert(
    verifyCollection(inputs, artifacts).ok,
    'Audit input fails engine reconstruction',
  );
  const { catalog, manifest } = validateInputs(
    inputs.catalog,
    inputs.manifest,
    inputs.request,
    inputs.assetBytes,
  );
  const prng = constructionPrng(artifacts.logicalCollection.recipe);
  const assets = new Map(manifest.assets.map((a) => [a.id, a]));
  const pools = catalog.categories.map(({ category }) =>
    catalog.traits.filter((t) => t.category === category),
  );
  const reserved = new Set(
    artifacts.logicalCollection.specimens
      .filter((s) => s.grailId)
      .map((s) => s.fingerprint),
  );
  const seen = new Set<string>();
  const counts = new Map(catalog.traits.map((t) => [t.id, 0]));
  const selections = new Map(
    catalog.traits.map((t) => [t.id, { drawn: 0, accepted: 0, rejected: 0 }]),
  );
  const reasons: Record<string, number> = {};
  const goldReasons: Record<string, number> = {};
  const goldRejectSets: Record<string, number> = {};
  const goldByExpression: Record<string, { drawn: number; accepted: number }> =
    {};
  const goldByMutation: Record<string, { drawn: number; accepted: number }> =
    {};
  let ordinaryAccepted = 0;
  let total = 0;
  let rejected = 0;
  const goldId = 'dev-lammb-accessories-gold-tooth';
  for (const specimen of artifacts.logicalCollection.specimens) {
    if (specimen.grailId) {
      seen.add(specimen.fingerprint);
      continue;
    }
    const attempts =
      artifacts.summary.attemptStatistics.perSpecimenAttempts[specimen.index]!;
    assert(attempts > 0);
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const remaining = spec.supply - reserved.size - ordinaryAccepted;
      const candidate = pools.map((pool) => {
        const quota = pool.filter(
          (t) => t.frequency.plannedCount !== undefined,
        );
        const needed = (t: (typeof pool)[number]) =>
          (t.frequency.plannedCount ?? 0) - counts.get(t.id)!;
        const forced = quota.filter((t) => needed(t) === remaining);
        const quotaRemaining = quota.reduce((n, t) => n + needed(t), 0);
        const eligible = pool.filter((t) => {
          if (t.frequency.plannedCount !== undefined && needed(t) <= 0)
            return false;
          if (forced.length) return forced.some((f) => f.id === t.id);
          return (
            quotaRemaining !== remaining ||
            t.frequency.plannedCount !== undefined
          );
        });
        assert(
          eligible.length && forced.length <= 1,
          'Trace exhausted eligible pool',
        );
        let draw = prng.bounded(
          eligible.reduce((n, t) => n + t.frequency.weight, 0),
        );
        for (const t of eligible) {
          if (draw < t.frequency.weight) return t;
          draw -= t.frequency.weight;
        }
        throw new Error('Trace draw did not resolve');
      });
      total++;
      const evaluated = evaluateComposition(candidate, catalog, assets);
      const fingerprint = specimenFingerprint(candidate, evaluated.composition);
      const codes = evaluated.rejections.map((r) => r.code);
      if (reserved.has(fingerprint)) codes.push('RESERVED_GRAIL_IDENTITY');
      if (seen.has(fingerprint)) codes.push('DUPLICATE_IDENTITY');
      const accepted = attempt === attempts;
      assert.equal(
        codes.length === 0,
        accepted,
        'Trace acceptance differs from engine',
      );
      for (const t of candidate) {
        const s = selections.get(t.id)!;
        s.drawn++;
        s[accepted ? 'accepted' : 'rejected']++;
      }
      const gold = candidate.some((t) => t.id === goldId);
      if (gold) {
        for (const [category, breakdown] of [
          ['expressions', goldByExpression],
          ['mutations', goldByMutation],
        ] as const) {
          const key = candidate
            .find((t) => t.category === category)!
            .id.slice(4);
          const row = (breakdown[key] ??= { drawn: 0, accepted: 0 });
          row.drawn++;
          if (accepted) row.accepted++;
        }
        if (!accepted) {
          const key = [...codes].sort(compareText).join('|');
          goldRejectSets[key] = (goldRejectSets[key] ?? 0) + 1;
          for (const code of codes)
            goldReasons[code] = (goldReasons[code] ?? 0) + 1;
        }
      }
      if (!accepted) {
        rejected++;
        for (const code of codes) reasons[code] = (reasons[code] ?? 0) + 1;
      } else {
        assert.deepEqual(
          candidate.map((t) => t.id).sort(compareText),
          specimen.traitIds,
        );
        assert.equal(fingerprint, specimen.fingerprint);
        assert.deepEqual(evaluated.composition, specimen.composition);
        for (const t of candidate) counts.set(t.id, counts.get(t.id)! + 1);
        ordinaryAccepted++;
        seen.add(fingerprint);
      }
    }
  }
  assert.equal(total, artifacts.summary.attemptStatistics.totalCandidates);
  assert.equal(
    rejected,
    artifacts.summary.attemptStatistics.rejectedCandidates,
  );
  assert.deepEqual(reasons, artifacts.summary.rejectionCounts);
  assert.deepEqual(
    Object.fromEntries(counts),
    artifacts.summary.ordinaryTraitFrequencies,
  );
  assert.equal(
    Object.values(goldRejectSets).reduce((a, b) => a + b, 0),
    selections.get(goldId)!.rejected,
  );
  return {
    totalCandidates: total,
    rejectedCandidates: rejected,
    ordinaryAccepted,
    gold: {
      ...selections.get(goldId)!,
      rejectionsByCodeOverlapping: goldReasons,
      disjointRejectionSets: goldRejectSets,
      byExpression: goldByExpression,
      byMutation: goldByMutation,
    },
    traitSelections: spec.traits.map((t) => ({
      id: t.id,
      ...selections.get(`dev-${t.id}`)!,
    })),
  };
}

function grouped(signatures: { key: string; index: number }[]) {
  const groups = new Map<string, number[]>();
  for (const { key, index } of signatures) {
    const members = groups.get(key) ?? [];
    members.push(index);
    groups.set(key, members);
  }
  const repeated = [...groups]
    .filter(([, members]) => members.length > 1)
    .sort(([a, x], [b, y]) => y.length - x.length || compareText(a, b));
  return {
    distinctSignatures: groups.size,
    repeatedGroups: repeated.length,
    specimensInRepeatedGroups: repeated.reduce((n, [, m]) => n + m.length, 0),
    pairsSharingSignature: repeated.reduce(
      (n, [, m]) => n + (m.length * (m.length - 1)) / 2,
      0,
    ),
    largestGroup: repeated[0]?.[1].length ?? 1,
    examples: repeated.slice(0, 6).map(([key, members]) => ({
      key,
      count: members.length,
      logicalIndices: members.slice(0, 12),
    })),
  };
}

export function adversarialAudit(
  spec: ProductionSpec,
  artifacts: EngineArtifacts,
) {
  const trace = auditCandidateTrace(spec, artifacts);
  const traits = new Map(spec.traits.map((t) => [t.id, t]));
  const selected = artifacts.logicalCollection.specimens.map((s) => ({
    index: s.index,
    traits: s.traitIds.map((id) => traits.get(id.slice(4))!),
  }));
  const signatures = (omitted: string[]) =>
    grouped(
      selected.map((s) => ({
        index: s.index,
        key: s.traits
          .filter((t) => !omitted.includes(t.category))
          .map((t) => t.id)
          .sort(compareText)
          .join('|'),
      })),
    );
  const coarse = grouped(
    selected.map((s) => {
      const byCategory = new Map(s.traits.map((t) => [t.category, t]));
      const accessory = byCategory.get('accessories')!;
      return {
        index: s.index,
        key: [
          byCategory.get('mutations')!.id,
          byCategory.get('wool')!.id.endsWith('-locks')
            ? 'rolled-wool'
            : 'clustered-curls',
          byCategory.get('expressions')!.id,
          byCategory.get('clothing')!.id,
          ...accessory.metadata
            .filter((a) =>
              ['Headwear', 'Eyewear', 'Equipment'].includes(a.trait_type),
            )
            .map((a) => `${a.trait_type}:${a.value}`),
        ].join('|'),
      };
    }),
  );
  const frequency = spec.traits.map((t) => {
    const observed =
      artifacts.summary.categoryFrequencies[t.category][`dev-${t.id}`]!;
    const drawn = trace.traitSelections.find((r) => r.id === t.id)!;
    return {
      ...drawn,
      category: t.category,
      proposedTotal: t.proposedTotalCount,
      rawDrawWeight: t.selectionWeight,
      policy: t.ordinaryDisabled
        ? 'RESERVED_ONLY'
        : spec.categories.find((c) => c.category === t.category)!
            .frequencyPolicy,
      observedTotal: observed,
      delta: observed - t.proposedTotalCount,
    };
  });
  const facetCooccurrence: Record<string, number> = {};
  const configurationSizes: Record<string, number> = {};
  for (const s of selected) {
    const facets = s.traits
      .find((t) => t.category === 'accessories')!
      .metadata.map((a) => a.trait_type)
      .sort(compareText);
    configurationSizes[String(facets.length)] =
      (configurationSizes[String(facets.length)] ?? 0) + 1;
    for (let i = 0; i < facets.length; i++)
      for (let j = i + 1; j < facets.length; j++) {
        const key = `${facets[i]} + ${facets[j]}`;
        facetCooccurrence[key] = (facetCooccurrence[key] ?? 0) + 1;
      }
  }
  const byMethod: Record<string, number> = {};
  for (const a of spec.assetRequirements)
    byMethod[a.method] = (byMethod[a.method] ?? 0) + 1;
  const variantParents = new Set(
    spec.variantRequirements.map((v) => v.assetRequirementId),
  );
  const byFamily: Record<string, number> = {};
  for (const v of spec.variantRequirements)
    byFamily[v.mutationTraitId] = (byFamily[v.mutationTraitId] ?? 0) + 1;
  const visibleSelectionsByFamily = Object.fromEntries(
    spec.traits
      .filter((t) => t.category === 'mutations')
      .map((m) => [
        m.id,
        Object.fromEntries(
          spec.categories
            .filter((c) =>
              [
                'wool',
                'eyes',
                'expressions',
                'clothing',
                'accessories',
              ].includes(c.category),
            )
            .map(({ category }) => [
              category,
              [
                ...new Set(
                  selected
                    .filter((s) => s.traits.some((t) => t.id === m.id))
                    .flatMap((s) =>
                      s.traits
                        .filter((t) => t.category === category)
                        .map((t) => t.id),
                    ),
                ),
              ].sort(compareText),
            ]),
        ),
      ]),
  );
  return {
    schemaVersion: 1,
    purpose: 'ADVERSARIAL_LOGICAL_REVIEW',
    productionApproved: false,
    artworkGenerated: false,
    specSha256: canonicalSha256(spec),
    logicalCollectionSha256: artifacts.summary.logicalCollectionSha256,
    supply: selected.length,
    uniqueLogicalFingerprints: artifacts.summary.uniqueFingerprints,
    frequency,
    trace,
    diversity: {
      caution:
        'Projections of logical selections, not image/perceptual duplicates or rarity scores. Omitted effects may be visually strong; unproduced assets prevent visual certification.',
      ignoringBackgroundAndPixel: signatures([
        'environments',
        'pixel_corruption',
      ]),
      alsoIgnoringEyeColor: signatures([
        'environments',
        'pixel_corruption',
        'eyes',
      ]),
      coarseSilhouetteRisk: coarse,
      coarseDefinition:
        'Retain family, expression, clothing, headwear/eyewear/equipment; map rolled wool separately from clustered curls. Omit wool color/material, eye color, minor jewelry/tag/dental, background and corruption. No claim of identical pixels.',
      configurationSizes,
      facetCooccurrence,
      visibleSelectionsByFamily,
    },
    assets: {
      templates: spec.assetRequirements.length,
      templatesByMethod: byMethod,
      variantBindings: spec.variantRequirements.length,
      variantParentTemplates: variantParents.size,
      variantBindingsByFamily: byFamily,
      expandedSourceBindings:
        spec.assetRequirements.length -
        variantParents.size +
        spec.variantRequirements.length,
      expandedSourceBindingsMeaning:
        'Replace parent templates with family bindings; this is a planning inventory, not unique PNGs, ImageGen calls or a usage estimate.',
      allMissing:
        spec.assetRequirements.every((a) => a.status === 'MISSING') &&
        spec.variantRequirements.every((v) => v.status === 'MISSING'),
    },
  };
}

export function auditSensitivity(spec: ProductionSpec) {
  return ['0150', '0151', '0152', '0153'].map((prefix) => {
    const seedHex = prefix.repeat(16);
    const inputs = simulationInputs(spec, seedHex);
    const result = generateCollection(inputs);
    if (!result.ok) return { seedHex, ok: false as const, error: result.error };
    assert(verifyCollection(inputs, result.artifacts).ok);
    return {
      seedHex,
      ok: true as const,
      generated: result.artifacts.summary.generatedSpecimens,
      unique: result.artifacts.summary.uniqueFingerprints,
      logicalCollectionSha256: result.artifacts.summary.logicalCollectionSha256,
      totalCandidates:
        result.artifacts.summary.attemptStatistics.totalCandidates,
      maxSpecimenAttempts:
        result.artifacts.summary.attemptStatistics.maxSpecimenAttempts,
      frequencies: result.artifacts.summary.categoryFrequencies,
    };
  });
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  const args = process.argv.slice(2);
  if (args[0] === '--sensitivity') {
    assert.equal(args.length, 2);
    const spec = productionSpecSchema.parse(
      JSON.parse(
        await readFile(
          new URL('../specs/lammb-traits-v1.json', import.meta.url),
          'utf8',
        ),
      ),
    );
    const result = {
      purpose: 'LOGICAL_SEED_SENSITIVITY_NOT_ARTWORK',
      specSha256: canonicalSha256(spec),
      seeds: auditSensitivity(spec),
    };
    await writeFile(args[1]!, `${JSON.stringify(result, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    console.log(
      JSON.stringify(
        result.seeds.map((s) => ({
          seedHex: s.seedHex,
          ok: s.ok,
          ...(s.ok
            ? {
                generated: s.generated,
                unique: s.unique,
                gold: s.frequencies.accessories[
                  'dev-lammb-accessories-gold-tooth'
                ],
              }
            : { error: s.error }),
        })),
      ),
    );
    process.exit(0);
  }
  const check = args[0] === '--check';
  const fromGit = args[0] === '--spec-from-git';
  assert(
    (check && args.length === 2) ||
      (fromGit && args.length === 3) ||
      (!check && !fromGit && args.length === 1),
    'Use <output.json>, --check <output.json>, or --spec-from-git <ref> <output.json>',
  );
  const source = fromGit
    ? execFileSync(
        'git',
        [
          'show',
          `${args[1]}:packages/art-generator/specs/lammb-traits-v1.json`,
        ],
        { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 },
      )
    : await readFile(
        new URL('../specs/lammb-traits-v1.json', import.meta.url),
        'utf8',
      );
  const spec = productionSpecSchema.parse(JSON.parse(source));
  const result = generateCollection(simulationInputs(spec));
  assert(result.ok, result.ok ? '' : result.error.message);
  const report = adversarialAudit(spec, result.artifacts);
  const output = args.at(-1)!;
  if (check)
    assert.equal(
      canonicalJson(JSON.parse(await readFile(output, 'utf8'))),
      canonicalJson(report),
      'Adversarial snapshot differs from reconstructed evidence',
    );
  else
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
  console.log(
    JSON.stringify({
      ok: true,
      output,
      specSha256: report.specSha256,
      logicalCollectionSha256: report.logicalCollectionSha256,
      gold: {
        drawn: report.trace.gold.drawn,
        rejected: report.trace.gold.rejected,
        accepted: report.trace.gold.accepted,
      },
      diversity: {
        backgroundPixelGroups:
          report.diversity.ignoringBackgroundAndPixel.distinctSignatures,
        coarseGroups: report.diversity.coarseSilhouetteRisk.distinctSignatures,
      },
      assets: report.assets,
    }),
  );
}
