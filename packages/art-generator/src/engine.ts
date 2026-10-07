import { collection } from '@lammb/collection/config';
import { z } from 'zod';
import { canonicalJson, canonicalSha256, compareText } from './canonical.ts';
import { evaluateComposition, specimenFingerprint } from './constraints.ts';
import type { CompositionNode, Rejection } from './constraints.ts';
import {
  corruptionLevelSchema,
  developmentMetadataSchema,
  engineArtifactsSchema,
  engineRequestSchema,
} from './engine-schema.ts';
import type {
  AssetManifest,
  DevelopmentMetadata,
  EngineTrait,
} from './engine-schema.ts';
import { InputError, validateInputs } from './inputs.ts';
import { constructionPrng } from './prng.ts';
import {
  CANONICAL_VERSION,
  ENGINE_VERSION,
  ORDERING_VERSION,
  PRNG_VERSION,
  RENDERER_VERSION,
  SEED_DERIVATION_VERSION,
} from './versions.ts';

export type EngineInputs = {
  catalog: unknown;
  manifest: unknown;
  request: unknown;
  assetBytes: ReadonlyMap<string, Uint8Array>;
  approvals?: unknown;
};
export type LogicalSpecimen = {
  index: number;
  grailId: string | null;
  traitIds: string[];
  composition: CompositionNode[];
  corruptionLevel: string;
  fingerprint: string;
};
export type Failure = {
  code: string;
  message: string;
  specimenIndex: number | null;
  attemptedCandidates: number;
  totalAttemptedCandidates: number;
  requestedOutputCount: number | null;
  exhaustedCategory: string | null;
  dominantRejections: { code: string; message: string; count: number }[];
};

function metadataFor(
  specimen: LogicalSpecimen,
  selected: EngineTrait[],
  purpose: 'DEVELOPMENT_ONLY' | 'PRODUCTION',
): DevelopmentMetadata {
  const publicTraits = selected
    .filter((trait) => trait.publicMetadata)
    .sort((a, b) => a.displayOrder - b.displayOrder || compareText(a.id, b.id));
  const descriptor = (trait: EngineTrait) => ({
    label: trait.category,
    value: trait.label,
  });
  const mutation = publicTraits.find((trait) => trait.category === 'mutations');
  const pixel = publicTraits.find(
    (trait) => trait.category === 'pixel_corruption',
  );
  const environment = publicTraits.find(
    (trait) => trait.category === 'environments',
  );
  const scope = purpose === 'DEVELOPMENT_ONLY' ? 'development' : 'construction';
  return developmentMetadataSchema.parse({
    schemaVersion: 1,
    purpose,
    specimenIdentifier: `${purpose === 'DEVELOPMENT_ONLY' ? 'dev-' : ''}specimen-${String(specimen.index).padStart(4, '0')}`,
    name: `${purpose === 'DEVELOPMENT_ONLY' ? 'Development' : collection.name} specimen ${String(specimen.index).padStart(4, '0')}`,
    imageReference: `urn:lammb:${scope}:logical:${specimen.fingerprint}`,
    publicTraits: publicTraits.map(descriptor),
    ...(mutation ? { mutation: descriptor(mutation) } : {}),
    ...(pixel ? { pixelCorruption: descriptor(pixel) } : {}),
    ...(environment ? { environment: descriptor(environment) } : {}),
    provenanceReference: `urn:lammb:${scope}:provenance:${specimen.fingerprint}`,
  });
}

