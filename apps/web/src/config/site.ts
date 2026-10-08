import { collection } from '@lammb/collection/config';

// Static editorial content: no live data, social URLs or launch dates.
export const supplyLabel = String(collection.supply);
// Website typography only. Domain values and launch-state schemas are unchanged.
export const displayCopy = (value: string) => value.replaceAll('5,280', '5280');
export const futureExperiences = {
  world: {
    href: '/world',
    eyebrow: 'The global flock',
    title: 'LAMMB WORLD',
    detail:
      'A future country-level view of the flock. Choose what you share, and where your LAMMB belongs.',
    status: 'PLANNED / REGISTRATION UNAVAILABLE',
  },
  profile: {
    href: '/profile',
    eyebrow: 'Your corner of the universe',
    title: 'COLLECTOR PROFILE',
    detail:
      'A future home for your specimens, with optional identity and privacy controls.',
    status: 'PLANNED / PROFILES UNAVAILABLE',
  },
  mint: {
    href: '/mint',
    eyebrow: 'The first encounter',
    title: 'RECOVER A SPECIMEN',
    detail: `A free mint on ${collection.chainName}. Your first encounter is with a sealed specimen. The reveal comes later.`,
    status: 'NOT LIVE / MINT UNAVAILABLE',
  },
} as const;
export const questions = [
  {
    question: 'What is LAMMB?',
    answer: `LAMMB means Let's All Make Money Bitches. A collection of ${supplyLabel} stylized lamb characters, built around one species and different personalities.`,
  },
  {
    question: 'Which chain is LAMMB on?',
    answer: `${collection.chainName} only. Chain ID ${collection.chainId}. No wallet or network connection is required to explore LAMMB.`,
  },
  {
    question: 'Is the mint free?',
    answer:
      'The primary mint price is 0 ETH. Network gas still applies. Minting is currently unavailable.',
  },
  {
    question: 'Can I mint now?',
    answer:
      'No. The launch date and availability have not been announced here. This site has no wallet connection or transaction flow.',
  },
  {
    question: 'What do I receive at mint?',
    answer:
      'A sealed, unrevealed specimen is the intended experience. Final artwork and public traits are revealed later; this site shows sealed-specimen concept previews, not final NFT artwork.',
  },
  {
    question: 'What is The 5280 Ascent?',
    answer:
      'A deliberate launch narrative: 0 FT at the base, 2,640 FT halfway, 5,279 FT with one foot left, and 5280 FT at mint-launch altitude. Social engagement does not move the altitude.',
  },
  {
    question: 'How does Break the Seal work?',
    answer:
      'Sealed specimens, a deliberate blackout, and then reveal are the intended experience. The reveal mechanism and timing remain unresolved. No collector action is available here.',
  },
  {
    question: 'Where will the collection be available?',
    answer: `${collection.marketplaceTarget} is the marketplace target. An official collection link is not available yet.`,
  },
  {
    question: 'Can I register my LAMMB on the world map?',
    answer:
      'LAMMB World is planned as an optional country-level collector experience. Registration, ownership verification and privacy controls must be reviewed before it becomes available.',
  },
  {
    question: 'Are partners or rarity percentages confirmed?',
    answer:
      'No production partners, final traits or rarity percentages are announced here. Concept references do not establish production promises.',
  },
] as const;
