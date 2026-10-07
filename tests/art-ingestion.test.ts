import {
  evaluateComposition,
  specimenFingerprint,
} from '../packages/art-generator/src/constraints.ts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import manifestData from '../packages/art-generator/fixtures/art-assets-v2.json';
import approvalData from '../packages/art-generator/fixtures/art-approvals.json';
import planData from '../packages/art-generator/fixtures/art-plan-request.json';
import catalogData from '../packages/art-generator/fixtures/stress-catalog.json';
import requestData from '../packages/art-generator/fixtures/stress-request.json';
import legacyData from '../packages/art-generator/fixtures/stress-assets.json';
import {
  artManifestSchema,
  approvalManifestSchema,
  planRequestSchema,
} from '../packages/art-generator/src/art-schema.ts';
import { engineCatalogSchema } from '../packages/art-generator/src/engine-schema.ts';
import { validateArt } from '../packages/art-generator/src/art-inputs.ts';
import {
  canonicalSha256,
  sha256Bytes,
} from '../packages/art-generator/src/canonical.ts';
import { deriveCompositionPlan } from '../packages/art-generator/src/composition.ts';
import {
  createRenderBundle,
  fixtureRenderer,
  renderWith,
  verifyRenderBundle,
} from '../packages/art-generator/src/renderer.ts';
import { artReadiness } from '../packages/art-generator/src/readiness.ts';
import { generateCollection } from '../packages/art-generator/src/engine.ts';
import { REPOSITORY_ROOT } from '../packages/art-generator/src/io.ts';

function data() {
  const manifest = artManifestSchema.parse(structuredClone(manifestData));
  const approvals = approvalManifestSchema.parse(structuredClone(approvalData));
  const planRequest = planRequestSchema.parse(structuredClone(planData));
  const catalog = engineCatalogSchema.parse(structuredClone(catalogData));
  const assetBytes = new Map(
    manifest.assets.map((a) => [
      a.id,
      readFileSync(
        join(REPOSITORY_ROOT, 'packages/art-generator/fixtures/assets', a.path),
      ),
    ]),
  );
  return {
    manifest,
    approvals,
    planRequest,
    catalog,
    request: structuredClone(requestData),
    assetBytes,
  };
}
const baseline = data();
const generated = generateCollection({ ...baseline, manifest: legacyData });
if (!generated.ok) throw new Error('Existing logical fixture failed');
const specimens = generated.artifacts.logicalCollection.specimens;
const specimen = specimens[0]!;
// No image bytes created: this exercises declaration gates, not PNG verification.
function productionDeclarations() {
  const d = data();
  d.manifest.purpose = 'PRODUCTION';
  d.approvals.purpose = 'PRODUCTION';
  for (const a of d.manifest.assets) {
    const oldId = a.id;
    a.id = a.id.replace('dev-', 'approved-');
    a.path = a.path.replace('.txt', '.png');
    a.purpose = 'PRODUCTION';
    a.mediaType = 'image/png';
    a.colorProfile = 'SRGB';
    d.assetBytes.set(a.id, d.assetBytes.get(oldId)!);
    d.assetBytes.delete(oldId);
    d.approvals.records.find((r) => r.assetId === oldId)!.assetId = a.id;
  }
  return d;
}
const ingest = (d: ReturnType<typeof data>) =>
  validateArt(d.manifest, d.approvals, d.assetBytes);
const plan = (d = data(), s: unknown = specimen) => deriveCompositionPlan(d, s);

