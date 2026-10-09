import { z } from 'zod';
import { canonicalJson } from './canonical.ts';
import { evaluateComposition } from './constraints.ts';
import {
  productionSpecSchema,
  simulationInputs,
  visibleAttributeSchema,
} from './production-spec.ts';

const mediaUri = z
  .string()
  .max(1000)
  .refine((value) => {
    try {
      if (/\s|[\u0000-\u001f\u007f]/.test(value)) return false;
      const url = new URL(value);
      return (
        ['https:', 'ipfs:'].includes(url.protocol) &&
        Boolean(url.hostname) &&
        !url.username &&
        !url.password &&
        !url.hash
      );
    } catch {
      return false;
    }
  }, 'Expected an absolute HTTPS or IPFS URI without credentials');

// Reviewed subset of OpenSea JSON vocabulary, not a claim of live publication.
export const openSeaMetadataSchema = z
  .strictObject({
    name: z.string().min(1).max(160),
    description: z.string().min(1).max(2000),
    image: mediaUri,
    external_url: z.literal('https://lammb.fun'),
    attributes: z.array(visibleAttributeSchema).max(24),
  })
  .superRefine((metadata, context) => {
    const names = metadata.attributes.map((a) => a.trait_type);
    if (
      new Set(names).size !== names.length ||
      names.some((n) => /^(rarity|rank|tier|grail)$/i.test(n))
    )
      context.addIssue({
        code: 'custom',
        message: 'Duplicate or invented rarity attributes',
      });
  });

export function createProposalMetadataAdapter(input: unknown) {
  const spec = productionSpecSchema.parse(input);
  const inputs = simulationInputs(spec);
  const assets = new Map(inputs.manifest.assets.map((a) => [a.id, a]));
  const engineTraits = new Map(inputs.catalog.traits.map((t) => [t.id, t]));
  const traits = new Map(spec.traits.map((t) => [t.id, t]));
  return {
    sealed(image: string) {
      return openSeaMetadataSchema.parse({
        name: 'LAMMB — Sealed Specimen',
        description:
          'A sealed LAMMB specimen. Character traits remain unrevealed.',
        image,
        external_url: 'https://lammb.fun',
        attributes: [],
      });
    },
    revealed(
      identifier: string,
      ids: string[],
      image: string,
      grailId: string | null = null,
    ) {
      if (!/^SIM-[0-9]{4}$/.test(identifier))
        throw new Error(
          'Proposal adapter uses simulation identifiers, not token assignments',
        );
      if (
        ids.length !== 9 ||
        new Set(ids).size !== 9 ||
        new Set(ids.map((id) => traits.get(id)?.category)).size !== 9
      )
        throw new Error('Metadata requires one known trait per category');
      const selected = ids.map((id) => {
        const trait = engineTraits.get(`dev-${id}`);
        if (!trait) throw new Error('Unknown metadata trait');
        return trait;
      });
      const result = evaluateComposition(selected, inputs.catalog, assets);
      if (result.rejections.length)
        throw new Error('Incompatible metadata composition');
      const reserved = spec.grails.find(
        (g) =>
          canonicalJson([...g.traitIds].sort()) ===
          canonicalJson([...ids].sort()),
      );
      if ((reserved?.id ?? null) !== grailId)
        throw new Error('Metadata grail does not match a reserved composition');
      const attributes = spec.categories.flatMap((category) =>
        ids
          .filter((id) => traits.get(id)!.category === category.category)
          .flatMap((id) => traits.get(id)!.metadata),
      );
      for (const attribute of reserved?.metadata ?? []) {
        const old = attributes.findIndex(
          (a) => a.trait_type === attribute.trait_type,
        );
        if (old >= 0) attributes.splice(old, 1);
        attributes.push(attribute);
      }
      return openSeaMetadataSchema.parse({
        name: `LAMMB ${identifier}`,
        description:
          'Unpublished LAMMB collection design simulation. This metadata describes proposed visible traits, not a rendered or minted NFT.',
        image,
        external_url: 'https://lammb.fun',
        attributes,
      });
    },
  };
}
