# Future contracts boundary

Genesis 720 remains **BLOCKED** for contract implementation and verification. See the [mint implementation and safe-environment test specification](genesis-mint.spec.md) prepared for issue #34. No deployment or wallet transaction is authorized by that specification.

Reserved for future EVM collection contracts, contract-specific tests, and deployment configuration after independent design review. Task 001 contains no contract code, compiler, ABI, wallet SDK, deployment scripts, or dependencies here.

The Robinhood Chain mainnet chain ID comes from `@lammb/collection/config`. Contract standard, mint authorization, supply enforcement, allocation, metadata commitment, reveal authority, and upgrade policy remain unresolved. Never add secrets or transact on mainnet as part of this bootstrap.
