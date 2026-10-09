// Offline authoring only. Runtime serves the committed JPEGs without rendering.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { format, resolveConfig } from 'prettier';

const publicRoot = path.resolve('apps/web/public');
const output = path.join(publicRoot, 'social');
const sourceOutput = path.resolve('artifacts/generated/task-010s/compositions');
await mkdir(output, { recursive: true });
await mkdir(sourceOutput, { recursive: true });
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const inventory = [];
async function source(relative, manifestPath, id) {
  const bytes = await readFile(path.join(publicRoot, relative));
  const manifest = JSON.parse(
    await readFile(path.join(publicRoot, manifestPath)),
  );
  const expected = manifest.assets.find((asset) => asset.id === id);
  assert.equal(digest(bytes), expected.sha256, `Source changed: ${relative}`);
  const dimensions = await sharp(bytes).metadata();
  assert.equal(dimensions.width, expected.width);
  assert.equal(dimensions.height, expected.height);
  inventory.push({
    path: '/' + relative,
    sha256: expected.sha256,
    width: expected.width,
    height: expected.height,
    provenance: '/' + manifestPath,
    approval: expected.approval,
  });
  // librsvg's embedded-image decoder is not guaranteed to support WebP.
  // Decode losslessly to PNG for composition; preserve native pixels and alpha.
  const png = await sharp(bytes).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}
const front = await source(
  'art/cinematic-preview/front.webp',
  'art/cinematic-preview/provenance.json',
  'front',
);
const side = await source(
  'art/cinematic-preview/side.webp',
  'art/cinematic-preview/provenance.json',
  'side',
);
const wordmark = await source(
  'art/cinematic-preview/wordmark.webp',
  'art/cinematic-preview/provenance.json',
  'wordmark',
);
const facility = await source(
  'art/labs-preview/facility.webp',
  'art/labs-preview/provenance.json',
  'facility',
);
const mapBytes = await readFile(
  path.join(publicRoot, 'maps/countries-v1.json'),
);
const mapManifest = JSON.parse(
  await readFile(path.join(publicRoot, 'maps/provenance.json')),
);
assert.equal(digest(mapBytes), mapManifest.output.sha256);
const map = JSON.parse(mapBytes);
inventory.push({
  path: '/maps/countries-v1.json',
  sha256: digest(mapBytes),
  provenance: '/maps/provenance.json',
  license: 'Natural Earth public domain; ISO metadata MIT; d3-geo ISC',
});
const escape = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;');
const text = (
  x,
  y,
  value,
  size = 22,
  color = '#F4F5EB',
  weight = 400,
  spacing = 0,
) =>
  `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}" fill="${color}">${escape(value)}</text>`;
const mono = (x, y, value, color = '#A9B4A3', size = 16) =>
  `<text x="${x}" y="${y}" font-family="Courier New, monospace" font-size="${size}" letter-spacing="2" fill="${color}">${escape(value)}</text>`;
const accent = '#CCFF00';
const image = (uri, x, y, width, height) =>
  `<image href="${uri}" x="${x}" y="${y}" width="${width}" height="${height}"/>`;
const common = (
  scene,
  label,
  route,
  code,
) => `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="spot"><stop stop-color="#344323"/><stop offset="1" stop-color="#080B09"/></radialGradient>
    <linearGradient id="shade"><stop stop-color="#080B09"/><stop offset=".45" stop-color="#080B09" stop-opacity=".95"/><stop offset="1" stop-color="#080B09" stop-opacity="0"/></linearGradient>
    <linearGradient id="floor" x2="0" y2="1"><stop stop-color="#080B09" stop-opacity="0"/><stop offset="1" stop-color="#080B09"/></linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#CCFF00" stroke-opacity=".06"/></pattern>
  </defs>
  <rect width="1200" height="630" fill="#080B09"/>
  ${scene}
  <rect x="24" y="24" width="1152" height="582" rx="2" fill="none" stroke="#748066" stroke-opacity=".3"/>
  <path d="M24 80V24H80 M1120 606H1176V550" fill="none" stroke="${accent}" stroke-width="3"/>
  ${mono(68, 80, label, accent)}
  ${mono(1040, 80, code)}
  <path d="M68 546H1132" stroke="#748066" stroke-opacity=".45"/>
  ${text(68, 583, 'lammb.fun', 21, '#F4F5EB', 700)}
  ${mono(240, 582, route)}
  ${mono(895, 582, '5280 / SEALED', accent)}
</svg>`;

