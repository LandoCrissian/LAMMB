import { collection } from '@lammb/collection/config';
import { logicalSpecimenSchema } from './engine-schema.ts';
import { deriveCompositionPlan } from './composition.ts';
import type { PlanInputs } from './composition.ts';
import { validateArt } from './art-inputs.ts';
import { validateInputs } from './inputs.ts';
import { planRequestSchema } from './art-schema.ts';
import { compareText } from './canonical.ts';

export function artReadiness(inputs: PlanInputs, specimenInputs: unknown[]) {
  const issues: { code: string; message: string; index: number | null }[] = [];
  let orphans: string[] = [];
  let planned = 0;
  try {
    const { manifest } = validateArt(
      inputs.manifest,
      inputs.approvals,
      inputs.assetBytes,
    );
    const { catalog } = validateInputs(
      inputs.catalog,
      manifest,
      inputs.request,
      inputs.assetBytes,
      inputs.approvals,
    );
    const request = planRequestSchema.parse(inputs.planRequest);
    const referenced = new Set([
      ...catalog.traits.flatMap((t) => [
        ...t.assetIds,
        ...(t.mutation?.categoryEffects.flatMap(
          (e) => e.replacementAssetIds ?? [],
        ) ?? []),
        ...(t.scene?.constraints.flatMap((e) => e.replacementAssetIds ?? []) ??
          []),
      ]),
      ...request.grailCompositions.flatMap((g) => g.assetIds),
    ]);
    orphans = manifest.assets
      .filter((a) => !referenced.has(a.id))
      .map((a) => a.id)
      .sort(compareText);
    if (orphans.length)
      issues.push({
        code: 'ORPHAN_ASSETS',
        message: orphans.join(', '),
        index: null,
      });
    if (!specimenInputs.length || specimenInputs.length > collection.supply)
      throw new Error('Readiness requires 1..5280 supplied logical specimens');
    const indices = new Set<number>();
    const fingerprints = new Set<string>();
    for (const specimenInput of specimenInputs) {
      let index: number | null = null;
      try {
        const specimen = logicalSpecimenSchema.parse(specimenInput);
        index = specimen.index;
        if (indices.has(index) || fingerprints.has(specimen.fingerprint))
          throw new Error('Duplicate specimen index/fingerprint');
        indices.add(index);
        fingerprints.add(specimen.fingerprint);
        deriveCompositionPlan(inputs, specimen);
        planned++;
      } catch (error) {
        issues.push({
          code: 'PLAN_FAILED',
          message: error instanceof Error ? error.message : 'Invalid specimen',
          index,
        });
      }
    }
  } catch (error) {
    issues.push({
      code: 'INGESTION_FAILED',
      message: error instanceof Error ? error.message : 'Invalid artwork input',
      index: null,
    });
  }
  const production =
    (inputs.manifest as { purpose?: string })?.purpose === 'PRODUCTION';
  return {
    schemaVersion: 1,
    ok: issues.length === 0,
    declarativeProductionReady100:
      issues.length === 0 && production && planned === 100,
    productionReady100: false,
    productionBlockers: [
      'Real image decoding/validation and deterministic production renderer are not implemented',
    ],
    suppliedSpecimens: specimenInputs.length,
    plannedSpecimens: planned,
    orphanAssetIds: orphans,
    issues,
    declarationOnly: ['dimensions', 'mediaType', 'alpha', 'colorProfile'],
    pixelReproductionProven: false,
  };
}
