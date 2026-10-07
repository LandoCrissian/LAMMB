import { logicalSpecimenSchema } from './engine-schema.ts';
import { planRequestSchema } from './art-schema.ts';
import { canonicalJson, canonicalSha256, compareText } from './canonical.ts';
import { evaluateComposition, specimenFingerprint } from './constraints.ts';
import { validateInputs } from './inputs.ts';
import { distinct, validateArt } from './art-inputs.ts';
import type { ArtManifest, PlanRequest } from './art-schema.ts';
import type { EngineInputs } from './engine.ts';

export type PlanInputs = EngineInputs & {
  approvals: unknown;
  planRequest: unknown;
};
type VisualAsset = ArtManifest['assets'][number];
export type CompositionPlan = {
  schemaVersion: 1;
  purpose: PlanRequest['purpose'];
  logicalSpecimenFingerprint: string;
  logicalSpecimenSha256: string;
  assetManifestSha256: string;
  approvalManifestSha256: string;
  planRequestSha256: string;
  renderer: PlanRequest['renderer'];
  canvas: PlanRequest['canvas'];
  referenceFrame: string;
  output: PlanRequest['output'];
  grailId: string | null;
  pixelCorruption: {
    level: string;
    mode: 'SOURCE_EFFECTS' | 'CURATED_SOURCE';
    instructionSha256: string;
  };
  logicalSources: { id: string; sha256: string }[];
  operations: {
    asset: {
      id: string;
      sha256: string;
      mediaType: VisualAsset['mediaType'];
      dimensions: VisualAsset['dimensions'];
      alpha: VisualAsset['alpha'];
      colorProfile: VisualAsset['colorProfile'];
    };
    composition: VisualAsset['composition'];
    modifierTraitIds: string[];
    corruption: null | {
      algorithm: 'source-effect-instruction/1';
      level: string;
      instructionSha256: string;
    };
  }[];
};

