import { canonicalJson, canonicalSha256, sha256Bytes } from './canonical.ts';
import type { CompositionPlan, PlanInputs } from './composition.ts';
import { deriveCompositionPlan } from './composition.ts';
import type { PlanRequest } from './art-schema.ts';

// Versioned interface has no PRNG, clock, network, path or trait catalog input.
export interface Renderer {
  readonly descriptor: PlanRequest['renderer'];
  readonly purpose: 'DEVELOPMENT_ONLY' | 'PRODUCTION';
  render(
    plan: CompositionPlan,
    sources: ReadonlyMap<string, Uint8Array>,
  ): Uint8Array;
}
export const fixtureRenderer: Renderer = Object.freeze({
  descriptor: Object.freeze({ id: 'dev-text-renderer', version: '1.0.0' }),
  purpose: 'DEVELOPMENT_ONLY',
  render(plan: CompositionPlan, sources: ReadonlyMap<string, Uint8Array>) {
    if (
      plan.purpose !== 'DEVELOPMENT_ONLY' ||
      plan.output.mediaType !== 'text/plain' ||
      canonicalJson(plan.renderer) !== canonicalJson(this.descriptor)
    )
      throw new Error(
        'Fixture renderer cannot render production or unknown version',
      );
    for (const source of [
      ...plan.logicalSources,
      ...plan.operations.map((o) => o.asset),
    ]) {
      const bytes = sources.get(source.id);
      if (!bytes || sha256Bytes(bytes) !== source.sha256)
        throw new Error('Renderer source hash mismatch');
    }
    // This text is a render transcript, never an NFT image or pixel reproduction.
    return new TextEncoder().encode(
      canonicalJson({
        representation: 'DEVELOPMENT_ONLY_RENDER_TRANSCRIPT/1',
        renderer: this.descriptor,
        plan,
      }),
    );
  },
});

export function renderWith(
  renderer: Renderer,
  plan: CompositionPlan,
  sources: ReadonlyMap<string, Uint8Array>,
) {
  if (
    renderer.purpose !== plan.purpose ||
    canonicalJson(renderer.descriptor) !== canonicalJson(plan.renderer)
  )
    throw new Error('Renderer identity/environment mismatch');
  for (const source of [
    ...plan.logicalSources,
    ...plan.operations.map((o) => o.asset),
  ]) {
    const bytes = sources.get(source.id);
    if (!bytes || sha256Bytes(bytes) !== source.sha256)
      throw new Error('Renderer source hash mismatch');
  }
  const original = canonicalJson(plan);
  const output = renderer.render(plan, sources);
  for (const source of [
    ...plan.logicalSources,
    ...plan.operations.map((o) => o.asset),
  ]) {
    const bytes = sources.get(source.id);
    if (!bytes || sha256Bytes(bytes) !== source.sha256)
      throw new Error('Renderer mutated source bytes');
  }
  if (output.length > 64 * 1024 * 1024)
    throw new Error('Render output byte budget exceeded');
  if (canonicalJson(plan) !== original)
    throw new Error('Renderer mutated composition plan');
  return output;
}
export function createRenderBundle(
  inputs: PlanInputs,
  specimen: unknown,
  renderer: Renderer = fixtureRenderer,
) {
  const plan = deriveCompositionPlan(inputs, specimen);
  if (plan.output.mediaType !== 'text/plain')
    throw new Error('Task 004 bundle supports text fixtures only');
  const outputBytes = renderWith(renderer, plan, inputs.assetBytes);
  const renderedOutputSha256 = sha256Bytes(outputBytes);
  const metadata = {
    schemaVersion: 1,
    purpose: plan.purpose,
    logicalSpecimenFingerprint: plan.logicalSpecimenFingerprint,
    compositionPlanSha256: canonicalSha256(plan),
    imageReference: `urn:lammb:render:sha256:${renderedOutputSha256}`,
    imageSha256: renderedOutputSha256,
    mediaType: plan.output.mediaType,
  };
  const provenance = {
    schemaVersion: 1,
    purpose: plan.purpose,
    logicalSpecimenFingerprint: plan.logicalSpecimenFingerprint,
    logicalSpecimenSha256: plan.logicalSpecimenSha256,
    compositionPlanSha256: canonicalSha256(plan),
    renderer: plan.renderer,
    logicalSources: plan.logicalSources,
    orderedSources: plan.operations.map((o) => ({
      id: o.asset.id,
      sha256: o.asset.sha256,
    })),
    renderedOutputSha256,
    publicMetadataSha256: canonicalSha256(metadata),
  };
  return {
    plan,
    metadata,
    provenance,
    outputText: new TextDecoder('utf-8', {
      fatal: true,
      ignoreBOM: true,
    }).decode(outputBytes),
  };
}

// Reconstruct from independent evidence. Compare entire bundle, not supplied hashes.
export function verifyRenderBundle(
  inputs: PlanInputs,
  specimen: unknown,
  bundle: unknown,
  renderer: Renderer = fixtureRenderer,
) {
  try {
    const expected = createRenderBundle(inputs, specimen, renderer);
    if (canonicalJson(expected) !== canonicalJson(bundle))
      throw new Error('Render/metadata/provenance mismatch');
    return {
      ok: true as const,
      renderedOutputSha256: expected.provenance.renderedOutputSha256,
    };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : 'Invalid render bundle',
    };
  }
}