describe('digest-bound art ingestion', () => {
  it('accepts approved local declarations and labels unverified image properties', () => {
    expect(ingest(productionDeclarations()).manifest.purpose).toBe(
      'PRODUCTION',
    );
    expect(ingest(data()).declarationOnly).toContain('alpha');
  });
  it.each(['DRAFT', 'REVIEW', 'RETIRED'] as const)(
    'rejects production %s',
    (state) => {
      const d = productionDeclarations();
      d.manifest.assets[0]!.state = state;
      d.approvals.records[0]!.state = state;
      expect(() => ingest(d)).toThrow();
    },
  );
  it('requires approval records even for self-declared APPROVED assets', () => {
    const d = productionDeclarations();
    d.approvals.records = [];
    expect(() => ingest(d)).toThrow(/APPROVED/);
  });
  it('changed bytes with a refreshed asset digest invalidate prior approval', () => {
    const d = data();
    const a = d.manifest.assets[0]!;
    const bytes = Buffer.from('changed source');
    d.assetBytes.set(a.id, bytes);
    a.sha256 = sha256Bytes(bytes);
    expect(() => ingest(d)).toThrow(/invalidate approval/);
  });
  it('rejects asset SHA mismatch', () => {
    const d = data();
    d.manifest.assets[0]!.sha256 = '0'.repeat(64);
    expect(() => ingest(d)).toThrow(/SHA mismatch/);
  });
  it('rejects duplicate asset ID', () => {
    const d = data();
    d.manifest.assets[1]!.id = d.manifest.assets[0]!.id;
    expect(() => ingest(d)).toThrow(/Duplicate asset ID/);
  });
  it('rejects duplicate portable path', () => {
    const d = data();
    d.manifest.assets[1]!.path = d.manifest.assets[0]!.path.toUpperCase();
    expect(() => ingest(d)).toThrow(/Duplicate asset path/);
  });
  it.each([
    '../escape.png',
    '/absolute.png',
    'C:/absolute.png',
    'a\\b.png',
    'https://example.test/a.png',
    'file:///a.png',
    'CON.png',
    'a/../b.png',
  ])('rejects unsafe/remote source %s', (path) => {
    const d = data();
    d.manifest.assets[0]!.path = path;
    expect(() => ingest(d)).toThrow();
  });
  it('rejects unexplained dimension mismatch and implicit scale', () => {
    const d = data();
    d.manifest.assets[0]!.dimensions.width = 32;
    expect(() => ingest(d)).toThrow(/dimensions/);
  });
  it('accepts explicit scaling only when target fits the reference frame', () => {
    const d = data();
    const a = d.manifest.assets[0]!;
    a.dimensions = { width: 32, height: 32 };
    a.composition.placement.scaling = {
      mode: 'EXPLICIT',
      target: { width: 64, height: 64 },
      sampling: 'NEAREST',
    };
    expect(ingest(d)).toBeDefined();
    expect(
      plan(d).operations.find((o) => o.asset.id === a.id)!.composition.placement
        .scaling.mode,
    ).toBe('EXPLICIT');
    a.composition.placement.scaling.target.width = 65;
    expect(() => ingest(d)).toThrow();
  });
  it('accepts explicit positioned assets and rejects cropping', () => {
    const d = data();
    const a = d.manifest.assets[0]!;
    a.dimensions = { width: 16, height: 16 };
    a.composition.placement.mode = 'POSITIONED';
    a.composition.placement.x = 10;
    expect(ingest(d)).toBeDefined();
    a.composition.placement.x = 60;
    expect(() => ingest(d)).toThrow(/crop/);
  });
  it('rejects alpha declaration incompatible with required transparency', () => {
    const d = data();
    d.manifest.assets[0]!.alpha = { capability: 'NONE', policy: 'REQUIRED' };
    expect(() => ingest(d)).toThrow(/Transparency/);
  });
  it('rejects unknown roles, frames, media and untracked profile', () => {
    for (const update of [
      {
        composition: {
          ...data().manifest.assets[0]!.composition,
          role: 'UNKNOWN',
        },
      },
      { mediaType: 'image/jpeg' },
      { colorProfile: 'DISPLAY_P3' },
    ]) {
      const d = data();
      Object.assign(d.manifest.assets[0]!, update);
      expect(() => ingest(d)).toThrow();
    }
    const d = data();
    d.manifest.assets[0]!.composition.referenceFrame = 'dev-unknown';
    expect(() => ingest(d)).toThrow(/reference frame/);
  });
  it('rejects bounded file budget overflow', () => {
    const d = data();
    const a = d.manifest.assets[0]!;
    const b = Buffer.alloc(1024 * 1024 + 1);
    d.assetBytes.set(a.id, b);
    a.sha256 = sha256Bytes(b);
    d.approvals.records.find((r) => r.assetId === a.id)!.sha256 = a.sha256;
    expect(() => ingest(d)).toThrow(/budget/);
  });
  it('development fixture cannot masquerade as production', () => {
    const d = data();
    d.manifest.purpose = 'PRODUCTION';
    d.approvals.purpose = 'PRODUCTION';
    for (const a of d.manifest.assets) a.purpose = 'PRODUCTION';
    expect(() => ingest(d)).toThrow(/Development fixture/);
  });
  it('production constructor rejects legacy unapproved manifests', () => {
    const d = data();
    d.catalog.purpose = 'PRODUCTION';
    const manifest = structuredClone(legacyData);
    manifest.purpose = 'PRODUCTION';
    expect(generateCollection({ ...d, manifest }).ok).toBe(false);
  });
});

