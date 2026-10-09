import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
// Public deployment evidence, never environment values or credentials.
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
await writeFile(
  'apps/web/public/build-info.json',
  JSON.stringify(
    {
      schema: 'lammb-build/1',
      commit: git('rev-parse', 'HEAD'),
      dirty: Boolean(git('status', '--porcelain')),
      securityPolicy: 'public-preview-v1',
    },
    null,
    2,
  ) + '\n',
);
