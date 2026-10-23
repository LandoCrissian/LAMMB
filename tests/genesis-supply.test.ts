import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collection } from '@lammb/collection/config';
import { ascentMilestones, recoveryMilestones } from '@lammb/collection/launch';
import { socialDestinations } from '../apps/web/src/config/social';
import { genesisOutputCountSchema } from '../packages/art-generator/src/engine-schema';
import { validateInputs } from '../packages/art-generator/src/inputs';

describe('Genesis migration versus archived development', () => {
  it('keeps the 720 cap independent of Mile High altitude', () => {
    expect(collection.supply).toBe(720);
    expect(ascentMilestones.value.map((m) => m.altitudeFt)).toEqual([
      0, 2640, 5279, 5280,
    ]);
    expect(recoveryMilestones).toEqual([0, 360, 719, 720]);
    for (const key of ['home', 'collection'] as const) {
      expect(socialDestinations[key].description).toContain('720 LAMMBs');
      expect(socialDestinations[key].description).not.toContain('5280');
    }
  });

  it.each([0, 719, 721, 5280, 1.5])(
    'rejects production construction count %s before artwork processing',
    (outputCount) => {
      expect(genesisOutputCountSchema.safeParse(outputCount).success).toBe(
        false,
      );
      const fixture = (name: string) =>
        JSON.parse(
          readFileSync(
            new URL(
              `../packages/art-generator/fixtures/${name}`,
              import.meta.url,
            ),
            'utf8',
          ),
        );
      expect(() =>
        validateInputs(
          { ...fixture('stress-catalog.json'), purpose: 'PRODUCTION' },
          {},
          { ...fixture('stress-request.json'), outputCount },
          new Map(),
        ),
      ).toThrow();
    },
  );

  it('requires exactly 720 for production; archive replay does not redefine it', () => {
    expect(genesisOutputCountSchema.parse(720)).toBe(720);
  });
});
