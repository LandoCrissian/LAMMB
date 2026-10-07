import { describe, expect, it } from 'vitest';
import { fairnessCommitmentSchema } from '@lammb/schema/fairness';
import { partnerDeclarationSchema } from '@lammb/schema/eligibility';
import { shareCardSchema } from '@lammb/schema/share-card';
import { developmentPartnerDeclarations } from '../packages/collection/src/development-partners';

// Synthetic validation records. No approved algorithm, partner, token ID or trait.
const commitment = {
  version: '1',
  recordId: 'development-validation-record',
  dataAuthority: 'DEVELOPMENT_FIXTURE',
  protocolStatus: 'UNAPPROVED',
  collectionInputCommitment: { status: 'NOT_PUBLISHED' },
  artCatalogCommitment: { status: 'NOT_PUBLISHED' },
  assignmentCommitment: { status: 'NOT_PUBLISHED' },
  revealVerificationMaterial: { status: 'UNAVAILABLE' },
  verification: { status: 'NOT_RUN' },
};
const published = {
  status: 'PUBLISHED',
  digest: {
    algorithmRef: 'development-digest-boundary',
    encoding: 'hex',
    value: 'ab'.repeat(32),
  },
  publishedAt: '2026-01-01T00:00:00Z',
  publicationReference: 'urn:lammb:development:publication',
};

describe('fairness commitment boundary', () => {
  it('requires an explicit supported version and all three commitment slots', () => {
    expect(fairnessCommitmentSchema.safeParse(commitment).success).toBe(true);
    for (const field of [
      'version',
      'collectionInputCommitment',
      'artCatalogCommitment',
      'assignmentCommitment',
      'verification',
    ]) {
      const incomplete: Record<string, unknown> = { ...commitment };
      delete incomplete[field];
      expect(fairnessCommitmentSchema.safeParse(incomplete).success).toBe(
        false,
      );
    }
    expect(
      fairnessCommitmentSchema.safeParse({ ...commitment, version: '2' })
        .success,
    ).toBe(false);
  });

  it('rejects malformed digests, missing publication evidence and unknown algorithm implementation fields', () => {
    for (const slot of [
      { ...published, digest: { ...published.digest, value: 'xyz' } },
      { ...published, digest: { ...published.digest, value: 'abc' } },
      { ...published, digest: { ...published.digest, algorithmRef: '' } },
      { ...published, publishedAt: undefined },
      { ...published, publicationReference: 'javascript:alert(1)' },
      { ...published, digest: { ...published.digest, prng: 'invented' } },
    ])
      expect(
        fairnessCommitmentSchema.safeParse({
          ...commitment,
          collectionInputCommitment: slot,
        }).success,
      ).toBe(false);
    const record = fairnessCommitmentSchema.parse({
      ...commitment,
      collectionInputCommitment: published,
    });
    expect(record.verification.status).toBe('NOT_RUN');
    expect(record.protocolStatus).toBe('UNAPPROVED');
  });

  it('requires material and commitments before recording an external verification assertion', () => {
    const verification = {
      status: 'REPORTED_VERIFIED',
      verifierReference: 'urn:lammb:development:verifier',
      reportReference: 'urn:lammb:development:report',
      verifiedAt: '2026-01-02T00:00:00Z',
    };
    expect(
      fairnessCommitmentSchema.safeParse({ ...commitment, verification })
        .success,
    ).toBe(false);
    expect(
      fairnessCommitmentSchema.safeParse({
        ...commitment,
        collectionInputCommitment: published,
        artCatalogCommitment: published,
        assignmentCommitment: published,
        revealVerificationMaterial: {
          status: 'PUBLISHED',
          protocolSpecificationReference: 'urn:lammb:development:protocol',
          materialReferences: ['urn:lammb:development:material'],
        },
        verification,
      }).success,
    ).toBe(true);
  });
});

