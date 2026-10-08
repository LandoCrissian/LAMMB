import { cinematicAsset } from './cinematic-art';

// Task 005D authorizes new website previews, not production NFT artwork.
// Matching independently illustrated 2D views; no exact 3D geometry claim.
export const specimenViews = ['front', 'side', 'rear'].map((view) => ({
  ...cinematicAsset(view as SpecimenView),
  view: view as SpecimenView,
}));
export type SpecimenView = 'front' | 'side' | 'rear';
export const specimenDescriptions: Record<SpecimenView, string> = {
  front:
    'Front concept view of a sealed black specimen container with a chartreuse smile symbol.',
  side: 'Side concept view of the sealed specimen container with the LAMMB wordmark.',
  rear: 'Rear concept view of the sealed specimen container with Same Sheep, Different Mindset lettering.',
};
