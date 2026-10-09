import { collection } from '@lammb/collection/config';
import { FutureExperience } from '../../components/future-experience';
import { FactStrip } from '../../components/site-primitives';
import { socialMetadata } from '../../config/social';
export const metadata = socialMetadata('collection', {
  path: '/mint',
  title: 'Mint Information / LAMMB',
  description:
    'Free primary mint, network gas applies. The Vault is sealed. Minting is currently unavailable.',
});
export default function Mint() {
  return (
    <>
      <FutureExperience kind="mint">
        <p className="body-copy">
          Primary mint price: 0 ETH. Network gas still applies.{' '}
          {collection.chainName} only, chain ID {collection.chainId}.
        </p>
        <ul className="editorial-list">
          <li>Mint is unavailable. No launch date is announced here.</li>
          <li>
            No wallet connection, eligibility decision or transaction can be
            made on this page.
          </li>
          <li>
            {collection.marketplaceTarget} is the marketplace target; an
            official collection link is pending.
          </li>
        </ul>
        <p className="body-copy">
          The future verified mint experience must respect the approved launch
          state and access rules. Your specimen starts sealed.
        </p>
      </FutureExperience>
      <FactStrip />
    </>
  );
}