describe('explicit composition planning', () => {
  it('is deterministic across repeated derivation and input set/object ordering', () => {
    const first = plan();
    const d = data();
    d.manifest.assets.reverse();
    d.manifest.referenceFrames.reverse();
    d.approvals.records.reverse();
    d.catalog.traits.reverse();
    d.catalog.rules.reverse();
    d.catalog.grails.reverse();
    const reversed = structuredClone(specimen);
    reversed.traitIds.reverse();
    reversed.composition.reverse();
    for (const n of reversed.composition) {
      n.assetIds.reverse();
      n.modifierTraitIds.reverse();
    }
    expect(plan(d, reversed)).toEqual(first);
    expect(plan()).toEqual(first);
  });
  it('rejects incompatible reference frames and anatomy requirements', () => {
    const d = data();
    d.manifest.referenceFrames.push({
      id: 'dev-other-frame',
      dimensions: { width: 64, height: 64 },
    });
    d.manifest.assets[0]!.composition.referenceFrame = 'dev-other-frame';
    expect(() => plan(d)).toThrow(/Incompatible reference frame/);
    const e = data();
    e.manifest.assets[0]!.requiresTags = ['dev-nonexistent-anatomy'];
    expect(() => plan(e)).toThrow(/anatomy/);
  });
  it('rejects ambiguous z-order and duplicate slots', () => {
    const d = data();
    const ids = specimen.composition.flatMap((n) => n.assetIds);
    const a = d.manifest.assets.find((a) => a.id === ids[0])!;
    const b = d.manifest.assets.find((a) => a.id === ids[1])!;
    b.composition.order = a.composition.order;
    expect(() => plan(d)).toThrow(/z-order/);
    b.composition.order = a.composition.order + 500;
    b.composition.slot = a.composition.slot;
    expect(() => plan(d)).toThrow(/slot/);
  });
  it('structural mutation replacement and modifier are resolved upstream', () => {
    const s = specimens.find((s) =>
      s.composition.some((n) => n.modifierTraitIds.includes('dev-mutation-b')),
    )!;
    const p = plan(data(), s);
    expect(
      p.operations.some(
        (o) =>
          o.asset.id === 'dev-asset-mutation-wool' &&
          o.modifierTraitIds.includes('dev-mutation-b'),
      ),
    ).toBe(true);
    expect(p.operations.some((o) => o.asset.id === 'dev-asset-wool')).toBe(
      false,
    );
  });
  it('scene replacement supports multiple composition layers', () => {
    const d = data();
    const original = specimens.find((s) =>
      s.composition.every((n) => !n.modifierTraitIds.length),
    )!;
    const environment = d.catalog.traits.find(
      (t) =>
        t.id ===
        original.composition.find((n) => n.category === 'environments')!
          .traitId,
    )!;
    const constraints = (['base_anatomy', 'wool'] as const).map((category) => {
      const node = original.composition.find((n) => n.category === category)!;
      const replacement = structuredClone(
        d.manifest.assets.find((a) => a.id === node.assetIds[0])!,
      );
      replacement.id = `dev-scene-${category}`;
      replacement.path = `dev-scene-${category}.txt`;
      d.manifest.assets.push(replacement);
      d.assetBytes.set(replacement.id, d.assetBytes.get(node.assetIds[0]!)!);
      d.approvals.records.push({
        assetId: replacement.id,
        sha256: replacement.sha256,
        state: 'APPROVED',
        reviewReference: 'dev-scene-review',
      });
      return {
        category,
        allowedTraitIds: [node.traitId],
        replacementAssetIds: [replacement.id],
      };
    });
    environment.scene = {
      compositionReference: 'dev-reference-frame',
      constraints,
    };
    const traits = original.traitIds.map((id) =>
      d.catalog.traits.find((t) => t.id === id)!,
    );
    const evaluated = evaluateComposition(
      traits,
      d.catalog,
      new Map(d.manifest.assets.map((a) => [a.id, a])),
    );
    expect(evaluated.rejections).toEqual([]);
    const s = {
      ...original,
      composition: evaluated.composition,
      fingerprint: specimenFingerprint(traits, evaluated.composition),
    };
    const p = plan(d, s);
    expect(
      p.operations.filter((o) => o.asset.id.startsWith('dev-scene-')),
    ).toHaveLength(2);
    expect(
      p.operations.filter((o) => o.modifierTraitIds.includes(environment.id)),
    ).toHaveLength(2);
  });
  it('pixel corruption instructions are deterministic and source-bound for all levels', () => {
    for (const level of [
      'NONE',
      'TOUCH',
      'BLEED',
      'FRACTURE',
      'GLITCHED',
      'REALITY_FAILURE',
    ]) {
      const s = specimens.find((s) => s.corruptionLevel === level)!;
      const p = plan(data(), s);
      const effect = p.operations.find((o) => o.corruption)!;
      expect(effect.corruption?.level).toBe(level);
      expect(plan(data(), s)).toEqual(p);
    }
  });
  it('rejects forged logical fingerprint, composition and grail ID', () => {
    for (const update of [
      { fingerprint: '0'.repeat(64) },
      { grailId: 'dev-fake-grail' },
      { corruptionLevel: 'NONE' },
    ]) {
      const s = { ...specimen, ...update };
      if (
        s.corruptionLevel === specimen.corruptionLevel &&
        Object.keys(update)[0] === 'corruptionLevel'
      )
        continue;
      expect(() => plan(data(), s)).toThrow();
    }
    const s = structuredClone(specimen);
    s.composition[0]!.assetIds = ['dev-asset-wool'];
    expect(() => plan(data(), s)).toThrow();
  });
  it('special curated grail still uses approved hash-bound sources', () => {
    const d = data();
    const s = specimens.find((s) => s.grailId)!;
    d.planRequest.grailCompositions = [
      { grailId: s.grailId!, assetIds: ['dev-asset-environment'] },
    ];
    const p = plan(d, s);
    expect(p.operations).toHaveLength(1);
    expect(p.operations[0]!.asset.sha256).toBe(
      d.manifest.assets.find((a) => a.id === 'dev-asset-environment')!.sha256,
    );
    d.assetBytes.set('dev-asset-environment', Buffer.from('changed'));
    expect(() => plan(d, s)).toThrow(/SHA/);
  });
});

