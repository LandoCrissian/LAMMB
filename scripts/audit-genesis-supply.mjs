// Deterministic inventory of retired supply references, including the baseline.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { format, resolveConfig } from 'prettier';

const baseline = 'c3d5618bc1712043e506e81ca54e35a41194a1a0';
const output = 'docs/launch-recovery/supply-inventory.json';
const { values } = parseArgs({ options: { check: { type: 'boolean' } } });
const reference = /(?<![\w.])(?:5,280|5280)(?![\w.])/;
const eligible = (name) =>
  /\.(?:md|json|tsx?|mjs|ya?ml)$/.test(name) &&
  name !== 'package-lock.json' &&
  name !== output;
const rows = new Map();
function capture(path, text, version) {
  const lines = text
    .split(/\r?\n/)
    .flatMap((line, i) => (reference.test(line) ? [i + 1] : []));
  if (!lines.length) return;
  const row = rows.get(path) ?? { path, baselineLines: [], currentLines: [] };
  row[version + 'Lines'] = lines;
  rows.set(path, row);
}
const oldNames = execFileSync(
  'git',
  ['ls-tree', '-r', '--name-only', baseline],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n')
  .filter(eligible);
for (const name of oldNames) {
  capture(
    name,
    execFileSync('git', ['show', `${baseline}:${name}`], {
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    }),
    'baseline',
  );
}
const names = [
  ...new Set(
    execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
      { encoding: 'utf8' },
    )
      .split('\0')
      .filter(eligible),
  ),
].sort();
const heritageWebPaths = new Set([
  'apps/web/src/config/site.ts',
  'apps/web/src/app/ascent/page.tsx',
  'apps/web/src/app/faq/page.tsx',
  'apps/web/src/app/development/launch/page.tsx',
]);
for (const name of names) {
  const raw = await readFile(name, 'utf8');
  capture(name, raw, 'current');
  if (name.startsWith('apps/web/src/') && reference.test(raw)) {
    assert(
      heritageWebPaths.has(name),
      `Unreviewed live-site 5280 reference: ${name}`,
    );
    assert(
      !/5280 (?:LAMMBs|stories|catastrophically)|5280 SEALED|5280 \/ SEALED/.test(
        raw,
      ),
      `Retired supply claim: ${name}`,
    );
  }
}
function disposition(row) {
  if (!row.currentLines.length) return 'CORRECTED_OR_REMOVED';
  const p = row.path;
  if (p.startsWith('apps/web/public/'))
    return 'PRESERVED_SOURCE_ART_STENCIL_OR_PROVENANCE';
  if (p.startsWith('apps/web/src/') || p.startsWith('packages/collection/'))
    return 'HERITAGE_ALTITUDE_OR_RETIREMENT_EXPLANATION';
  if (p.startsWith('tests/'))
    return 'HISTORICAL_ASSERTION_HERITAGE_OR_REJECTION_TEST';
  if (p.startsWith('packages/art-generator/'))
    return 'ARCHIVED_DEVELOPMENT_PROTOCOL_OR_EAR_TAG_TRAIT';
  if (
    p.startsWith('docs/launch-recovery/') ||
    p.startsWith('packages/contracts/')
  )
    return 'RECOVERY_REVIEW_OR_SPECIFICATION';
  if (p.startsWith('scripts/')) return 'HERITAGE_GUARD_OR_INVENTORY_TOOL';
  return 'DOCUMENTED_HERITAGE_OR_HISTORICAL_REPORT';
}
const files = [...rows.values()]
  .sort((a, b) => a.path.localeCompare(b.path, 'en'))
  .map((row) => ({ ...row, disposition: disposition(row) }));
const report = {
  baseline,
  scope:
    'All tracked and nonignored source/docs/schema/test text, excluding dependency lockfile and this generated inventory. Binary assets are covered by provenance and visual review; numeric substrings inside hashes/decimal coordinates are excluded.',
  policy:
    'Current Genesis mint cap is 720. Remaining 5280 references are heritage, retired development evidence, negative tests or explicit migration explanations. Archived byte-pinned JSON/frequencies are preserved and cannot authorize production.',
  baselineFilesScanned: oldNames.length,
  currentFilesScanned: names.length,
  files,
};
const formatted = await format(JSON.stringify(report), {
  ...(await resolveConfig(output)),
  parser: 'json',
});
if (values.check)
  assert.equal(
    await readFile(output, 'utf8'),
    formatted,
    'Supply inventory is stale; run node scripts/audit-genesis-supply.mjs',
  );
else {
  await mkdir('docs/launch-recovery', { recursive: true });
  await writeFile(output, formatted);
}
console.log(
  JSON.stringify({
    result: 'PASS',
    inventory: output,
    filesWithReferences: files.length,
    correctedFiles: files.filter(
      (f) => f.disposition === 'CORRECTED_OR_REMOVED',
    ).length,
  }),
);