const cards = [
  {
    id: 'home',
    route: '/',
    sources: [inventory[0], inventory[2]],
    composition:
      'Sealed front specimen with the existing LAMMB graffiti identity; studio spotlight and precision type.',
    svg: common(
      `<ellipse cx="930" cy="290" rx="380" ry="320" fill="url(#spot)"/><rect x="650" width="550" height="546" fill="url(#grid)"/>
      ${image(front, 735, 25, 355, 533)}
      ${image(wordmark, 58, 140, 485, 202)}
      ${text(68, 397, 'SEALED. FOR NOW.', 53, '#F4F5EB', 900, -2)}
      ${text(70, 447, 'One species. Infinite personalities.', 24)}
      ${mono(70, 494, 'HIGHER TOGETHER.', accent, 18)}`,
      'LAMMB / ONE SPECIES. INFINITE PERSONALITIES.',
      '/',
      '01 / 04',
    ),
  },
  {
    id: 'universe',
    route: '/universe',
    sources: [inventory[3]],
    composition:
      'Existing empty classified laboratory with original typographic dossier and redaction treatment; fictional leaked research.',
    svg: common(
      `${image(facility, 0, -140, 1200, 800)}<rect width="1050" height="546" fill="url(#shade)"/><rect y="430" width="1200" height="116" fill="url(#floor)"/>
      ${text(68, 217, 'CLASSIFIED.', 72, '#F4F5EB', 900, -3)}
      ${text(68, 295, 'BADLY.', 72, accent, 900, -3)}
      ${text(70, 351, 'Eleven seconds of success.', 24)}
      ${text(70, 388, 'An entire facility of consequences.', 24)}
      <path d="M70 429H300 M70 444H210" stroke="#75806C" stroke-width="7" stroke-opacity=".55"/>
      ${mono(70, 487, 'LEAKED RESEARCH / FICTION', accent, 18)}`,
      'LAMMB LABS / THE CLASSIFIED UNIVERSE',
      '/universe',
      '02 / 04',
    ),
  },
  {
    id: 'world',
    route: '/world',
    sources: [inventory[4]],
    composition:
      'Actual Equal Earth country geometry rasterized natively, with no invented participants, activity pins or registry totals.',
    svg: common(
      `<ellipse cx="900" cy="310" rx="480" ry="320" fill="url(#spot)"/><rect width="1200" height="546" fill="url(#grid)"/>
      <g transform="translate(354 125) scale(.81)"><path d="${map.outline}" fill="#0D160F" stroke="#829268" stroke-width="1.2"/>
      <path d="${map.graticule}" fill="none" stroke="#CCFF00" stroke-opacity=".16" stroke-width=".6"/>
      ${[...map.countries, ...map.exceptions]
        .filter((item) => item.path)
        .map(
          (item) =>
            `<path d="${item.path}" fill="#394C22" stroke="#CCFF00" stroke-opacity=".7" stroke-width=".5"/>`,
        )
        .join('')}</g>
      <rect width="780" height="546" fill="url(#shade)"/>
      ${text(68, 215, 'ONE WORLD.', 63, '#F4F5EB', 900, -3)}
      ${text(68, 286, 'MANY', 63, accent, 900, -3)}
      ${text(68, 357, 'MINDSETS.', 63, accent, 900, -3)}
      ${mono(70, 429, 'GLOBAL NFT ATLAS', accent, 18)}
      ${text(70, 478, 'Explore now. Register later.', 24)}`,
      'LAMMB WORLD / FIND YOUR PLACE',
      '/world',
      '03 / 04',
    ),
  },
  {
    id: 'collection',
    route: '/collection',
    sources: [inventory[1]],
    composition:
      'Existing unrevealed side specimen in an industrial evidence frame; 5280 collection supply without a comma.',
    svg: common(
      `<ellipse cx="925" cy="285" rx="330" ry="310" fill="url(#spot)"/><rect x="700" y="108" width="411" height="404" fill="url(#grid)" stroke="#687A50" stroke-opacity=".5"/>
      ${image(side, 740, 45, 337, 505)}
      ${text(68, 246, '5280', 132, accent, 900, -5)}
      ${text(70, 319, 'EVERY STORY', 51, '#F4F5EB', 900, -2)}
      ${text(68, 397, 'SEALED.', 76, '#F4F5EB', 900, -3)}
      ${text(70, 454, 'Sealed first. Revealed later.', 24)}
      ${mono(70, 496, 'THE COLLECTION / UNREVEALED', accent, 17)}`,
      'LAMMB / THE COLLECTION',
      '/collection',
      '04 / 04',
    ),
  },
];
const assets = [];
for (const card of cards) {
  const filename = `${card.id}-v1.jpg`;
  await writeFile(path.join(sourceOutput, `${card.id}.svg`), card.svg);
  const bytes = await sharp(Buffer.from(card.svg))
    .flatten({ background: '#080B09' })
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toBuffer();
  const decoded = await sharp(bytes).metadata();
  assert.equal(decoded.width, 1200);
  assert.equal(decoded.height, 630);
  await writeFile(path.join(output, filename), bytes);
  assets.push({
    id: card.id,
    route: card.route,
    path: `/social/${filename}`,
    width: 1200,
    height: 630,
    format: 'jpeg',
    mime: 'image/jpeg',
    bytes: bytes.length,
    sha256: digest(bytes),
    composition: card.composition,
    sources: card.sources,
  });
}
await writeFile(
  path.join(output, 'provenance.json'),
  await format(
    JSON.stringify(
      {
        version: 'lammb-social/1',
        authorization: 'OWNER_TASK_010S_CINEMATIC_SOCIAL_SHARING',
        approval: 'TASK_010S_COMPOSITIONS_PENDING_OWNER_VISUAL_REVIEW',
        productionNFTArtworkApproved: false,
        creation:
          'Original code-native graphic compositions; existing owner-authorized website art and real atlas geometry. No new scene generation, no source repaint, no enlargement of raster sources.',
        recipe: 'scripts/prepare-social-cards.mjs',
        tool: `sharp ${sharp.versions.sharp} / librsvg`,
        typography:
          'Arial / Courier New; preview encoding authored on Windows. Font rasterization can vary across operating systems; committed JPEGs are the runtime source of truth.',
        palette: { background: '#080B09', accent: '#CCFF00', type: '#F4F5EB' },
        assets,
      },
      null,
      2,
    ),
    {
      ...(await resolveConfig(path.join(output, 'provenance.json'))),
      parser: 'json',
    },
  ),
);
console.log(
  JSON.stringify(
    assets.map(({ id, path, width, height, bytes, sha256 }) => ({
      id,
      path,
      width,
      height,
      bytes,
      sha256,
    })),
    null,
    2,
  ),
);
