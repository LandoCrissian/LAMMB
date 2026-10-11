import { openSeaMetadataSchema } from './opensea-metadata.ts';
import { productionSpecSchema } from './production-spec.ts';
import { canonicalSha256, sha256Bytes } from './canonical.ts';
import { requireProof } from './png-ingestion.ts';

// Precisely the four previously reviewed visible facets. No inferred eye color,
// expression, background, absent traits, simulation/token ID or rarity fields.
export function createPngProofMetadata(
  specInput: unknown,
  output: Uint8Array,
  expectedHash: string,
) {
  requireProof(sha256Bytes(output) === expectedHash, 'METADATA_IMAGE_SHA256');
  const spec = productionSpecSchema.parse(specInput);
  requireProof(spec.specVersion === '1.1.0', 'METADATA_SPEC_VERSION');
  const ids = [
    'lammb-base-anatomy-sheep',
    'lammb-wool-ivory',
    'lammb-clothing-hoodie',
    'lammb-accessories-ear-tag',
  ];
  const attributes = ids.flatMap((id) => {
    const trait = spec.traits.find((t) => t.id === id);
    requireProof(trait, 'METADATA_UNKNOWN_TRAIT');
    return trait.metadata;
  });
  requireProof(attributes.length === 4, 'METADATA_FACETS');
  const metadata = openSeaMetadataSchema.parse({
    name: 'LAMMB — Development PNG Contact Proof',
    description:
      'Unpublished engineering proof using reviewed visible Sheep, Ivory Curls, Black Hoodie and 5280 ear tag. No token assignment, registration or allocation.',
    // Deliberately unresolvable reserved example domain. No publication claim.
    image: `https://artwork.invalid/lammb/${expectedHash}.png`,
    external_url: 'https://lammb.fun',
    attributes,
  });
  return {
    metadata,
    binding: {
      purpose: 'DEVELOPMENT_ONLY',
      imageSha256: expectedHash,
      metadataSha256: canonicalSha256(metadata),
      specVersion: spec.specVersion,
      specSha256: canonicalSha256(spec),
      visibleTraitIds: ids,
      publication: 'NOT_PUBLISHED_PLACEHOLDER_URI',
      tokenAssignment: null,
    },
  };
}