describe('renderer and provenance boundary', () => {
  it('fixture render is deterministic and renderer receives only plan/source bytes', () => {
    const d = data();
    const bundle = createRenderBundle(d, specimen);
    expect(createRenderBundle(data(), specimen)).toEqual(bundle);
    const observed: unknown[][] = [];
    const renderer = {
      ...fixtureRenderer,
      render(...args: Parameters<typeof fixtureRenderer.render>) {
        observed.push(args);
        return fixtureRenderer.render(...args);
      },
    };
    renderWith(renderer, bundle.plan, d.assetBytes);
    expect(observed[0]).toHaveLength(2);
    expect(observed[0]![0]).toBe(bundle.plan);
    expect(Object.keys(bundle.plan)).not.toContain('seedHex');
    const source = readFileSync(
      join(REPOSITORY_ROOT, 'packages/art-generator/src/renderer.ts'),
      'utf8',
    );
    expect(source).not.toMatch(
      /Math\.random|randomBytes|constructionPrng|Date\.now/,
    );
  });
  it('changed placement/ordering changes plan digest and render hash', () => {
    const d = data();
    const first = createRenderBundle(d, specimen);
    const a = d.manifest.assets[0]!;
    a.composition.placement.mode = 'POSITIONED';
    a.dimensions = { width: 32, height: 32 };
    a.composition.placement.x = 1;
    const second = createRenderBundle(d, specimen);
    expect(second.provenance.compositionPlanSha256).not.toBe(
      first.provenance.compositionPlanSha256,
    );
    expect(second.provenance.renderedOutputSha256).not.toBe(
      first.provenance.renderedOutputSha256,
    );
    a.composition.order += 1000;
    expect(canonicalSha256(plan(d))).not.toBe(canonicalSha256(second.plan));
  });
  it('renderer version changes provenance and mismatched versions fail', () => {
    const d = data();
    const original = createRenderBundle(d, specimen);
    d.planRequest.renderer.version = '1.0.1';
    for (const a of d.manifest.assets)
      a.rendererRequirements = [d.planRequest.renderer];
    expect(() => createRenderBundle(d, specimen)).toThrow(/version|identity/);
    const renderer = { ...fixtureRenderer, descriptor: d.planRequest.renderer };
    const changed = createRenderBundle(d, specimen, renderer);
    expect(changed.provenance.renderer.version).toBe('1.0.1');
    expect(changed.provenance.compositionPlanSha256).not.toBe(
      original.provenance.compositionPlanSha256,
    );
  });
  it('approved changed source changes provenance', () => {
    const d = data();
    const original = createRenderBundle(d, specimen);
    const a = d.manifest.assets[0]!;
    const b = Buffer.from('new reviewed bytes');
    a.sha256 = sha256Bytes(b);
    d.assetBytes.set(a.id, b);
    d.approvals.records.find((r) => r.assetId === a.id)!.sha256 = a.sha256;
    expect(createRenderBundle(d, specimen).provenance).not.toEqual(
      original.provenance,
    );
  });
  it('changed render output, metadata/image link, plan and provenance fail verification', () => {
    const d = data();
    const original = createRenderBundle(d, specimen);
    expect(verifyRenderBundle(d, specimen, original).ok).toBe(true);
    const output = structuredClone(original);
    output.outputText += 'changed';
    expect(verifyRenderBundle(d, specimen, output).ok).toBe(false);
    const metadata = structuredClone(original);
    metadata.metadata.imageSha256 = '0'.repeat(64);
    metadata.metadata.imageReference = `urn:lammb:render:sha256:${metadata.metadata.imageSha256}`;
    metadata.provenance.publicMetadataSha256 = canonicalSha256(
      metadata.metadata,
    );
    expect(verifyRenderBundle(d, specimen, metadata).ok).toBe(false);
    const changed = structuredClone(original);
    changed.plan.renderer.version = '9.0.0';
    changed.provenance.compositionPlanSha256 = canonicalSha256(changed.plan);
    expect(verifyRenderBundle(d, specimen, changed).ok).toBe(false);
  });
  it('fixture renderer cannot be used for production', () => {
    const d = data();
    const p = plan(d);
    p.purpose = 'PRODUCTION';
    expect(() => renderWith(fixtureRenderer, p, d.assetBytes)).toThrow();
  });
  it('renderer rechecks source hashes and rejects mutation of plan', () => {
    const d = data();
    const p = plan(d);
    d.assetBytes.clear();
    expect(() => renderWith(fixtureRenderer, p, d.assetBytes)).toThrow(/hash/);
    const e = data();
    const renderer = {
      ...fixtureRenderer,
      render(p: Parameters<typeof fixtureRenderer.render>[0]) {
        p.canvas.width++;
        return new Uint8Array();
      },
    };
    expect(() => renderWith(renderer, plan(e), e.assetBytes)).toThrow(
      /mutated/,
    );
  });
});

