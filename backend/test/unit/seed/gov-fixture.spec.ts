import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FACTOR_KEYS } from '../../../src/problems/priority/priority.engine';

/**
 * Guards the extracted fixture against silent drift. If apps/web's gov fixtures
 * change, `npm run fixtures:extract` must be re-run and these numbers updated
 * deliberately — the whole point of seeding from the fixtures is that the
 * database shows officers the same figures the screens were reviewed against.
 */
const fixture = JSON.parse(
  readFileSync(resolve(__dirname, '../../../prisma/seed/fixtures/gov.json'), 'utf8'),
) as Record<string, unknown[]> & { defaultWeights: Record<string, number> };

describe('gov fixture', () => {
  it('carries the reviewed record counts', () => {
    expect(fixture.jurisdictions).toHaveLength(6);
    expect(fixture.villages).toHaveLength(8);
    expect(fixture.departments).toHaveLength(5);
    expect(fixture.officers).toHaveLength(5);
    expect(fixture.govUsers).toHaveLength(3);
    expect(fixture.sponsors).toHaveLength(5);
    expect(fixture.problems).toHaveLength(12);
    expect(fixture.reports).toHaveLength(96);
    expect(fixture.automations).toHaveLength(13);
  });

  it('default priority weights sum to 100 (the published state weighting)', () => {
    const sum = Object.values(fixture.defaultWeights).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  it('every problem carries exactly the factors the engine reads', () => {
    // Read from the engine rather than re-typed here: this test exists to
    // catch the fixture drifting from the algorithm, and a hardcoded list
    // drifts from both at once.
    const keys = [...FACTOR_KEYS];
    for (const p of fixture.problems as { id: string; factors: Record<string, number> }[]) {
      expect(Object.keys(p.factors).sort()).toEqual(keys.sort());
    }
  });

  it('every problem references a real jurisdiction and department', () => {
    const jids = new Set((fixture.jurisdictions as { id: string }[]).map((j) => j.id));
    const dids = new Set((fixture.departments as { id: string }[]).map((d) => d.id));
    for (const p of fixture.problems as { jurisdictionId: string; departmentId: string }[]) {
      expect(jids.has(p.jurisdictionId)).toBe(true);
      expect(dids.has(p.departmentId)).toBe(true);
    }
  });
});
