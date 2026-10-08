import provenance from '../../public/art/sealed-specimen/provenance.json';

// Owner-authorized website preview crops; no mint, owner or token identity.
export const specimenViews = provenance.derivatives;
export type SpecimenView = 'front' | 'side' | 'rear';
export const specimenDescriptions: Record<SpecimenView, string> = {
  front:
    'Front concept view of a sealed black specimen container with a chartreuse smile symbol.',
  side: 'Side concept view of the sealed specimen container with the LAMMB wordmark.',
  rear: 'Rear concept view of the sealed specimen container with Same Sheep, Different Mindset lettering.',
};
