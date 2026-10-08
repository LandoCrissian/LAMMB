import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  atlasChainSchema,
  collectionSchema,
  countryCodeSchema,
  filterParticipation,
  participationViewSchema,
  tokenIdSchema,
} from '@lammb/schema/atlas';
import type { AtlasCollection, ParticipationView } from '@lammb/schema/atlas';
import {
  atlasCollections,
  countries,
  readAtlasFragment,
  registry,
  searchCountries,
} from '../apps/web/src/config/atlas';
import {
  constrainView,
  focusShape,
  initialView,
  pinchView,
  zoomAt,
} from '../apps/web/src/components/atlas-geometry';
import type { AtlasData } from '../apps/web/src/components/atlas-geometry';
import provenance from '../apps/web/public/maps/provenance.json';

const bytes = readFileSync('apps/web/public/maps/countries-v1.json');
const geometry = JSON.parse(bytes.toString()) as AtlasData;
const admitted = (id: string): AtlasCollection => ({
  id,
  name: id,
  role: 'COMMUNITY',
  admission: 'ADMITTED',
  contract: {
    chainId: 4663,
    address: '0x1111111111111111111111111111111111111111',
    standard: 'ERC721',
    verification: 'VERIFIED',
    evidenceRevision: 'TEST_FIXTURE_ONLY_NOT_LIVE',
  },
});

