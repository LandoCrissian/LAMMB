import { expect, it, vi } from 'vitest';
vi.mock('node:os', () => ({ freemem: () => 4095 * 1048576 }));
import { runGenesisReadiness } from '../packages/art-generator/tooling/genesis-readiness';

it('refuses private input I/O and output creation below the 4096 MiB start gate', async () => {
  await expect(
    runGenesisReadiness({
      task070Root: 'must-not-be-read',
      geometryRoot: 'must-not-be-read',
      sourceRoot: 'must-not-be-read',
      outputRoot: 'must-not-be-created',
      selectionSha256: '0'.repeat(64),
      approvalSha256: '0'.repeat(64),
      geometryIndexSha256: '0'.repeat(64),
    }),
  ).rejects.toThrow('RAM_START');
});
