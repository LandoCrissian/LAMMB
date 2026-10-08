// Kept separate from validated server configuration to keep navigation JS small.
// Unknown nested URLs must retain the prerendered 404 header on hydration.
export function navigationDestinationPath(pathname: string) {
  return /^\/universe\/(security|archive(?:\/00[0-3])?|surveillance|experimental)$/.test(
    pathname,
  )
    ? '/universe'
    : pathname;
}
export const navigation = [
  { href: '/', label: 'Home', detail: 'Return to the night' },
  { href: '/vault', label: 'The Vault', detail: 'Behind the seal' },
  { href: '/universe', label: 'The Universe', detail: 'The world within' },
  { href: '/collection', label: 'The Collection', detail: '5280 stories' },
  { href: '/ascent', label: 'The Ascent', detail: 'Follow the climb' },
  { href: '/community', label: 'Community', detail: 'Higher together' },
  { href: '/world', label: 'LAMMB World', detail: 'Explore the global atlas' },
  {
    href: '/profile',
    label: 'Collector Profile',
    detail: 'Your future collection',
  },
  { href: '/faq', label: 'FAQ', detail: 'Find your answers' },
  { href: '/mint', label: 'Mint', detail: 'Availability & details' },
] as const;