describe('versioned real geography and navigation', () => {
  it('verifies output bytes, all ISO coverage and truthful missing geometry', () => {
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      provenance.output.sha256,
    );
    expect(countries).toHaveLength(249);
    expect(new Set(countries.map((c) => c.code)).size).toBe(249);
    expect(geometry.countries).toHaveLength(248);
    expect(
      countries.filter((c) => !c.boundaryAvailable).map((c) => c.code),
    ).toEqual(['UM']);
    for (const country of countries)
      expect(countryCodeSchema.parse(country.code)).toBe(country.code);
    expect(countryCodeSchema.safeParse('XK').success).toBe(false);
    for (const shape of geometry.countries) {
      expect(
        countries.find((c) => c.code === shape.code)?.boundaryAvailable,
      ).toBe(true);
      expect(shape.path).toMatch(/^M/);
      expect(shape.bounds.every(Number.isFinite)).toBe(true);
      expect(shape.sourceFeatureIds.length).toBeGreaterThan(0);
    }
    expect(geometry.exceptions).toHaveLength(4);
  });
  it('retains islands, microstates and antimeridian pieces without assigning unofficial ISO codes', () => {
    for (const code of [
      'VA',
      'MC',
      'SG',
      'FJ',
      'KI',
      'NZ',
      'GI',
      'BV',
      'TW',
      'PS',
    ])
      expect(
        geometry.countries.find((c) => c.code === code)?.path.length,
      ).toBeGreaterThan(0);
    const fiji = geometry.countries.find((c) => c.code === 'FJ')!;
    expect(fiji.path.match(/M/g)!.length).toBeGreaterThan(1);
    expect(geometry.exceptions.map((area) => area.name)).toContain('Kosovo');
  });
  it('searches names, aliases and ISO codes and rejects unrecognized deep links', () => {
    expect(searchCountries('USA').map((c) => c.code)).toContain('US');
    expect(searchCountries('Cote').map((c) => c.code)).toContain('CI');
    expect(searchCountries('Vatican').map((c) => c.code)).toContain('VA');
    expect(searchCountries('unfindable country')).toEqual([]);
    expect(readAtlasFragment('#country=FJ&community=lammb')).toMatchObject({
      country: { code: 'FJ' },
      collection: 'lammb',
    });
    expect(readAtlasFragment('#country=XK&community=cats-on-drugs')).toEqual({
      country: null,
      collection: 'all',
    });
  });
});
describe('pan, anchored zoom and pinch mathematics', () => {
  it('keeps zoom bounded and pans inside the world frame', () => {
    expect(constrainView({ k: 100, x: 200, y: -90000 })).toEqual({
      k: 48,
      x: 0,
      y: -24440,
    });
    expect(constrainView({ k: 0.5, x: -100, y: 100 })).toEqual(initialView);
    const zoom = zoomAt(initialView, 2, { x: 300, y: 200 });
    expect(zoom).toEqual({ k: 2, x: -300, y: -200 });
  });
  it('uses two real touch positions and midpoint translation instead of a fake pinch', () => {
    expect(
      pinchView(
        initialView,
        [
          { x: 400, y: 260 },
          { x: 600, y: 260 },
        ],
        [
          { x: 320, y: 280 },
          { x: 720, y: 280 },
        ],
      ),
    ).toEqual({ k: 2, x: -480, y: -240 });
    const shape = geometry.countries.find((c) => c.code === 'VA')!;
    const focused = focusShape(shape);
    expect(focused.k).toBe(48);
    expect(focused.x).toBeLessThan(0);
  });
});
describe('collection admission, privacy and transfer boundaries', () => {
  it('keeps founding/candidate concepts contract-free and the live view unavailable', () => {
    expect(
      atlasChainSchema.safeParse({ id: 1, name: 'Robinhood Chain' }).success,
    ).toBe(false);
    expect(
      atlasCollections.filter((c) => c.admission === 'CANDIDATE'),
    ).toHaveLength(5);
    for (const collection of atlasCollections) {
      expect(collectionSchema.safeParse(collection).success).toBe(true);
      expect(collection.contract).toBeNull();
    }
    expect(
      collectionSchema.safeParse({ ...admitted('test'), contract: null })
        .success,
    ).toBe(false);
    expect(
      participationViewSchema.safeParse({
        authority: 'UNAVAILABLE',
        status: 'REGISTRY_NOT_YET_LIVE',
        records: [],
      }).success,
    ).toBe(false);
    expect(
      filterParticipation(registry, atlasCollections, 'US', {
        kind: 'ALL_COMMUNITIES',
      }),
    ).toBe(registry);
  });
  it('filters fixture data by admitted collection, selected country, active ownership status and opt-in visibility', () => {
    const record = {
      recordId: 'test-1',
      collectionId: 'test-a',
      tokenId: '1',
      countryCode: 'US',
      status: 'ACTIVE' as const,
      publicDisplay: true,
      quantity: '1',
    };
    const fixture: ParticipationView = {
      authority: 'DEVELOPMENT_FIXTURE',
      fixtureId: 'atlas-unit-test',
      records: [
        record,
        { ...record, recordId: 'test-2', collectionId: 'test-b' },
        { ...record, recordId: 'test-3', countryCode: 'JP' },
        { ...record, recordId: 'test-4', status: 'TRANSFER_STALE' },
        { ...record, recordId: 'test-5', publicDisplay: false },
        { ...record, recordId: 'test-6', collectionId: 'pixel-hood' },
      ],
    };
    expect(participationViewSchema.safeParse(fixture).success).toBe(true);
    const collections = [
      ...atlasCollections,
      admitted('test-a'),
      admitted('test-b'),
    ];
    const all = filterParticipation(fixture, collections, 'US', {
      kind: 'ALL_COMMUNITIES',
    });
    expect(
      all.authority === 'DEVELOPMENT_FIXTURE' &&
        all.records.map((r) => r.recordId),
    ).toEqual(['test-1', 'test-2']);
    const one = filterParticipation(fixture, collections, 'US', {
      kind: 'COLLECTION',
      collectionId: 'test-b',
    });
    expect(
      one.authority === 'DEVELOPMENT_FIXTURE' &&
        one.records.map((r) => r.recordId),
    ).toEqual(['test-2']);
  });
  it('preserves uint256 IDs exactly and rejects invalid/noncanonical token identifiers', () => {
    expect(tokenIdSchema.parse((2n ** 256n - 1n).toString())).toBe(
      (2n ** 256n - 1n).toString(),
    );
    for (const value of [(2n ** 256n).toString(), '01', '-1', '1e10', '2.5'])
      expect(tokenIdSchema.safeParse(value).success).toBe(false);
  });
});
