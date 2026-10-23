import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createEd25519ExecutionAuthority } from '../packages/art-generator/src/genesis-authority.ts';
import {
  bytesHash,
  genesisDigest,
  serializeGenesis,
} from '../packages/art-generator/src/genesis-model.ts';
import type { ExecutionIntent } from '../packages/art-generator/src/genesis-registry.ts';

// Ephemeral non-wallet signing keys exist only in test memory. No key is saved.
const keys = generateKeyPairSync('ed25519');
const now = Date.now();
const intent: ExecutionIntent = {
  operation: 'REGISTER',
  selectionSha256: bytesHash('synthetic selection'),
  registrationId: 'synthetic-not-a-record',
  expectedRecordSha256: bytesHash('synthetic record'),
  occurredAt: new Date(now).toISOString(),
};
const policy = {
  authorityId: 'synthetic-test-authority',
  publicKeyPem: keys.publicKey
    .export({ type: 'spki', format: 'pem' })
    .toString(),
  expectedPublicKeySha256: bytesHash(
    keys.publicKey.export({ type: 'spki', format: 'der' }),
  ),
  allowedOperations: ['REGISTER', 'WRITE_REGISTRY'] as const,
  clock: () => now,
};
function grant(overrides: Record<string, unknown> = {}) {
  const statement = {
    schemaVersion: 'lammb-genesis-execution-grant/1',
    authorityId: policy.authorityId,
    operation: intent.operation,
    intentSha256: genesisDigest(intent),
    nonce: randomUUID(),
    issuedAt: new Date(now - 1000).toISOString(),
    expiresAt: new Date(now + 60_000).toISOString(),
    ...overrides,
  };
  const signature = sign(
    null,
    Buffer.from(serializeGenesis(statement)),
    keys.privateKey,
  ).toString('base64');
  return {
    authorityId: policy.authorityId,
    intentSha256: genesisDigest(intent),
    publicAuthorization: serializeGenesis({ statement, signature }),
  };
}
describe('pinned public execution-grant verification without registration', () => {
  it('verifies a request-bound signature without transitioning any record', () => {
    expect(
      createEd25519ExecutionAuthority(policy).verify(intent, grant()),
    ).toBe(true);
  });
  it.each([
    ['expired grant', { expiresAt: new Date(now - 1).toISOString() }],
    ['future-issued grant', { issuedAt: new Date(now + 60_000).toISOString() }],
    [
      'excessive lifetime',
      { expiresAt: new Date(now + 600_000).toISOString() },
    ],
    ['another authority', { authorityId: 'untrusted-operator' }],
    ['another operation', { operation: 'REVOKE_REGISTERED' }],
    ['another intent digest', { intentSha256: bytesHash('different intent') }],
    ['unknown field', { bypass: true }],
  ])('rejects %s', (_, overrides) => {
    expect(
      createEd25519ExecutionAuthority(policy).verify(intent, grant(overrides)),
    ).toBe(false);
  });
  it('rejects a mismatched trusted key pin', () => {
    expect(() =>
      createEd25519ExecutionAuthority({
        ...policy,
        expectedPublicKeySha256: bytesHash('another key'),
      }),
    ).toThrow('AUTHORITY_KEY_PIN');
  });
  it('rejects the same signed grant against a different record or state', () => {
    const verify = createEd25519ExecutionAuthority(policy).verify;
    const g = grant();
    expect(
      verify(
        { ...intent, expectedRecordSha256: bytesHash('changed state') },
        g,
      ),
    ).toBe(false);
    expect(verify({ ...intent, registrationId: 'another-record' }, g)).toBe(
      false,
    );
  });
  it('rejects modified signatures and noncanonical grant serialization', () => {
    const authority = createEd25519ExecutionAuthority(policy),
      g = grant();
    const parsed = JSON.parse(g.publicAuthorization) as { signature: string };
    parsed.signature = Buffer.alloc(64).toString('base64');
    expect(
      authority.verify(intent, {
        ...g,
        publicAuthorization: serializeGenesis(parsed),
      }),
    ).toBe(false);
    expect(
      authority.verify(intent, {
        ...g,
        publicAuthorization: g.publicAuthorization + ' ',
      }),
    ).toBe(false);
  });
  it('can verify historical evidence without granting fresh execution', () => {
    const authority = createEd25519ExecutionAuthority({
      ...policy,
      clock: () => now + 3600_000,
    });
    const g = grant();
    expect(authority.verify(intent, g)).toBe(false);
    expect(authority.verifyHistorical!(intent, g)).toBe(true);
  });
});