// Caller supplies logical evidence. Renderer sees this fully resolved plan only.
export function deriveCompositionPlan(
  inputs: PlanInputs,
  specimenInput: unknown,
): CompositionPlan {
  const {
    catalog,
    manifest,
    request: constructionRequest,
  } = validateInputs(
    inputs.catalog,
    inputs.manifest,
    inputs.request,
    inputs.assetBytes,
    inputs.approvals,
  );
  if (manifest.schemaVersion !== 2)
    throw new Error('Composition requires V2 visual manifest');
  const { approvals } = validateArt(
    manifest,
    inputs.approvals,
    inputs.assetBytes,
  );
  const request = planRequestSchema.parse(inputs.planRequest);
  if (request.purpose !== catalog.purpose)
    throw new Error('Plan environment mismatch');
  distinct(
    request.grailCompositions.map((g) => g.grailId),
    'grail composition',
  );
  const grailIds = new Set(catalog.grails.map((g) => g.id));
  for (const grail of request.grailCompositions) {
    if (!grailIds.has(grail.grailId)) throw new Error('Unknown special grail');
    distinct(grail.assetIds, 'special grail source');
    grail.assetIds.sort(compareText);
  }
  request.grailCompositions.sort((a, b) => compareText(a.grailId, b.grailId));
  const specimen = logicalSpecimenSchema.parse(specimenInput);
  if (specimen.index >= constructionRequest.outputCount)
    throw new Error('Specimen outside construction request');
  distinct(specimen.traitIds, 'specimen trait');
  distinct(
    specimen.composition.map((n) => n.category),
    'composition category',
  );
  const traits = specimen.traitIds.map((id) => {
    const trait = catalog.traits.find((t) => t.id === id);
    if (!trait) throw new Error('Unresolved specimen trait');
    return trait;
  });
  if (
    traits.length !== catalog.categories.length ||
    new Set(traits.map((t) => t.category)).size !== catalog.categories.length
  )
    throw new Error('Incomplete logical specimen');
  const assetMap = new Map(manifest.assets.map((a) => [a.id, a]));
  const evaluated = evaluateComposition(traits, catalog, assetMap);
  const normalizedComposition = specimen.composition
    .map((node) => ({
      ...node,
      assetIds: [...node.assetIds].sort(compareText),
      modifierTraitIds: [...node.modifierTraitIds].sort(compareText),
    }))
    .sort((a, b) => compareText(a.category, b.category));
  if (
    evaluated.rejections.length ||
    canonicalJson(normalizedComposition) !==
      canonicalJson(evaluated.composition) ||
    specimen.fingerprint !==
      specimenFingerprint(traits, evaluated.composition) ||
    specimen.corruptionLevel !==
      traits.find((t) => t.corruption)!.corruption!.level
  )
    throw new Error('Logical specimen validation failed');
  const reservation = catalog.grails
    .flatMap((g) => g.reservations.map((r) => ({ ...r, grailId: g.id })))
    .find((r) => r.index === specimen.index);
  if (
    (reservation?.grailId ?? null) !== specimen.grailId ||
    (reservation &&
      canonicalJson([...reservation.traitIds].sort(compareText)) !==
        canonicalJson([...specimen.traitIds].sort(compareText)))
  )
    throw new Error('Grail reservation mismatch');
  const frame = manifest.referenceFrames.find(
    (f) => f.id === request.referenceFrame,
  );
  if (
    !frame ||
    canonicalJson(frame.dimensions) !== canonicalJson(request.canvas)
  )
    throw new Error('Canvas/reference frame dimensions incompatible');
  if (request.canvas.width !== request.canvas.height)
    throw new Error('PFP composition requires square canvas');
  const logicalIds = [
    ...new Set(evaluated.composition.flatMap((n) => n.assetIds)),
  ].sort(compareText);
  const special = request.grailCompositions.find(
    (g) => g.grailId === specimen.grailId,
  );
  const operationIds = special?.assetIds ?? logicalIds;
  for (const grail of request.grailCompositions)
    for (const id of grail.assetIds)
      if (!assetMap.has(id)) throw new Error('Unresolved special grail asset');
  const selectedAssets = [...new Set([...logicalIds, ...operationIds])].map(
    (id) => assetMap.get(id)!,
  );
  const tags = new Set([
    ...traits.flatMap((t) => t.tags),
    ...selectedAssets.flatMap((a) => a.compatibilityTags),
  ]);
  for (const asset of selectedAssets) {
    if (asset.composition.referenceFrame !== request.referenceFrame)
      throw new Error('Incompatible reference frame');
    if (asset.requiresTags.some((tag) => !tags.has(tag)))
      throw new Error('Incompatible anatomy/pose tags');
    if (
      asset.rendererRequirements.length &&
      !asset.rendererRequirements.some(
        (r) => canonicalJson(r) === canonicalJson(request.renderer),
      )
    )
      throw new Error('Renderer requirements unmet');
    if (request.purpose === 'PRODUCTION' && asset.state !== 'APPROVED')
      throw new Error('Unapproved visual source');
  }
  const ordered = operationIds
    .map((id) => assetMap.get(id)!)
    .sort((a, b) => a.composition.order - b.composition.order);
  distinct(
    ordered.map((a) => String(a.composition.order)),
    'ambiguous z-order',
  );
  distinct(
    ordered.map((a) => a.composition.slot),
    'unresolved composition slot',
  );
  const logicalSources = logicalIds.map((id) => ({
    id,
    sha256: assetMap.get(id)!.sha256,
  }));
  const logical = {
    ...specimen,
    traitIds: [...specimen.traitIds].sort(compareText),
    composition: normalizedComposition,
  };
  return {
    schemaVersion: 1,
    purpose: request.purpose,
    logicalSpecimenFingerprint: specimen.fingerprint,
    logicalSpecimenSha256: canonicalSha256(logical),
    assetManifestSha256: canonicalSha256(manifest),
    approvalManifestSha256: canonicalSha256(approvals),
    planRequestSha256: canonicalSha256(request),
    renderer: request.renderer,
    canvas: request.canvas,
    referenceFrame: request.referenceFrame,
    output: request.output,
    grailId: specimen.grailId,
    pixelCorruption: {
      level: specimen.corruptionLevel,
      mode: special ? 'CURATED_SOURCE' : 'SOURCE_EFFECTS',
      instructionSha256: canonicalSha256({
        fingerprint: specimen.fingerprint,
        level: specimen.corruptionLevel,
        sources: ordered
          .filter((a) => a.category === 'pixel_corruption' || special)
          .map((a) => ({ id: a.id, sha256: a.sha256 })),
      }),
    },
    logicalSources,
    operations: ordered.map((asset) => ({
      asset: {
        id: asset.id,
        sha256: asset.sha256,
        mediaType: asset.mediaType,
        dimensions: asset.dimensions,
        alpha: asset.alpha,
        colorProfile: asset.colorProfile,
      },
      composition: asset.composition,
      modifierTraitIds:
        evaluated.composition.find((n) => n.assetIds.includes(asset.id))
          ?.modifierTraitIds ?? [],
      // Source-bound instructions only: future renderer implements versioned pixel semantics.
      corruption:
        asset.composition.role === 'EFFECT' &&
        asset.category === 'pixel_corruption'
          ? {
              algorithm: 'source-effect-instruction/1',
              level: specimen.corruptionLevel,
              instructionSha256: canonicalSha256({
                fingerprint: specimen.fingerprint,
                level: specimen.corruptionLevel,
                source: asset.sha256,
              }),
            }
          : null,
    })),
  };
}
