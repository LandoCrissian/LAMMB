import type { AtlasCollection, ParticipationView } from '@lammb/schema/atlas';
import catalog from '../data/countries.json';

export const countries = catalog;
export const atlasCollections: AtlasCollection[] = [
  {
    id: 'lammb',
    name: 'LAMMB',
    role: 'FOUNDING',
    admission: 'FOUNDING_PENDING',
    contract: null,
  },
  ...[
    'CCFF00 Squares',
    'CCFF00 Circles',
    'Cats on Drugs',
    'Jiggalets',
    'Pixel Hood',
  ].map((name): AtlasCollection => ({
    id: name.toLowerCase().replaceAll(' ', '-'),
    name,
    role: 'COMMUNITY',
    admission: 'CANDIDATE',
    contract: null,
  })),
];
export const registry: ParticipationView = {
  authority: 'UNAVAILABLE',
  status: 'REGISTRY_NOT_YET_LIVE',
  records: null,
};
export const filterCollections = atlasCollections.filter(
  (item) =>
    item.admission === 'ADMITTED' || item.admission === 'FOUNDING_PENDING',
);
export function searchCountries(query: string) {
  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  const term = normalize(query);
  return countries.filter((country) =>
    [country.code, country.alpha3, ...country.aliases].some((value) =>
      normalize(value).includes(term),
    ),
  );
}
export function readAtlasFragment(fragment: string) {
  const params = new URLSearchParams(fragment.replace(/^#/, ''));
  const code = params.get('country');
  return {
    country: countries.find((country) => country.code === code) ?? null,
    collection:
      filterCollections.find((item) => item.id === params.get('community'))
        ?.id ?? 'all',
  };
}
