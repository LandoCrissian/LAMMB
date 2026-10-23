import { createPublicKey, verify } from 'node:crypto';
import { z } from 'zod';
import {
  bytesHash,
  genesisDigest,
  parseGenesisJson,
  parseSchema,
  requireGenesis,
  serializeGenesis,
} from './genesis-model.ts';
import type {
  ExecutionAuthority,
  ExecutionEvidence,
  ExecutionIntent,
  SnapshotWriteIntent,
} from './genesis-registry.ts';

export const executionOperations = [
  'REGISTER',
  'REVOKE_REGISTERED',
  'INITIALIZE_REGISTRY',
  'WRITE_REGISTRY',
] as const;
const statementSchema = z.strictObject({
  schemaVersion: z.literal('lammb-genesis-execution-grant/1'),
  authorityId: z.string().min(1).max(160),
  operation: z.enum(executionOperations),
  intentSha256: z.string().regex(/^[0-9a-f]{64}$/),
  nonce: z.string().uuid(),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
const grantSchema = z.strictObject({
  statement: statementSchema,
  signature: z.string().max(100),
});
export interface Ed25519AuthorityPolicy {
  authorityId: string;
  publicKeyPem: string;
  expectedPublicKeySha256: string;
  allowedOperations: readonly (typeof executionOperations)[number][];
  clock?: () => number;
}
// Public-key verification only. No private key, wallet or signer is loaded.
// Trust policy must be installed by the trusted host, not read from a dataset.
export function createEd25519ExecutionAuthority(
  policy: Ed25519AuthorityPolicy,
): ExecutionAuthority {
  requireGenesis(
    policy.publicKeyPem.includes('BEGIN PUBLIC KEY') &&
      !policy.publicKeyPem.includes('PRIVATE KEY'),
    'AUTHORITY_PUBLIC_KEY_ONLY',
  );
  const key = createPublicKey(policy.publicKeyPem);
  requireGenesis(
    key.asymmetricKeyType === 'ed25519' &&
      bytesHash(key.export({ type: 'spki', format: 'der' })) ===
        policy.expectedPublicKeySha256 &&
      policy.authorityId.length > 0 &&
      policy.allowedOperations.length > 0,
    'AUTHORITY_KEY_PIN',
  );
  const allowed = new Set(policy.allowedOperations),
    now = policy.clock ?? Date.now;
  const check = (
    intent: Readonly<ExecutionIntent | SnapshotWriteIntent>,
    evidence: Readonly<ExecutionEvidence>,
    historical: boolean,
  ) => {
    try {
      if (evidence.publicAuthorization.length > 8192) return false;
      const grant = parseSchema(
        grantSchema,
        parseGenesisJson(evidence.publicAuthorization),
        'GRANT_SCHEMA',
      );
      const s = grant.statement,
        issued = Date.parse(s.issuedAt),
        expires = Date.parse(s.expiresAt);
      const at =
        historical && 'occurredAt' in intent
          ? Date.parse(intent.occurredAt)
          : now();
      if (
        evidence.authorityId !== policy.authorityId ||
        s.authorityId !== policy.authorityId ||
        s.operation !== intent.operation ||
        !allowed.has(s.operation) ||
        s.intentSha256 !== genesisDigest(intent) ||
        evidence.intentSha256 !== s.intentSha256 ||
        !Number.isFinite(at) ||
        issued > at + 5000 ||
        at > expires ||
        expires <= issued ||
        expires - issued > 300_000 ||
        at - issued > 300_000 ||
        serializeGenesis(grant) !== evidence.publicAuthorization
      )
        return false;
      const signature = Buffer.from(grant.signature, 'base64');
      return (
        signature.length === 64 &&
        signature.toString('base64') === grant.signature &&
        verify(null, Buffer.from(serializeGenesis(s), 'utf8'), key, signature)
      );
    } catch {
      return false;
    }
  };
  return Object.freeze({
    verify: (
      intent: Readonly<ExecutionIntent>,
      evidence: Readonly<ExecutionEvidence>,
    ) => check(intent, evidence, false),
    verifyHistorical: (
      intent: Readonly<ExecutionIntent>,
      evidence: Readonly<ExecutionEvidence>,
    ) => check(intent, evidence, true),
    verifySnapshot: (
      intent: Readonly<SnapshotWriteIntent>,
      evidence: Readonly<ExecutionEvidence>,
    ) => check(intent, evidence, false),
  });
}
