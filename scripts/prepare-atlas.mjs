// Deterministic build-time projection. No map engine or source fetch in the browser.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import {
  geoArea,
  geoEqualEarth,
  geoPath,
  geoContains,
  geoGraticule10,
} from 'd3-geo';

const revision = 'f1890d9f152c896d250a77557a5751a93d494776';
const sources = [
  {
    file: 'ne_50m_admin_0_map_units.geojson',
    url: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${revision}/geojson/ne_50m_admin_0_map_units.geojson`,
    sha256: 'b8d421aca6e9e08e8cdf09cc26af111cc3e0deba4fe915611d58ade71e8a4db0',
    license: 'Public domain',
    version: 'Natural Earth v5.1.2',
  },
  {
    file: 'ne_10m_admin_0_map_units.geojson',
    url: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${revision}/geojson/ne_10m_admin_0_map_units.geojson`,
    sha256: '57da82be755f4afccd8f3b14251bb2752f5df1395f47d2d86f817470c4a48862',
    license: 'Public domain',
    version: 'Natural Earth v5.1.2',
  },
  {
    file: 'iso-codes.json',
    url: 'https://raw.githubusercontent.com/michaelwittig/node-i18n-iso-countries/v7.14.0/codes.json',
    sha256: '736d7666e943e0bca25c518e3903e2b328ce54b94662553a6472c379dbfb50aa',
    license: 'MIT',
    version: 'i18n-iso-countries v7.14.0',
  },
  {
    file: 'iso-names-en.json',
    url: 'https://raw.githubusercontent.com/michaelwittig/node-i18n-iso-countries/v7.14.0/langs/en.json',
    sha256: '7445185d6424e574027a7cd14029e000784eaa03a2b83ab097742079f701e702',
    license: 'MIT',
    version: 'i18n-iso-countries v7.14.0',
  },
];
const cache = 'artifacts/generated/task-008/sources';
await mkdir(cache, { recursive: true });
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const inputs = [];
for (const source of sources) {
  let bytes;
  try {
    bytes = await readFile(`${cache}/${source.file}`);
  } catch {
    const response = await fetch(source.url);
    assert(response.ok, `Source unavailable: ${source.file}`);
    bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(`${cache}/${source.file}`, bytes);
  }
  if (source.sha256)
    assert.equal(digest(bytes), source.sha256, 'Source digest mismatch');
  source.sha256 = digest(bytes);
  source.bytes = bytes.length;
  inputs.push(JSON.parse(bytes));
}
const [medium, detailed, isoCodes, names] = inputs;
const codes = isoCodes.filter(([code]) => code !== 'XK');
assert.equal(codes.length, 249);
const codeSet = new Set(codes.map(([code]) => code));
const groups = new Map();
const exceptions = [];
for (const feature of medium.features) {
  const code = feature.properties.ISO_A2_EH;
  if (!codeSet.has(code)) {
    exceptions.push(feature);
    continue;
  }
  groups.set(code, [...(groups.get(code) || []), feature]);
}
for (const code of ['GI', 'BV']) {
  assert(!groups.has(code));
  groups.set(
    code,
    detailed.features.filter((f) => f.properties.ISO_A2_EH === code),
  );
}
const projection = geoEqualEarth().fitExtent(
  [
    [12, 12],
    [988, 508],
  ],
  { type: 'Sphere' },
);
const path = geoPath(projection).digits(3);
function polygons(feature) {
  const geometry = feature.geometry;
  return geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.coordinates;
}
function orient(coordinates) {
  const poly = { type: 'Polygon', coordinates };
  // D3 uses clockwise exterior rings. Keep holes, reverse only winding if required.
  return geoArea(poly) > Math.PI * 2
    ? coordinates.map((ring) => [...ring].reverse())
    : coordinates;
}
function project(features) {
  const all = features.flatMap(polygons).map(orient);
  const geometry = { type: 'MultiPolygon', coordinates: all };
  const primary = {
    type: 'Polygon',
    coordinates: all.toSorted(
      (a, b) =>
        geoArea({ type: 'Polygon', coordinates: b }) -
        geoArea({ type: 'Polygon', coordinates: a }),
    )[0],
  };
  const bounds = path
    .bounds(primary)
    .flat()
    .map((n) => Number(n.toFixed(3)));
  return {
    path: path(geometry),
    bounds,
    sourceFeatureIds: features.map((f) => f.properties.NE_ID),
  };
}
const countries = codes
  .map(([code, alpha3, numeric]) => {
    const aliases = Array.isArray(names.countries[code])
      ? names.countries[code]
      : [names.countries[code]];
    return {
      code,
      alpha3,
      numeric,
      name: aliases[0],
      aliases,
      boundaryAvailable: groups.has(code),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));
const atlas = {
  version: 'lammb-atlas-1',
  width: 1000,
  height: 520,
  projection: 'Equal Earth',
  outline: path({ type: 'Sphere' }),
  graticule: path(geoGraticule10()),
  countries: countries
    .filter((c) => c.boundaryAvailable)
    .map((c) => ({ code: c.code, ...project(groups.get(c.code)) })),
  exceptions: exceptions.map((f) => ({
    name: f.properties.NAME_EN,
    ...project([f]),
  })),
  acceptancePoints: Object.entries({
    US: [-100, 40],
    BR: [-52, -12],
    FJ: [178, -17.8],
    NZ: [175, -41],
    JP: [138, 36],
    VA: [12.453, 41.903],
    GI: [-5.345, 36.14],
  }).map(([code, point]) => ({
    code,
    lonLat: point,
    xy: projection(point).map((n) => Number(n.toFixed(3))),
    contains: geoContains(
      { type: 'FeatureCollection', features: groups.get(code) },
      point,
    ),
  })),
};
assert.equal(atlas.countries.length, 248);
assert(atlas.countries.every((c) => c.path && c.bounds.every(Number.isFinite)));
await mkdir('apps/web/public/maps', { recursive: true });
await mkdir('apps/web/src/data', { recursive: true });
await mkdir('packages/schema/src/data', { recursive: true });
await writeFile(
  'packages/schema/src/data/country-codes.json',
  JSON.stringify(
    codes.map(([code]) => code),
    null,
    2,
  ) + '\n',
);
const geometryBytes = Buffer.from(JSON.stringify(atlas));
await writeFile('apps/web/public/maps/countries-v1.json', geometryBytes);
await writeFile(
  'apps/web/src/data/countries.json',
  JSON.stringify(countries, null, 2) + '\n',
);
await writeFile(
  'apps/web/public/maps/provenance.json',
  JSON.stringify(
    {
      version: atlas.version,
      sources,
      projection: atlas.projection,
      engine: 'd3-geo 3.1.1 / ISC / build-time only',
      output: {
        file: 'countries-v1.json',
        sha256: digest(geometryBytes),
        bytes: geometryBytes.length,
        gzipBytes: gzipSync(geometryBytes).length,
      },
      isoEntries: countries.length,
      polygonCountries: atlas.countries.length,
      nonIsoAreas: atlas.exceptions.map((e) => e.name),
      missingGeometry: countries
        .filter((c) => !c.boundaryAvailable)
        .map((c) => c.code),
      derivation:
        'ISO_A2_EH map units grouped by ISO code; GI and BV supplemented from 10m; original vertices projected, not hand drawn. Largest component bounds used only for focus. Default de facto boundaries. Country names/aliases from versioned ISO metadata; XK excluded from ISO list.',
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify({
    countries: countries.length,
    polygons: atlas.countries.length,
    bytes: geometryBytes.length,
    gzipBytes: gzipSync(geometryBytes).length,
    exceptions: atlas.exceptions.map((e) => e.name),
    points: atlas.acceptancePoints,
  }),
);
