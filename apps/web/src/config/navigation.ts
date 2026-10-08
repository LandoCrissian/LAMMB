// Kept separate from validated server configuration to keep navigation JS small.
export const navigation = [
  { href: '/', label: 'Home', detail: 'Return to the night' },
  { href: '/vault', label: 'The Vault', detail: 'Behind the seal' },
  { href: '/universe', label: 'The Universe', detail: 'The world within' },
  { href: '/collection', label: 'The Collection', detail: '5280 stories' },
  { href: '/ascent', label: 'The Ascent', detail: 'Follow the climb' },
  { href: '/community', label: 'Community', detail: 'Higher together' },
  { href: '/world', label: 'LAMMB World', detail: 'A future global flock' },
  {
    href: '/profile',
    label: 'Collector Profile',
    detail: 'Your future collection',
  },
  { href: '/faq', label: 'FAQ', detail: 'Find your answers' },
  { href: '/mint', label: 'Mint', detail: 'Availability & details' },
] as const;
