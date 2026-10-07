import type {
  CollectorRevealState,
  LaunchSnapshot,
  LaunchState,
} from '@lammb/schema/launch';
import { compatibleCollectorStates } from '@lammb/schema/launch';
import { collection } from './config';
import { launchSnapshotSchema, recoveryMilestones } from './launch';

const numberLabel = (value: number) => value.toLocaleString('en-US');
const altitudeLabel = (value: number) => `${numberLabel(value)} FT`;

export const launchStateLabels = {
  PRE_ASCENT: 'Pre-ascent',
  ASCENT: 'Ascent',
  MINT: 'Mint',
  RECOVERY: 'Recovery',
  BLACKOUT: 'Blackout',
  REVEAL: 'Reveal',
  REVEALED: 'Revealed',
} satisfies Record<LaunchState, string>;

const collectorLabels = {
  sealed: 'SEALED SPECIMEN',
  blackout: 'SEALED / BLACKOUT',
  ready_to_reveal: 'READY TO REVEAL / PRESENTATION ONLY',
  revealing: 'REVEALING / DEVELOPMENT PREVIEW',
  revealed: 'REVEALED / PLACEHOLDERS ONLY',
} satisfies Record<CollectorRevealState, string>;

const collectorStudyDetails = {
  sealed: 'Unrevealed specimen study. No public traits or ownership claim.',
  blackout: 'The specimen remains sealed during the global blackout study.',
  ready_to_reveal:
    'Break the Seal presentation. Ownership and reveal actions are unavailable.',
  revealing:
    'Static study of a reveal in progress. No reveal job or animation runs.',
  revealed:
    'Collection placeholder study. Approved art and public traits are unavailable.',
} satisfies Record<CollectorRevealState, string>;

const milestoneLabels = {
  GROUND: 'At the base',
  HALFWAY: 'Halfway',
  ONE_FOOT_LEFT: 'ONE FOOT LEFT',
  LAUNCH: 'Mint-launch altitude',
};

type MilestonePresentation = {
  id: string;
  altitudeLabel: string;
  label: string;
  reached: boolean;
  historyLabel: string;
};

export type LaunchVisual =
  | {
      kind: 'altitude';
      valueLabel: string;
      value: number | null;
      percent: number | null;
      dataLabel: string;
      nextMilestoneLabel: string;
      milestones: MilestonePresentation[];
    }
  | {
      kind: 'recovery';
      valueLabel: string;
      value: number | null;
      percent: number | null;
      dataLabel: string;
      milestones: string[];
    }
  | {
      kind: 'specimen';
      altitudeLabel: string | null;
      sealLabel: string;
      caption: string;
    }
  | { kind: 'gallery'; caption: string };

export type LaunchPresentation = {
  state: LaunchState;
  label: string;
  title: string;
  detail: string;
  authorityLabel: string;
  collectorLabel: string;
  collectorStudies: {
    state: CollectorRevealState;
    label: string;
    detail: string;
  }[];
  visual: LaunchVisual;
  boundaries: { label: string; detail: string }[];
};

function altitudeVisual(
  snapshot: Extract<LaunchSnapshot, { state: 'PRE_ASCENT' | 'ASCENT' }>,
): Extract<LaunchVisual, { kind: 'altitude' }> {
  const current = snapshot.currentAltitudeFt.value;
  const next =
    current === null
      ? undefined
      : snapshot.milestones.value.find(
          (milestone) => milestone.altitudeFt > current,
        );
  const history =
    snapshot.state === 'ASCENT' ? snapshot.milestoneHistory.value : null;
  return {
    kind: 'altitude',
    value: current,
    valueLabel:
      current === null ? 'ALTITUDE UNAVAILABLE' : altitudeLabel(current),
    percent: current === null ? null : (current / collection.supply) * 100,
    dataLabel:
      snapshot.state === 'PRE_ASCENT'
        ? 'Static canonical / initial altitude'
        : current === null
          ? 'Future server authority / unavailable'
          : 'Development fixture / altitude and history are examples',
    nextMilestoneLabel: next
      ? `${altitudeLabel(next.altitudeFt)} / ${milestoneLabels[next.id]}`
      : 'Awaiting authorized altitude data',
    milestones: snapshot.milestones.value.map((milestone) => {
      const reachedAt = history?.find(
        (entry) => entry.milestoneId === milestone.id,
      )?.reachedAt;
      return {
        id: milestone.id,
        altitudeLabel: altitudeLabel(milestone.altitudeFt),
        label: milestoneLabels[milestone.id],
        reached: current !== null && milestone.altitudeFt <= current,
        historyLabel: reachedAt
          ? `Development history / ${reachedAt}`
          : 'No authorized milestone event',
      };
    }),
  };
}