export function generateCollection(inputs: EngineInputs) {
  const rejectionCounts = new Map<string, { message: string; count: number }>();
  let totalAttempts = 0;
  let currentAttempts = 0;
  let currentIndex: number | null = null;
  let requestedCount: number | null = null;
  const fail = (
    code: string,
    message: string,
    exhaustedCategory: string | null = null,
  ): { ok: false; error: Failure } => ({
    ok: false,
    error: {
      code,
      message,
      specimenIndex: currentIndex,
      attemptedCandidates: currentAttempts,
      totalAttemptedCandidates: totalAttempts,
      requestedOutputCount: requestedCount,
      exhaustedCategory,
      dominantRejections: [...rejectionCounts]
        .map(([code, value]) => ({ code, ...value }))
        .sort((a, b) => b.count - a.count || compareText(a.code, b.code))
        .slice(0, 12),
    },
  });
  const recordRejections = (reasons: Rejection[]) => {
    for (const reason of reasons) {
      const old = rejectionCounts.get(reason.code);
      rejectionCounts.set(reason.code, {
        message: reason.message,
        count: (old?.count ?? 0) + 1,
      });
    }
  };
  try {
    const requestShape = engineRequestSchema.safeParse(inputs.request);
    if (requestShape.success) requestedCount = requestShape.data.outputCount;
    const { catalog, manifest, request } = validateInputs(
      inputs.catalog,
      inputs.manifest,
      inputs.request,
      inputs.assetBytes,
      inputs.approvals,
    );
    requestedCount = request.outputCount;
    if (
      catalog.purpose === 'PRODUCTION' &&
      request.outputCount !== collection.supply
    )
      return fail(
        'PRODUCTION_COUNT',
        'Production construction must request canonical supply',
      );
    const recipe = {
      schemaVersion: 2,
      seedHex: request.seedHex,
      sourceReference: request.sourceReference,
      generatorVersion: ENGINE_VERSION,
      prngAlgorithm: PRNG_VERSION,
      orderingVersion: ORDERING_VERSION,
      canonicalVersion: CANONICAL_VERSION,
      rendererVersion: RENDERER_VERSION,
      seedDerivationVersion: SEED_DERIVATION_VERSION,
      collectionConfigSha256: canonicalSha256({
        ...collection,
        mintPriceWei: collection.mintPriceWei.toString(),
      }),
      catalogSha256: canonicalSha256(catalog),
      assetsManifestSha256: canonicalSha256(manifest),
      expectedOutputCount: request.outputCount,
      maxAttemptsPerSpecimen: request.maxAttemptsPerSpecimen,
      maxTotalAttempts: request.maxTotalAttempts,
    };
    const prng = constructionPrng(recipe);
    const traitsById = new Map(
      catalog.traits.map((trait) => [trait.id, trait]),
    );
    const assetsById = new Map(
      manifest.assets.map((asset) => [asset.id, asset]),
    );
    const pools = new Map(
      catalog.categories.map(({ category }) => [
        category,
        catalog.traits.filter((trait) => trait.category === category),
      ]),
    );
    const reserved = new Map<
      number,
      {
        grailId: string;
        traits: EngineTrait[];
        composition: CompositionNode[];
        fingerprint: string;
      }
    >();
    const grailFingerprints = new Set<string>();
    for (const grail of catalog.grails)
      for (const reservation of grail.reservations) {
        currentIndex = reservation.index;
        const traits = reservation.traitIds.map((id) => traitsById.get(id)!);
        const result = evaluateComposition(traits, catalog, assetsById);
        if (result.rejections.length) {
          recordRejections(result.rejections);
          return fail(
            'INCOMPATIBLE_GRAIL',
            'Curated grail violates declared constraints',
          );
        }
        const fingerprint = specimenFingerprint(traits, result.composition);
        if (grailFingerprints.has(fingerprint))
          return fail(
            'DUPLICATE_GRAIL',
            'Reserved grail identities must be unique, even across different slots',
          );
        grailFingerprints.add(fingerprint);
        reserved.set(reservation.index, {
          grailId: grail.id,
          traits,
          composition: result.composition,
          fingerprint,
        });
      }
    const ordinaryCount = request.outputCount - reserved.size;
    const frequencies = new Map<string, number>(
      catalog.traits.map((trait) => [trait.id, 0]),
    );
    const allFrequencies = new Map<string, number>(
      catalog.traits.map((trait) => [trait.id, 0]),
    );
    const fingerprints = new Set<string>();
    const specimens: LogicalSpecimen[] = [];
    const metadata: DevelopmentMetadata[] = [];
    const perSpecimenAttempts: number[] = [];
    let ordinaryAccepted = 0;
    let rejectedCandidates = 0;
    for (let index = 0; index < request.outputCount; index++) {
      currentIndex = index;
      currentAttempts = 0;
      const grail = reserved.get(index);
      let selected: EngineTrait[] | null = grail?.traits ?? null;
      let composition: CompositionNode[] | null = grail?.composition ?? null;
      let fingerprint: string | null = grail?.fingerprint ?? null;
      let attempts = 0;
      if (!grail)
        for (; attempts < request.maxAttemptsPerSpecimen;) {
          if (totalAttempts >= request.maxTotalAttempts)
            return fail(
              'TOTAL_ATTEMPT_BOUND',
              'Total construction attempt bound exhausted',
            );
          attempts++;
          totalAttempts++;
          currentAttempts++;
          const remainingOrdinary = ordinaryCount - ordinaryAccepted;
          const candidate: EngineTrait[] = [];
          for (const { category } of catalog.categories) {
            const pool = pools.get(category)!;
            const quotaTraits = pool.filter(
              (trait) => trait.frequency.plannedCount !== undefined,
            );
            const needed = (trait: EngineTrait) =>
              (trait.frequency.plannedCount ?? 0) - frequencies.get(trait.id)!;
            const forced = quotaTraits.filter(
              (trait) => needed(trait) === remainingOrdinary,
            );
            const remainingQuota = quotaTraits.reduce(
              (sum, trait) => sum + needed(trait),
              0,
            );
            const eligible = pool.filter((trait) => {
              if (
                trait.frequency.plannedCount !== undefined &&
                needed(trait) <= 0
              )
                return false;
              if (forced.length)
                return forced.some((item) => item.id === trait.id);
              return (
                remainingQuota !== remainingOrdinary ||
                trait.frequency.plannedCount !== undefined
              );
            });
            if (!eligible.length || forced.length > 1)
              return fail(
                'EXHAUSTED_CATEGORY',
                'Ordinary quota leaves no feasible category selection',
                category,
              );
            const totalWeight = eligible.reduce(
              (sum, trait) => sum + trait.frequency.weight,
              0,
            );
            let draw = prng.bounded(totalWeight);
            let chosen = eligible[0]!;
            for (const trait of eligible) {
              if (draw < trait.frequency.weight) {
                chosen = trait;
                break;
              }
              draw -= trait.frequency.weight;
            }
            candidate.push(chosen);
          }
          const evaluated = evaluateComposition(candidate, catalog, assetsById);
          const candidateFingerprint = specimenFingerprint(
            candidate,
            evaluated.composition,
          );
          if (grailFingerprints.has(candidateFingerprint))
            evaluated.rejections.push({
              code: 'RESERVED_GRAIL_IDENTITY',
              message:
                'Ordinary selection cannot manufacture a reserved grail identity',
            });
          if (fingerprints.has(candidateFingerprint))
            evaluated.rejections.push({
              code: 'DUPLICATE_IDENTITY',
              message: 'Logical specimen fingerprint already exists',
            });
          if (evaluated.rejections.length) {
            rejectedCandidates++;
            recordRejections(evaluated.rejections);
            continue;
          }
          selected = candidate;
          composition = evaluated.composition;
          fingerprint = candidateFingerprint;
          for (const trait of candidate)
            frequencies.set(trait.id, frequencies.get(trait.id)! + 1);
          ordinaryAccepted++;
          break;
        }
      if (!selected || !composition || !fingerprint)
        return fail(
          'SPECIMEN_ATTEMPT_BOUND',
          'No valid unique composition within the specimen attempt bound',
        );
      if (fingerprints.has(fingerprint))
        return fail(
          'DUPLICATE_IDENTITY',
          'Duplicate reserved or ordinary fingerprint',
        );
      fingerprints.add(fingerprint);
      const specimen = {
        index,
        grailId: grail?.grailId ?? null,
        traitIds: selected.map((trait) => trait.id).sort(compareText),
        composition,
        corruptionLevel: selected.find((trait) => trait.corruption)!.corruption!
          .level,
        fingerprint,
      };
      specimens.push(specimen);
      metadata.push(metadataFor(specimen, selected, catalog.purpose));
      perSpecimenAttempts.push(attempts);
      for (const trait of selected)
        allFrequencies.set(trait.id, allFrequencies.get(trait.id)! + 1);
    }
    for (const trait of catalog.traits)
      if (
        trait.frequency.plannedCount !== undefined &&
        frequencies.get(trait.id) !== trait.frequency.plannedCount
      )
        return fail(
          'UNSATISFIED_QUOTA',
          'Exact ordinary planned count not met',
          trait.category,
        );
    if (
      specimens.length !== request.outputCount ||
      fingerprints.size !== request.outputCount
    )
      return fail('COUNT_MISMATCH', 'Exact unique output count not met');
    const logicalCollection = {
      schemaVersion: 2,
      purpose: catalog.purpose,
      recipe,
      specimens,
    };
    const publicMetadata = {
      schemaVersion: 1,
      purpose: catalog.purpose,
      specimens: metadata,
    };
    const logicalCollectionSha256 = canonicalSha256(logicalCollection);
    const publicMetadataSha256 = canonicalSha256(publicMetadata);
    const provenance = {
      schemaVersion: 2,
      purpose: catalog.purpose,
      recipe,
      logicalCollectionSha256,
      publicMetadataSha256,
      outputs: specimens.map((specimen, index) => ({
        index,
        fingerprint: specimen.fingerprint,
        logicalSha256: canonicalSha256(specimen),
        metadataSha256: canonicalSha256(metadata[index]),
        usedAssetIds: [
          ...new Set(specimen.composition.flatMap((node) => node.assetIds)),
        ].sort(compareText),
      })),
    };
    const categoryFrequencies = Object.fromEntries(
      catalog.categories.map(({ category }) => [
        category,
        Object.fromEntries(
          catalog.traits
            .filter((trait) => trait.category === category)
            .map((trait) => [trait.id, allFrequencies.get(trait.id)!]),
        ),
      ]),
    );
    const corruptionCounts = Object.fromEntries(
      corruptionLevelSchema.options.map((level) => [
        level,
        specimens.filter((specimen) => specimen.corruptionLevel === level)
          .length,
      ]),
    );
    const summary = {
      schemaVersion: 1,
      purpose: catalog.purpose,
      requestedSpecimens: request.outputCount,
      generatedSpecimens: specimens.length,
      uniqueFingerprints: fingerprints.size,
      grailCount: reserved.size,
      mutationCount: specimens.filter((specimen) =>
        specimen.traitIds.some(
          (id) => traitsById.get(id)!.mutation !== undefined,
        ),
      ).length,
      categoryFrequencies,
      ordinaryTraitFrequencies: Object.fromEntries(frequencies),
      corruptionCounts,
      rejectionCounts: Object.fromEntries(
        [...rejectionCounts]
          .sort(([a], [b]) => compareText(a, b))
          .map(([code, value]) => [code, value.count]),
      ),
      attemptStatistics: {
        totalCandidates: totalAttempts,
        rejectedCandidates,
        ordinaryAccepted,
        grailReservations: reserved.size,
        maxSpecimenAttempts: Math.max(0, ...perSpecimenAttempts),
        perSpecimenAttempts,
      },
      catalogSha256: recipe.catalogSha256,
      assetManifestSha256: recipe.assetsManifestSha256,
      logicalCollectionSha256,
      publicMetadataSha256,
    };
    const artifacts = engineArtifactsSchema.parse({
      logicalCollection,
      publicMetadata,
      provenance,
      summary,
    });
    return { ok: true as const, artifacts };
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ')
            .slice(0, 2000)
        : error instanceof Error
          ? error.message
          : 'Invalid structured inputs';
    return fail(
      error instanceof InputError ? 'INPUT_CONSTRAINT' : 'INVALID_INPUT',
      message,
    );
  }
}

export type EngineArtifacts = Extract<
  ReturnType<typeof generateCollection>,
  { ok: true }
>['artifacts'];

export function verifyCollection(inputs: EngineInputs, artifactInput: unknown) {
  const regenerated = generateCollection(inputs);
  if (!regenerated.ok) return regenerated;
  try {
    engineArtifactsSchema.parse(artifactInput);
    // Every field and every digest is recomputed from independent input evidence.
    if (canonicalJson(artifactInput) !== canonicalJson(regenerated.artifacts))
      return {
        ok: false as const,
        error: {
          code: 'VERIFICATION_MISMATCH',
          message: 'Artifacts differ from independently reconstructed outputs',
        },
      };
    return {
      ok: true as const,
      logicalCollectionSha256:
        regenerated.artifacts.provenance.logicalCollectionSha256,
    };
  } catch {
    return {
      ok: false as const,
      error: {
        code: 'MALFORMED_ARTIFACT',
        message: 'Artifact is not a supported canonical JSON value',
      },
    };
  }
}

export type EngineAsset = AssetManifest['assets'][number];
