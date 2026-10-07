import { partnerDeclarationSchema } from '@lammb/schema/eligibility';
import { collection } from './config';

// Synthetic declarations only. These do not name or enroll real communities.
export const developmentPartnerDeclarations = Object.freeze([
  partnerDeclarationSchema.parse({
    version: '1',
    environment: 'DEVELOPMENT_ONLY',
    accessGroup: 'PARTNER_GTD',
    partnerId: 'dev-schema-example',
    displayName: 'Development declaration example',
    projectIdentifier: 'urn:lammb:development:partner-example',
    chain: { name: collection.chainName, chainId: collection.chainId },
    eligibilitySourceType: 'PROJECT_DECLARATION',
    snapshot: { status: 'UNRESOLVED' },
    status: 'PROPOSED',
  }),
]);