// The validation/derivation boundary. React only renders this typed view model.
export function createLaunchPresentation(input: unknown): LaunchPresentation {
  const snapshot = launchSnapshotSchema.parse(input);
  const base = {
    state: snapshot.state,
    label: launchStateLabels[snapshot.state],
    authorityLabel: 'DEVELOPMENT / NOT LIVE',
    collectorLabel: collectorLabels[snapshot.collector.state],
    collectorStudies: [],
  };
  switch (snapshot.state) {
    case 'PRE_ASCENT':
      return {
        ...base,
        title: 'AT THE BASE.',
        detail:
          'The 5,280 Ascent begins at 0 FT. Sealed first. Revealed later. Launch timing remains unresolved.',
        visual: altitudeVisual(snapshot),
        boundaries: [
          {
            label: 'Deliberate progression',
            detail:
              'Altitude is authorized launch data. Likes, followers, referrals, quests and community activity do not move it.',
          },
        ],
      };
    case 'ASCENT':
      return {
        ...base,
        title:
          snapshot.currentAltitudeFt.value === collection.supply - 1
            ? 'ONE FOOT LEFT.'
            : 'THE ASCENT.',
        detail:
          '2,640 FT marks halfway. 5,279 FT is the intentional final pause. Only a future authorized launch decision can release the last foot.',
        visual: altitudeVisual(snapshot),
        boundaries: [
          {
            label: 'No engagement engine',
            detail:
              'Altitude and milestone events are deliberate launch data. No social metric, timer or browser action advances them.',
          },
        ],
      };
    case 'MINT':
      return {
        ...base,
        title: 'LAUNCH ALTITUDE.',
        detail:
          '5,280 FT. The intended mint begins with a sealed specimen. Free mint on Robinhood Chain; network gas still applies.',
        visual: {
          kind: 'specimen',
          altitudeLabel: altitudeLabel(snapshot.currentAltitudeFt.value),
          sealLabel: 'SEALED SPECIMEN',
          caption:
            'Static canonical launch altitude / replaceable specimen study / no NFT artwork',
        },
        boundaries: [
          {
            label: 'Mint integration / not connected',
            detail:
              'Development presentation only. No wallet, eligibility decision or transaction is available.',
          },
        ],
      };
    case 'RECOVERY':
      return {
        ...base,
        title: 'SPECIMENS RECOVERED.',
        detail:
          'Each recovered specimen remains sealed. Recovery milestones describe the experience; they do not guarantee a sellout or trigger blackout.',
        visual: {
          kind: 'recovery',
          value: snapshot.recoveredCount.value,
          valueLabel: `${snapshot.recoveredCount.value === null ? '—' : numberLabel(snapshot.recoveredCount.value)} / ${numberLabel(snapshot.supply.value)}`,
          percent:
            snapshot.recoveredCount.value === null
              ? null
              : (snapshot.recoveredCount.value / snapshot.supply.value) * 100,
          dataLabel:
            snapshot.recoveredCount.value === null
              ? 'Future onchain supply / unavailable / no chain reads'
              : 'Development fixture / sample count / not onchain',
          milestones: recoveryMilestones.map(numberLabel),
        },
        boundaries: [
          {
            label: 'Authoritative reader / unresolved',
            detail:
              'Unavailable means unknown, never zero. A future supply reader must verify its source before numbers can represent onchain truth.',
          },
        ],
      };
    case 'BLACKOUT':
      return {
        ...base,
        title: 'BLACKOUT.',
        detail: snapshot.message.text,
        visual: {
          kind: 'specimen',
          altitudeLabel: null,
          sealLabel: 'SEALED SPECIMEN',
          caption: `Blackout message / version ${snapshot.message.version} / development fixture`,
        },
        boundaries: [
          {
            label: 'A deliberate launch state',
            detail:
              'No countdown. No automatic transition after collection completion. Transition authority and the completion condition remain unresolved.',
          },
        ],
      };
    case 'REVEAL':
      return {
        ...base,
        collectorStudies: compatibleCollectorStates.REVEAL.map((state) => ({
          state,
          label: collectorLabels[state],
          detail: collectorStudyDetails[state],
        })),
        title: snapshot.presentation.title,
        detail: snapshot.presentation.detail,
        visual: {
          kind: 'specimen',
          altitudeLabel: null,
          sealLabel: base.collectorLabel,
          caption: 'Ownership unverified / reveal presentation only',
        },
        boundaries: [
          {
            label: 'Reveal integration / not connected',
            detail:
              'No ownership claim, metadata mutation, contract reveal, IPFS publication or marketplace refresh occurs here.',
          },
        ],
      };
    case 'REVEALED':
      return {
        ...base,
        title: 'OUT OF THE SEAL.',
        detail:
          'A foundation for the revealed collection and the collector share experience. Approved artwork and public traits will arrive through separate reviewed boundaries.',
        visual: {
          kind: 'gallery',
          caption:
            'Collection placeholders / no final artwork, traits or rarity',
        },
        boundaries: [
          {
            label: 'Public traits',
            detail: 'Unavailable. No final traits or rarity are invented.',
          },
          {
            label: 'Provenance',
            detail:
              'Commitment schemas exist. Independent verification and the final fairness protocol remain unimplemented.',
          },
          {
            label: 'Share card',
            detail:
              'Versioned public data boundary only. No generated card, private recipe or internal generation metadata.',
          },
        ],
      };
  }
}
