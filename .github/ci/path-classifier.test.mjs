import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';

// Execute the actual workflow body, not a second implementation of its policy.
const root = fileURLToPath(new URL('../../', import.meta.url));
const workflow = readFileSync(
  join(root, '.github/workflows/ci.yml'),
  'utf8',
).replaceAll('\r\n', '\n');
const scopeStep = workflow
  .split('      - name: Determine browser acceptance scope (fail closed)\n')[1]
  ?.split('\n  verify:')[0];
const body = scopeStep
  ?.split('        run: |\n')[1]
  ?.split('\n')
  .map((line) => line.replace(/^ {10}/, ''))
  .join('\n');

/** @param {string[]} args @param {string} cwd */
function git(args, cwd) {
  const result = spawnSync(
    'git',
    ['-c', 'core.hooksPath=', '-c', 'commit.gpgSign=false', ...args],
    { cwd, encoding: 'utf8', windowsHide: true, timeout: 5000 },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function bashExecutable() {
  if (process.platform !== 'win32') return 'bash';
  const located = spawnSync('where.exe', ['git.exe'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  for (const executable of located.stdout.split(/\r?\n/).filter(Boolean)) {
    for (const name of ['bash.exe', 'sh.exe']) {
      const candidate = resolve(dirname(executable), '../usr/bin', name);
      if (existsSync(candidate)) return candidate;
    }
  }
  throw new Error(
    'Existing Git for Windows Bash is required for CI policy tests',
  );
}

const initial = {
  'packages/art-generator/src/engine.ts': 'inert logical source\n',
  'packages/art-generator/fixtures/stage17-asset-registry.json': '{}\n',
  'packages/art-generator/package.json': '{"name":"inert-generator"}\n',
  'packages/art-generator/package-lock.json': '{}\n',
  'packages/art-generator/fixtures/nested/package.json': '{}\n',
  'packages/art-generator/fixtures/nested/pnpm-lock.yaml':
    'lockfileVersion: 9\n',
  'packages/art-generator/tsconfig.json': '{}\n',
  'docs/art-production/PROOF.md': 'inert proof\n',
  'docs/trait-bible/README.md': 'inert collection docs\n',
  'tests/asset-registry.test.ts': 'inert registry test\n',
  'apps/web/app/page.tsx': 'inert website source, requires browser coverage\n',
  'apps/web/components/chamber/game.tsx':
    'inert chamber source, requires browser coverage\n',
  'packages/collection/src/index.ts': 'inert shared source\n',
  'package.json': '{"name":"inert-root"}\n',
  'package-lock.json': '{}\n',
  '.github/workflows/ci.yml': 'inert workflow\n',
};

/**
 * @typedef {object} Scenario
 * @property {string} name
 * @property {boolean} [required]
 * @property {string[]} [edits]
 * @property {string} [remove]
 * @property {[string, string]} [rename]
 * @property {string} [event]
 * @property {string} [base]
 * @property {boolean} [error]
 */

// The original 23 review scenarios, including the actual seven-file PR17 scope.
/** @type {Scenario[]} */
const original = [
  {
    name: 'NFT source edit',
    edits: ['packages/art-generator/src/engine.ts'],
    required: false,
  },
  {
    name: 'NFT documentation',
    edits: ['docs/art-production/PROOF.md'],
    required: false,
  },
  {
    name: 'NFT approved test',
    edits: ['tests/asset-registry.test.ts'],
    required: false,
  },
  { name: 'website source', edits: ['apps/web/app/page.tsx'], required: true },
  {
    name: 'Chamber source',
    edits: ['apps/web/components/chamber/game.tsx'],
    required: true,
  },
  {
    name: 'shared collection source',
    edits: ['packages/collection/src/index.ts'],
    required: true,
  },
  { name: 'root dependency manifest', edits: ['package.json'], required: true },
  {
    name: 'workspace dependency manifest',
    edits: ['packages/art-generator/package.json'],
    required: true,
  },
  {
    name: 'workspace lockfile',
    edits: ['packages/art-generator/package-lock.json'],
    required: true,
  },
  {
    name: 'workflow change',
    edits: ['.github/workflows/ci.yml'],
    required: true,
  },
  { name: 'unknown path', edits: ['unclassified/file.txt'], required: true },
  {
    name: 'mixed NFT and website',
    edits: ['packages/art-generator/src/engine.ts', 'apps/web/app/page.tsx'],
    required: true,
  },
  {
    name: 'rename website into NFT',
    rename: ['apps/web/app/page.tsx', 'packages/art-generator/src/moved.ts'],
    required: true,
  },
  {
    name: 'rename Chamber into NFT docs',
    rename: [
      'apps/web/components/chamber/game.tsx',
      'docs/art-production/moved.md',
    ],
    required: true,
  },
  {
    name: 'rename NFT into website',
    rename: ['packages/art-generator/src/engine.ts', 'apps/web/moved.ts'],
    required: true,
  },
  { name: 'website deletion', remove: 'apps/web/app/page.tsx', required: true },
  {
    name: 'workspace dependency deletion',
    remove: 'packages/art-generator/package.json',
    required: true,
  },
  {
    name: 'main push with NFT source',
    event: 'push',
    edits: ['packages/art-generator/src/engine.ts'],
    required: true,
  },
  { name: 'empty PR diff', required: true },
  {
    name: 'missing base',
    base: '',
    edits: ['packages/art-generator/src/engine.ts'],
    required: true,
  },
  {
    name: 'unavailable base object',
    base: '0'.repeat(40),
    edits: ['packages/art-generator/src/engine.ts'],
    error: true,
  },
  {
    name: 'PR17 seven-file scope',
    edits: [
      'docs/art-production/STAGE17_ASSET_REGISTRATION.md',
      'packages/art-generator/fixtures/stage17-asset-registry.json',
      'packages/art-generator/src/asset-registry.ts',
      'packages/art-generator/src/png-ingestion.ts',
      'packages/art-generator/src/png-proof-schema.ts',
      'packages/art-generator/tooling/stage17-asset-proof.ts',
      'tests/asset-registry.test.ts',
    ],
    required: false,
  },
  {
    name: 'PR18 workflow scope',
    edits: ['.github/workflows/ci.yml'],
    required: true,
  },
];

/** @type {Scenario[]} */
const additional = [
  {
    name: 'case-insensitive nested dependency manifest on Windows',
    edits: ['packages/art-generator/fixtures/deeper/Package.json'],
    required: true,
  },
  {
    name: 'case-insensitive nested shrinkwrap on Windows',
    edits: ['packages/art-generator/fixtures/deeper/Npm-shrinkwrap.json'],
    required: true,
  },
  {
    name: 'NFT source addition',
    edits: ['packages/art-generator/src/new.ts'],
    required: false,
  },
  {
    name: 'NFT source deletion',
    remove: 'packages/art-generator/src/engine.ts',
    required: false,
  },
  {
    name: 'NFT-only rename',
    rename: [
      'packages/art-generator/src/engine.ts',
      'packages/art-generator/src/renamed.ts',
    ],
    required: false,
  },
  { name: 'root lockfile', edits: ['package-lock.json'], required: true },
  {
    name: 'root lockfile deletion',
    remove: 'package-lock.json',
    required: true,
  },
  {
    name: 'nested manifest deletion',
    remove: 'packages/art-generator/fixtures/nested/package.json',
    required: true,
  },
  {
    name: 'nested lockfile deletion',
    remove: 'packages/art-generator/fixtures/nested/pnpm-lock.yaml',
    required: true,
  },
  {
    name: 'dependency renamed into NFT source',
    rename: [
      'packages/art-generator/package.json',
      'packages/art-generator/src/former-manifest.ts',
    ],
    required: true,
  },
  {
    name: 'Chamber renamed into NFT source',
    rename: [
      'apps/web/components/chamber/game.tsx',
      'packages/art-generator/src/moved-chamber.ts',
    ],
    required: true,
  },
  {
    name: 'NFT build configuration',
    edits: ['packages/art-generator/tsconfig.json'],
    required: true,
  },
  {
    name: 'unknown file inside NFT workspace',
    edits: ['packages/art-generator/unclassified.bin'],
    required: true,
  },
  {
    name: 'unknown file inside NFT docs',
    edits: ['docs/art-production/unclassified.sh'],
    required: true,
  },
  {
    name: 'public artwork changes',
    edits: ['apps/web/public/art/new.png'],
    required: true,
  },
  {
    name: 'shared root tooling',
    edits: ['scripts/write-build-info.mjs'],
    required: true,
  },
  {
    name: 'NFT trait-bible docs',
    edits: ['docs/trait-bible/README.md'],
    required: false,
  },
  { name: 'unclassified test', edits: ['tests/new.test.ts'], required: true },
  {
    name: 'NFT fixture addition',
    edits: ['packages/art-generator/fixtures/new.json'],
    required: false,
  },
  {
    name: 'NFT source path containing spaces',
    edits: ['packages/art-generator/src/with spaces.ts'],
    required: false,
  },
  {
    name: 'website path containing spaces',
    edits: ['apps/web/with spaces.ts'],
    required: true,
  },
  {
    name: 'main push with missing base',
    event: 'push',
    base: '',
    required: true,
  },
  {
    name: 'unknown event',
    event: 'workflow_dispatch',
    edits: ['packages/art-generator/src/engine.ts'],
    required: true,
  },
  {
    name: 'malformed base',
    base: 'not-a-commit',
    edits: ['packages/art-generator/src/engine.ts'],
    error: true,
  },
  {
    name: 'option-shaped base',
    base: '--output=anything',
    edits: ['packages/art-generator/src/engine.ts'],
    error: true,
  },
  {
    name: 'mutable base ref',
    base: 'HEAD',
    edits: ['packages/art-generator/src/engine.ts'],
    error: true,
  },
  ...[
    'package.json',
    'package-lock.json',
    'npm-shrinkwrap.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'bun.lock',
    'bun.lockb',
    '.npmrc',
    '.yarnrc',
    '.yarnrc.yml',
    'pnpm-workspace.yaml',
  ].map((name) => ({
    name: `deep nested dependency/configuration: ${name}`,
    edits: [`packages/art-generator/fixtures/deeper/child/${name}`],
    required: true,
  })),
];

let temporaryRoot = '';
let script = '';
let bash = '';
let sequence = 0;
/** @param {string} directory @param {string} path @param {string} contents */
function write(directory, path, contents) {
  const target = join(directory, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

before(() => {
  assert.ok(body);
  temporaryRoot = mkdtempSync(join(tmpdir(), 'lammb-ci-policy-'));
  script = join(temporaryRoot, 'workflow-classifier.sh');
  writeFileSync(script, `${body}\n`);
  bash = bashExecutable();
});

after(() => {
  if (!temporaryRoot) return;
  const target = resolve(temporaryRoot);
  const inside = relative(resolve(tmpdir()), target);
  if (
    !inside ||
    isAbsolute(inside) ||
    inside.startsWith('..') ||
    !inside.startsWith('lammb-ci-policy-')
  )
    throw new Error('Unsafe fixture cleanup path');
  rmSync(target, { recursive: true, force: true });
});

/** @param {Scenario} scenario */
function check(scenario) {
  const directory = join(temporaryRoot, String(++sequence));
  mkdirSync(directory);
  git(['-c', 'init.templateDir=', 'init', '--quiet'], directory);
  git(['config', 'user.name', 'LAMMB inert policy fixture'], directory);
  git(['config', 'user.email', 'fixture@artwork.invalid'], directory);
  git(['config', 'diff.renames', 'true'], directory);
  for (const [path, contents] of Object.entries(initial))
    write(directory, path, contents);
  git(['add', '.'], directory);
  git(['commit', '--quiet', '--no-gpg-sign', '-m', 'inert base'], directory);
  const base = git(['rev-parse', 'HEAD'], directory);
  for (const path of scenario.edits ?? [])
    write(directory, path, 'changed inert fixture\n');
  if (scenario.remove) unlinkSync(join(directory, scenario.remove));
  if (scenario.rename) {
    const [from, to] = scenario.rename;
    mkdirSync(dirname(join(directory, to)), { recursive: true });
    renameSync(join(directory, from), join(directory, to));
  }
  git(['add', '-A'], directory);
  git(
    ['commit', '--quiet', '--allow-empty', '--no-gpg-sign', '-m', 'inert head'],
    directory,
  );
  if (scenario.rename)
    assert.match(
      git(['diff', '--name-status', '--find-renames', base, 'HEAD'], directory),
      /^R100\s/m,
    );
  const output = join(directory, 'github-output');
  const result = spawnSync(bash, [script], {
    cwd: directory,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5000,
    env: {
      ...process.env,
      EVENT_NAME: scenario.event ?? 'pull_request',
      BASE_SHA: scenario.base ?? base,
      RUNNER_TEMP: directory,
      GITHUB_OUTPUT: output,
    },
  });
  assert.equal(result.error, undefined);
  if (scenario.error) {
    assert.notEqual(result.status, 0);
    assert.ok(
      !(existsSync(output) ? readFileSync(output, 'utf8') : '').includes(
        'browser_required=false',
      ),
    );
  } else {
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      readFileSync(output, 'utf8').trim(),
      `browser_required=${scenario.required}`,
    );
  }
}

describe('path-aware CI policy: original 23 scenarios', () => {
  for (const scenario of original) it(scenario.name, () => check(scenario));
});
describe('path-aware CI policy: adversarial additions', () => {
  for (const scenario of additional) it(scenario.name, () => check(scenario));
});

it('keeps core verification unconditional and browser jobs dependent on successful classification and verification', () => {
  const verify = workflow
    .split('\n  verify:\n')[1]
    ?.split('\n  browser-acceptance:')[0];
  assert.ok(verify);
  assert.doesNotMatch(verify, /^    (?:if|needs):/m);
  for (const command of [
    'npm ci',
    'npm run format:check',
    'npm run lint',
    'npm run typecheck',
    'npm test',
    'npm run build',
  ])
    assert.ok(
      verify
        .split('\n')
        .map((line) => line.trim())
        .includes(`run: ${command}`),
    );
  const browsers = workflow.split('\n  browser-acceptance:\n')[1];
  assert.ok(browsers.includes('needs: [classify, verify]'));
  assert.ok(
    browsers.includes("if: needs.classify.outputs.browser_required == 'true'"),
  );
  assert.ok(browsers.includes('browser: [msedge, chrome]'));
  assert.ok(workflow.includes('branches: [main, codex/task-001-bootstrap]'));
  assert.ok(
    workflow
      .split('\n  classify:\n')[1]
      .split('\n  verify:\n')[0]
      .includes('run: node --test .github/ci/path-classifier.test.mjs'),
  );
});
