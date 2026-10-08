import { episodeCatalogSchema } from '@lammb/schema/labs';
export const facilityDestinations = [
  {
    id: 'security',
    code: '01',
    label: 'Security Terminal',
    href: '/universe/security',
    description: 'The incident is management.',
    status: 'FICTION / SYSTEM UNRELIABLE',
  },
  {
    id: 'archive',
    code: '02',
    label: 'Experiment Archive',
    href: '/universe/archive',
    description: 'Eleven seconds of success. Four files of consequences.',
    status: 'FICTION / FOUR RECORDS',
  },
  {
    id: 'surveillance',
    code: '03',
    label: 'Surveillance Room',
    href: '/universe/surveillance',
    description: 'The footage has questions.',
    status: 'EPISODE IN DEVELOPMENT',
  },
  {
    id: 'experimental',
    code: '04',
    label: 'Experimental Wing',
    href: '/universe/experimental',
    description: 'A future game. Present liability.',
    status: 'GAME NOT AVAILABLE',
  },
] as const;
export type FacilityId = (typeof facilityDestinations)[number]['id'];
export const labFiles = [
  {
    id: '000',
    title: 'The Initiative',
    category: 'RESEARCH / HUBRIS',
    stamp: 'ELEVEN SECONDS',
    summary:
      'We tried to engineer rational financial behavior. We should have tried a chair.',
    narrative:
      'A secret laboratory set out to create a species incapable of irrational financial decisions. The board called it LAMMB: Let’s All Make Money Bitches. For approximately eleven seconds, the experiment worked. Then somebody connected the subjects to the internet.',
    incidents: [
      {
        id: 'I-000-A',
        title: 'The eleven-second review',
        body: 'Second 10: scientists toasted a breakthrough. Second 11: a subject asked whether food was a depreciating asset. Second 12 has been removed from the investor presentation.',
      },
      {
        id: 'I-000-B',
        title: 'Budget amendment',
        body: 'Risk management requested a fire extinguisher. Finance approved a motivational poster. The poster is now on fire.',
      },
    ],
    annex:
      'Procurement receipt: one rational species. Quantity delivered: technically one. Refund requested: repeatedly. Vendor response: “Have you tried believing harder?”',
  },
  {
    id: '001',
    title: 'The Subjects',
    category: 'BEHAVIOR / CONFIDENCE',
    stamp: 'UNQUALIFIED',
    summary: 'Four early observations. Not a single useful qualification.',
    narrative:
      'Specimen 0001 sold its food supply for a picture of a monkey. Specimen 0002 bought it at a 400% markup. Specimen 0003 started a motivational podcast. Specimen 0004 convinced the scientists to provide exit liquidity. The scientists described this as “unexpected leadership.”',
    incidents: [
      {
        id: 'I-001-A',
        title: 'Podcast contamination',
        body: 'The podcast has no listeners. This has not prevented six scientists from calling themselves early adopters. The microphone is a potato.',
      },
      {
        id: 'I-001-B',
        title: 'Exit interview',
        body: 'The subject left with the research budget. The research team left with a whitepaper. HR has marked both departures as mutually beneficial.',
      },
    ],
    annex:
      'Internal competency rubric: confidence 10/10; competence not detected. The rubric was written by Specimen 0004 and signed by all available scientists.',
  },
  {
    id: '002',
    title: 'The Corruption',
    category: 'ANOMALY / MATERIAL FAILURE',
    stamp: 'DO NOT NORMALIZE',
    summary: 'The wool held. Reality filed a complaint.',
    narrative:
      'Some subjects developed mutations, skeletal anomalies and selective pixel corruption. The lab blamed the containment equipment. The equipment blamed a firmware update. The update blamed nobody, because it had already become a motivational speaker.',
    incidents: [
      {
        id: 'I-002-A',
        title: 'Missing pixel allowance',
        body: 'A technician reported six missing pixels. Management classified them as remote workers. None has attended a meeting, so performance is above average.',
      },
      {
        id: 'I-002-B',
        title: 'Structural review',
        body: 'A skeletal anomaly was referred to compliance. Compliance asked whether the bones had consented to the new org chart. Investigation remains aggressively unhelpful.',
      },
    ],
    annex:
      'Containment diagram note: interference shown here is a fictional technical illustration. It is neither an unrevealed specimen nor a preview of actual token traits or rarity.',
  },
  {
    id: '003',
    title: 'The Lockdown',
    category: 'CONTAINMENT / BAD DECISIONS',
    stamp: '5280 SEALED',
    summary: 'Seal the specimens. Preserve the paperwork. Blame the paperwork.',
    narrative:
      '5280 catastrophically unqualified specimens were eventually sealed. The facility was connected to Robinhood Chain. Now the seals are beginning to fail. Management insists everything is contained. Management has also started wearing running shoes to meetings.',
    incidents: [
      {
        id: 'I-003-A',
        title: 'Chain of command',
        body: 'The emergency plan says “consult the emergency plan.” The backup copy says “ask Gary.” Gary is a printer. Gary is offline.',
      },
      {
        id: 'I-003-B',
        title: 'Final announcement',
        body: 'All exits remain clearly marked. All liability remains creatively assigned. The flock is coming. Please stop expensing panic as professional development.',
      },
    ],
    annex:
      'Unsent memo: the seals are failing in the story. The website does not report live seal telemetry, mint availability, onchain events or token identities. Fiction cannot authorize a transaction.',
  },
] as const;
export type LabFile = (typeof labFiles)[number];
export const episodeCatalog = episodeCatalogSchema.parse([
  {
    id: 'EPISODE 001',
    title: 'Exit Liquidity',
    status: 'IN_DEVELOPMENT',
    synopsis:
      'A laboratory attempts to contain a financial disaster. The disaster requests a corner office.',
    media: null,
    releaseDate: null,
  },
]);
