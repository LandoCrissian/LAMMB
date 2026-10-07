import { z } from 'zod';
import { publicReferenceSchema, publicTextSchema } from './public-reference';

// Algorithm references are descriptive boundaries, not approved algorithms.
export const cryptographicDigestSchema = z.strictObject({
  algorithmRef: publicTextSchema,
  encoding: z.literal('hex'),
  value: z.string().regex(/^(?:[a-f0-9]{2}){1,512}$/),
});

const commitmentSlotSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('NOT_PUBLISHED') }),
  z.strictObject({
    status: z.literal('PUBLISHED'),
    digest: cryptographicDigestSchema,
    publishedAt: z.iso.datetime(),
    publicationReference: publicReferenceSchema,
  }),
]);

const verificationMaterialSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('UNAVAILABLE') }),
  z.strictObject({
    status: z.literal('PUBLISHED'),
    protocolSpecificationReference: publicReferenceSchema,
    materialReferences: z.array(publicReferenceSchema).min(1).max(100),
  }),
]);

const verificationSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('NOT_RUN') }),
  z.strictObject({
    status: z.literal('UNVERIFIABLE'),
    reason: publicTextSchema,
  }),
  z.strictObject({
    status: z.literal('FAILED'),
    reportReference: publicReferenceSchema,
    reason: publicTextSchema,
  }),
  z.strictObject({
    // A recorded verifier assertion; schema parsing does not verify cryptography.
    status: z.literal('REPORTED_VERIFIED'),
    verifierReference: publicReferenceSchema,
    reportReference: publicReferenceSchema,
    verifiedAt: z.iso.datetime(),
  }),
]);

export const fairnessCommitmentSchema = z
  .strictObject({
    version: z.literal('1'),
    recordId: publicTextSchema,
    dataAuthority: z.literal('DEVELOPMENT_FIXTURE'),
    protocolStatus: z.literal('UNAPPROVED'),
    collectionInputCommitment: commitmentSlotSchema,
    artCatalogCommitment: commitmentSlotSchema,
    assignmentCommitment: commitmentSlotSchema,
    revealVerificationMaterial: verificationMaterialSchema,
    verification: verificationSchema,
  })
  .superRefine((record, context) => {
    if (
      record.verification.status === 'REPORTED_VERIFIED' &&
      (record.revealVerificationMaterial.status !== 'PUBLISHED' ||
        record.collectionInputCommitment.status !== 'PUBLISHED' ||
        record.artCatalogCommitment.status !== 'PUBLISHED' ||
        record.assignmentCommitment.status !== 'PUBLISHED')
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'A verifier assertion requires commitments and protocol material',
      });
    }
  });

export type FairnessCommitment = z.infer<typeof fairnessCommitmentSchema>;
