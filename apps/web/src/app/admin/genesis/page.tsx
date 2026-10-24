import { GenesisAdmin } from '../../../components/genesis-registration';
import '../../mint/genesis.css';
export const metadata = {
  title: 'Private Genesis administration',
  robots: { index: false, follow: false, noarchive: true },
};
export default function AdminGenesis() {
  return <GenesisAdmin />;
}
