import { collection } from './config';

export interface NetworkConfig {
  readonly chainId: number;
  readonly name: string;
  readonly environment: 'mainnet';
  readonly nativeCurrency: {
    readonly name: string;
    readonly symbol: string;
    readonly decimals: number;
  };
}

// Descriptive configuration only: no provider, RPC URL, signer, or transactions.
export const robinhoodChain = Object.freeze({
  chainId: collection.chainId,
  name: collection.chainName,
  environment: 'mainnet',
  nativeCurrency: Object.freeze({ name: 'Ether', symbol: 'ETH', decimals: 18 }),
} satisfies NetworkConfig);