describe('one consolidated partner declaration group', () => {
  it('keeps every example development-only and unresolved for eligibility', () => {
    expect(developmentPartnerDeclarations.length).toBeGreaterThan(0);
    for (const partner of developmentPartnerDeclarations) {
      expect(partnerDeclarationSchema.safeParse(partner).success).toBe(true);
      expect(partner.environment).toBe('DEVELOPMENT_ONLY');
      expect(partner.accessGroup).toBe('PARTNER_GTD');
      expect(partner.partnerId).toMatch(/^dev-/);
      expect(partner.snapshot.status).toBe('UNRESOLVED');
    }
  });

  it.each([
    { environment: 'PRODUCTION' },
    { version: undefined },
    { partnerId: '' },
    { displayName: '' },
    { projectIdentifier: '' },
    { chain: { name: 'Example', chainId: -1 } },
    { accessGroup: 'PARTNER_INDIVIDUAL_STAGE' },
    { walletList: ['private-wallet'] },
    { eligibilitySourceType: 'SNAPSHOT_REFERENCE' },
    { visualAssetReference: 'data:text/html,unsafe' },
  ])('rejects invalid partner declaration %o', (override) => {
    expect(
      partnerDeclarationSchema.safeParse({
        ...developmentPartnerDeclarations[0],
        ...override,
      }).success,
    ).toBe(false);
  });
});

const shareCard = {
  version: '1',
  dataAuthority: {
    kind: 'DEVELOPMENT_FIXTURE',
    fixtureId: 'share-card-schema-test',
  },
  scope: 'PUBLIC_REVEALED',
  tokenIdentifier: 'development-opaque-identifier',
  lammbNameOrNumber: 'Development layout example',
  imageReference: 'urn:lammb:development:image-placeholder',
  selectedPublicTraits: [],
  provenanceReference: 'urn:lammb:development:provenance-placeholder',
};

describe('public share-card boundary', () => {
  it('supports an opaque identifier without imposing token convention or inventing traits', () => {
    expect(shareCardSchema.parse(shareCard).selectedPublicTraits).toEqual([]);
    expect(
      shareCardSchema.safeParse({ ...shareCard, version: undefined }).success,
    ).toBe(false);
    expect(
      shareCardSchema.safeParse({ ...shareCard, scope: 'SEALED' }).success,
    ).toBe(false);
    expect(
      shareCardSchema.safeParse({
        ...shareCard,
        dataAuthority: { kind: 'FUTURE_ONCHAIN', status: 'LIVE' },
      }).success,
    ).toBe(false);
  });

  it('accepts only public optional descriptor fields and rejects internal nested metadata', () => {
    const descriptor = {
      label: 'Development descriptor',
      value: 'Synthetic public value',
    };
    expect(
      shareCardSchema.safeParse({
        ...shareCard,
        mutation: descriptor,
        pixelCorruption: descriptor,
        environment: descriptor,
      }).success,
    ).toBe(true);
    for (const field of ['mutation', 'pixelCorruption', 'environment']) {
      expect(
        shareCardSchema.safeParse({
          ...shareCard,
          [field]: { ...descriptor, seed: 'private' },
        }).success,
      ).toBe(false);
    }
  });

  it.each([
    'seed',
    'generationIndex',
    'recipe',
    'privateMetadata',
    'rarityRank',
    'walletAddress',
    '__proto__',
  ])('rejects unapproved internal field %s', (field) => {
    expect(
      shareCardSchema.safeParse({ ...shareCard, [field]: 'unapproved' })
        .success,
    ).toBe(false);
    expect(
      shareCardSchema.safeParse({
        ...shareCard,
        selectedPublicTraits: [
          {
            label: 'Development test field',
            value: 'Synthetic',
            [field]: 'unapproved',
          },
        ],
      }).success,
    ).toBe(false);
  });

  it.each([
    'javascript:alert(1)',
    'data:image/svg+xml,unsafe',
    'file:///private',
    'https://user:secret@example.test/image',
  ])('rejects unsafe public image reference %s', (reference) => {
    expect(
      shareCardSchema.safeParse({ ...shareCard, imageReference: reference })
        .success,
    ).toBe(false);
  });
});