describe('100 real art readiness', () => {
  it('checks all 100 development logical plans without claiming real art readiness', () => {
    const report = artReadiness(data(), specimens);
    expect(report.ok).toBe(true);
    expect(report.plannedSpecimens).toBe(100);
    expect(report.productionReady100).toBe(false);
    expect(report.declarativeProductionReady100).toBe(false);
  });
  it('fails closed on missing source bytes and empty specimens', () => {
    const d = data();
    d.assetBytes.delete(d.manifest.assets[0]!.id);
    expect(artReadiness(d, specimens).ok).toBe(false);
    expect(artReadiness(data(), []).ok).toBe(false);
  });
  it('identifies orphan assets including structural and special grail reference checks', () => {
    const d = data();
    const a = structuredClone(d.manifest.assets[0]!);
    a.id = 'dev-orphan';
    a.path = 'dev-orphan.txt';
    d.manifest.assets.push(a);
    d.assetBytes.set(a.id, d.assetBytes.get(d.manifest.assets[0]!.id)!);
    d.approvals.records.push({
      assetId: a.id,
      sha256: a.sha256,
      state: 'APPROVED',
      reviewReference: 'dev-orphan-review',
    });
    const report = artReadiness(d, specimens);
    expect(report.ok).toBe(false);
    expect(report.orphanAssetIds).toEqual(['dev-orphan']);
  });
  it('needs no network/blockchain adapters for the complete plan/render/verify flow', () => {
    const d = data();
    const bundle = createRenderBundle(d, specimen);
    expect(verifyRenderBundle(d, specimen, bundle).ok).toBe(true);
    expect(artReadiness(d, specimens).ok).toBe(true);
  });
});
