// Offline encoding only. Generation uses the built-in Codex ImageGen tool.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const manifestPath = 'apps/web/public/art/chamber-entry/provenance.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
for (const asset of manifest.assets) {
  const source = await readFile(asset.native.path);
  const native = await sharp(source).metadata();
  assert.equal(native.format, 'png');
  assert.equal(digest(source), asset.native.sha256, 'Source master changed');
  assert.equal(native.width, asset.native.width);
  assert.equal(native.height, asset.native.height);
  const bytes = await sharp(source)
    .resize({ width: 1440, withoutEnlargement: true })
    .webp({ quality: 84, effort: 5 })
    .toBuffer();
  const output = await sharp(bytes).metadata();
  await writeFile(`apps/web/public${asset.path}`, bytes);
  Object.assign(asset, {
    width: output.width,
    height: output.height,
    bytes: bytes.length,
    sha256: digest(bytes),
  });
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  JSON.stringify(
    manifest.assets.map(({ id, width, height, bytes, sha256 }) => ({
      id,
      width,
      height,
      bytes,
      sha256,
    })),
  ),
);
