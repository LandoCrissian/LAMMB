import { z } from 'zod';
import {
  genesisDigest,
  parseSchema,
  requireGenesis,
  serializeGenesis,
  assertSupply,
} from './genesis-model.ts';
import type { SelectionContext } from './genesis-model.ts';
import { validateAdapted, requireCurrentArtifact } from './genesis-adapter.ts';
import type {
  AdaptedComposition,
  VerifiedArtifact,
} from './genesis-adapter.ts';

export const registrationStates = [
  'DEVELOPMENT',
  'OWNER_ACCEPTED',
  'VALIDATED_FOR_REGISTRATION',
  'REGISTERED',
  'REVOKED_PREDEPLOYMENT',
] as const;
export type RegistrationState = (typeof registrationStates)[number];
export interface ExecutionIntent {
  operation: 'REGISTER' | 'REVOKE_REGISTERED';
  selectionSha256: string;
  registrationId: string;
  expectedRecordSha256: string;
  occurredAt: string;
}
// Trusted host integration, never obtained from a registry JSON field.
// The host must authenticate a signed/operator grant and bind nonce, expiry,
// identity, role and this exact intent. No default authorizer exists.
export interface ExecutionAuthority {
  verify(
    intent: Readonly<ExecutionIntent>,
    evidence: Readonly<ExecutionEvidence>,
  ): boolean;
  verifyHistorical?: (
    intent: Readonly<ExecutionIntent>,
    evidence: Readonly<ExecutionEvidence>,
  ) => boolean;
  verifySnapshot?: (
    intent: Readonly<SnapshotWriteIntent>,
    evidence: Readonly<ExecutionEvidence>,
  ) => boolean;
}
export interface SnapshotWriteIntent {
  operation: 'INITIALIZE_REGISTRY' | 'WRITE_REGISTRY';
  root: string;
  selectionSha256: string;
  previousCommitDigest: string | null;
  payloadDigest: string;
}
export interface ExecutionEvidence {
  authorityId: string;
  intentSha256: string;
  publicAuthorization: string;
}
export function validateExecutionEvidence(value: unknown) {
  return parseSchema(
    z.strictObject({
      authorityId: z.string().min(1).max(256),
      intentSha256: z.string().regex(/^[0-9a-f]{64}$/),
      publicAuthorization: z.string().min(1).max(16_384),
    }),
    value,
    'EXECUTION_EVIDENCE_SCHEMA',
  );
}
type Event = {
  from: RegistrationState;
  to: RegistrationState;
  evidenceSha256: string;
  occurredAt: string | null;
  executionEvidence: ExecutionEvidence | null;
  eventId: string;
};
export interface GenesisRegistryRecord {
  schemaVersion: 'lammb-genesis-registry-record/1';
  registrationId: string;
  composition: AdaptedComposition;
  status: RegistrationState;
  ownerAcceptanceReference: {
    scope: 'COLLECTION_LEVEL';
    evidenceSha256: string;
    selectionSha256: string;
  } | null;
  registeredAt: string | null;
  history: Event[];
}
export function developmentRecord(
  composition: AdaptedComposition,
  c: SelectionContext,
): GenesisRegistryRecord {
  validateAdapted(composition, c);
  return {
    schemaVersion: 'lammb-genesis-registry-record/1',
    registrationId:
      'LGR1-' + genesisDigest([c.selectionSha256, composition.compositionId]),
    composition,
    status: 'DEVELOPMENT',
    ownerAcceptanceReference: null,
    registeredAt: null,
    history: [],
  };
}
const allowed: Record<RegistrationState, readonly RegistrationState[]> = {
  DEVELOPMENT: ['OWNER_ACCEPTED', 'REVOKED_PREDEPLOYMENT'],
  OWNER_ACCEPTED: ['VALIDATED_FOR_REGISTRATION', 'REVOKED_PREDEPLOYMENT'],
  VALIDATED_FOR_REGISTRATION: ['REGISTERED', 'REVOKED_PREDEPLOYMENT'],
  REGISTERED: ['REVOKED_PREDEPLOYMENT'],
  REVOKED_PREDEPLOYMENT: [],
};
export function executionIntent(
  record: GenesisRegistryRecord,
  target: 'REGISTERED' | 'REVOKED_PREDEPLOYMENT',
  c: SelectionContext,
  occurredAt: string,
): ExecutionIntent {
  return {
    operation: target === 'REGISTERED' ? 'REGISTER' : 'REVOKE_REGISTERED',
    selectionSha256: c.selectionSha256,
    registrationId: record.registrationId,
    expectedRecordSha256: genesisDigest(record),
    occurredAt,
  };
}
export function transitionRecord(
  input: GenesisRegistryRecord,
  target: RegistrationState,
  c: SelectionContext,
  options: {
    artifact?: VerifiedArtifact;
    mode?: 'READINESS_ONLY' | 'AUTHORIZED_EXECUTION';
    executionAuthority?: ExecutionAuthority;
    executionEvidence?: ExecutionEvidence;
    clock?: () => string;
    deploymentState?: 'UNDEPLOYED' | 'DEPLOYED';
  } = {},
): GenesisRegistryRecord {
  validateRegistryRecord(input, c, options.executionAuthority);
  requireGenesis(
    allowed[input.status].includes(target),
    'STATE_TRANSITION',
    input.composition.compositionId,
  );
  requireGenesis(
    options.deploymentState !== 'DEPLOYED',
    'POSTDEPLOYMENT_TRANSITION',
  );
  const next = JSON.parse(serializeGenesis(input)) as GenesisRegistryRecord;
  let evidenceSha256: string,
    occurredAt: string | null = null;
  let executionEvidence: ExecutionEvidence | null = null;
  if (target === 'OWNER_ACCEPTED') {
    requireGenesis(
      c.approvalSha256,
      'OWNER_APPROVAL_REQUIRED',
      input.composition.compositionId,
    );
    evidenceSha256 = c.approvalSha256;
    next.ownerAcceptanceReference = {
      scope: 'COLLECTION_LEVEL',
      evidenceSha256,
      selectionSha256: c.selectionSha256,
    };
  } else if (target === 'VALIDATED_FOR_REGISTRATION') {
    requireGenesis(
      options.artifact,
      'CURRENT_ARTIFACT_PROOF',
      input.composition.compositionId,
    );
    requireCurrentArtifact(options.artifact, input.composition);
    evidenceSha256 = genesisDigest(input.composition.verification);
  } else if (target === 'REGISTERED' || input.status === 'REGISTERED') {
    requireGenesis(
      target === 'REGISTERED' || target === 'REVOKED_PREDEPLOYMENT',
      'STATE_TRANSITION',
    );
    requireGenesis(
      options.mode === 'AUTHORIZED_EXECUTION' &&
        options.executionAuthority &&
        typeof options.executionAuthority.verify === 'function' &&
        options.executionEvidence,
      'EXECUTION_NOT_AUTHORIZED',
    );
    occurredAt = options.clock?.() ?? new Date().toISOString();
    requireGenesis(
      /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(occurredAt) &&
        Math.abs(Date.now() - Date.parse(occurredAt)) <= 60_000,
      'REGISTRATION_CLOCK',
    );
    const intent = executionIntent(input, target, c, occurredAt);
    executionEvidence = validateExecutionEvidence(options.executionEvidence);
    requireGenesis(
      executionEvidence.intentSha256 === genesisDigest(intent) &&
        executionEvidence.authorityId.length > 0 &&
        executionEvidence.publicAuthorization.length > 0 &&
        options.executionAuthority.verify(
          Object.freeze(intent),
          Object.freeze({ ...executionEvidence }),
        ),
      'EXECUTION_GRANT',
    );
    if (target === 'REGISTERED') {
      requireGenesis(
        options.artifact,
        'CURRENT_ARTIFACT_PROOF',
        input.composition.compositionId,
      );
      requireCurrentArtifact(options.artifact, input.composition, 300_000);
    }
    evidenceSha256 = genesisDigest(executionEvidence);
    if (target === 'REGISTERED') next.registeredAt = occurredAt;
  } else {
    requireGenesis(c.approvalSha256, 'OWNER_APPROVAL_REQUIRED');
    evidenceSha256 = genesisDigest([
      'PREDEPLOYMENT_READINESS_ROLLBACK',
      c.approvalSha256,
      input.registrationId,
    ]);
  }
  const event: Event = {
    from: input.status,
    to: target,
    evidenceSha256,
    occurredAt,
    executionEvidence,
    eventId: genesisDigest([
      input.registrationId,
      genesisDigest(input),
      target,
      evidenceSha256,
      occurredAt,
    ]),
  };
  next.status = target;
  next.history.push(event);
  validateRegistryRecord(next, c, options.executionAuthority);
  return next;
}
export function validateRegistryRecord(
  record: GenesisRegistryRecord,
  c: SelectionContext,
  authority?: ExecutionAuthority,
) {
  const sha = z.string().regex(/^[0-9a-f]{64}$/);
  parseSchema(
    z.strictObject({
      schemaVersion: z.literal('lammb-genesis-registry-record/1'),
      registrationId: z.string().regex(/^LGR1-[0-9a-f]{64}$/),
      composition: z.record(z.string(), z.json()),
      status: z.enum(registrationStates),
      ownerAcceptanceReference: z
        .strictObject({
          scope: z.literal('COLLECTION_LEVEL'),
          evidenceSha256: sha,
          selectionSha256: sha,
        })
        .nullable(),
      registeredAt: z.string().datetime().nullable(),
      history: z
        .array(
          z.strictObject({
            from: z.enum(registrationStates),
            to: z.enum(registrationStates),
            evidenceSha256: sha,
            occurredAt: z.string().datetime().nullable(),
            executionEvidence: z
              .strictObject({
                authorityId: z.string().min(1),
                intentSha256: sha,
                publicAuthorization: z.string().min(1),
              })
              .nullable(),
            eventId: sha,
          }),
        )
        .max(8),
    }),
    record,
    'REGISTRY_RECORD_SCHEMA',
  );
  validateAdapted(record.composition, c);
  const start = developmentRecordUnchecked(record.composition, c);
  for (const event of record.history) {
    requireGenesis(
      event.from === start.status && allowed[start.status].includes(event.to),
      'HISTORY_TRANSITION',
    );
    const previous = genesisDigest(start);
    requireGenesis(
      event.eventId ===
        genesisDigest([
          start.registrationId,
          previous,
          event.to,
          event.evidenceSha256,
          event.occurredAt,
        ]),
      'HISTORY_EVENT_DIGEST',
    );
    if (event.to === 'OWNER_ACCEPTED') {
      requireGenesis(
        c.approvalSha256 &&
          event.evidenceSha256 === c.approvalSha256 &&
          event.occurredAt === null &&
          event.executionEvidence === null,
        'OWNER_APPROVAL_BINDING',
      );
      start.ownerAcceptanceReference = {
        scope: 'COLLECTION_LEVEL',
        evidenceSha256: c.approvalSha256,
        selectionSha256: c.selectionSha256,
      };
    } else if (event.to === 'VALIDATED_FOR_REGISTRATION') {
      requireGenesis(
        event.evidenceSha256 ===
          genesisDigest(record.composition.verification) &&
          event.occurredAt === null &&
          event.executionEvidence === null,
        'VALIDATION_EVIDENCE',
      );
    } else if (event.to === 'REGISTERED' || event.from === 'REGISTERED') {
      requireGenesis(
        event.to === 'REGISTERED' || event.to === 'REVOKED_PREDEPLOYMENT',
        'HISTORY_TRANSITION',
      );
      requireGenesis(
        authority && event.executionEvidence && event.occurredAt,
        'EXECUTION_NOT_AUTHORIZED',
      );
      const intent = executionIntent(start, event.to, c, event.occurredAt);
      requireGenesis(
        event.executionEvidence.intentSha256 === genesisDigest(intent) &&
          event.evidenceSha256 === genesisDigest(event.executionEvidence) &&
          (authority.verifyHistorical ?? authority.verify)(
            Object.freeze(intent),
            Object.freeze({ ...event.executionEvidence }),
          ),
        'EXECUTION_GRANT',
      );
      if (event.to === 'REGISTERED') start.registeredAt = event.occurredAt;
    } else {
      requireGenesis(
        c.approvalSha256 &&
          event.evidenceSha256 ===
            genesisDigest([
              'PREDEPLOYMENT_READINESS_ROLLBACK',
              c.approvalSha256,
              start.registrationId,
            ]) &&
          event.occurredAt === null &&
          event.executionEvidence === null,
        'ROLLBACK_AUTHORIZATION',
      );
    }
    start.status = event.to;
    start.history.push(event);
  }
  requireGenesis(
    genesisDigest(start) === genesisDigest(record),
    'REGISTRY_RECORD_INTEGRITY',
  );
  return true;
}
function developmentRecordUnchecked(
  composition: AdaptedComposition,
  c: SelectionContext,
): GenesisRegistryRecord {
  return {
    schemaVersion: 'lammb-genesis-registry-record/1',
    registrationId:
      'LGR1-' + genesisDigest([c.selectionSha256, composition.compositionId]),
    composition,
    status: 'DEVELOPMENT',
    ownerAcceptanceReference: null,
    registeredAt: null,
    history: [],
  };
}
export interface GenesisRegistrySnapshot {
  schemaVersion: 'lammb-genesis-registry/1';
  purpose: 'READINESS_DRY_RUN' | 'PRODUCTION';
  selectionSha256: string;
  completeCollection: boolean;
  records: GenesisRegistryRecord[];
  productionRegistrations: number;
}
export function registrySnapshot(
  records: GenesisRegistryRecord[],
  c: SelectionContext,
  completeCollection = false,
  policy: {
    purpose?: 'READINESS_DRY_RUN' | 'PRODUCTION';
    executionAuthority?: ExecutionAuthority;
  } = {},
): GenesisRegistrySnapshot {
  const snapshot: GenesisRegistrySnapshot = {
    schemaVersion: 'lammb-genesis-registry/1',
    purpose: policy.purpose ?? 'READINESS_DRY_RUN',
    selectionSha256: c.selectionSha256,
    completeCollection,
    records: [...records].sort((a, b) =>
      a.composition.compositionId < b.composition.compositionId ? -1 : 1,
    ),
    productionRegistrations: records.filter((r) => r.status === 'REGISTERED')
      .length,
  };
  validateSnapshot(snapshot, c, policy);
  return snapshot;
}
export function validateSnapshot(
  snapshot: GenesisRegistrySnapshot,
  c: SelectionContext,
  policy: {
    purpose?: 'READINESS_DRY_RUN' | 'PRODUCTION';
    executionAuthority?: ExecutionAuthority;
  } = {},
) {
  const purpose = policy.purpose ?? 'READINESS_DRY_RUN';
  if (purpose === 'PRODUCTION')
    requireGenesis(
      policy.executionAuthority &&
        typeof policy.executionAuthority.verify === 'function',
      'PRODUCTION_AUTHORITY_REQUIRED',
    );
  parseSchema(
    z.strictObject({
      schemaVersion: z.literal('lammb-genesis-registry/1'),
      purpose: z.literal(purpose),
      selectionSha256: z.literal(c.selectionSha256),
      completeCollection: z.boolean(),
      records: z.array(z.record(z.string(), z.json())).min(1).max(720),
      productionRegistrations: z.number().int().min(0).max(720),
    }),
    snapshot,
    'REGISTRY_SNAPSHOT_SCHEMA',
  );
  for (const key of ['registrationId'] as const)
    requireGenesis(
      new Set(snapshot.records.map((r) => r[key])).size ===
        snapshot.records.length,
      'REGISTRY_DUPLICATE',
    );
  for (const key of ['compositionId', 'pngSha256', 'pixelSha256'] as const)
    requireGenesis(
      new Set(snapshot.records.map((r) => r.composition[key])).size ===
        snapshot.records.length,
      'REGISTRY_DUPLICATE',
    );
  requireGenesis(
    snapshot.records.every(
      (r, i) =>
        i === 0 ||
        snapshot.records[i - 1]!.composition.compositionId <
          r.composition.compositionId,
    ),
    'REGISTRY_RECORD_ORDER',
  );
  for (const r of snapshot.records) {
    if (purpose === 'READINESS_DRY_RUN')
      requireGenesis(
        r.status !== 'REGISTERED' && r.registeredAt === null,
        'DRY_RUN_REGISTERED_STATE',
      );
    validateRegistryRecord(r, c, policy.executionAuthority);
  }
  requireGenesis(
    snapshot.productionRegistrations ===
      snapshot.records.filter((r) => r.status === 'REGISTERED').length,
    'REGISTERED_COUNT',
  );
  if (snapshot.completeCollection)
    assertSupply(snapshot.records.map((r) => r.composition));
  return true;
}
