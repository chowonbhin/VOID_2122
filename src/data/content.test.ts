import { describe, expect, it } from 'vitest';
import { content, placesOfRegion, validateContent } from './content';

describe('content', () => {
  it('has no integrity problems', () => {
    expect(validateContent(content)).toEqual([]);
  });

  it('has two regions with five places each', () => {
    expect(content.regions).toHaveLength(2);
    for (const r of content.regions) expect(placesOfRegion(r.id)).toHaveLength(5);
  });

  it('catches duplicate ids and dangling regionId', () => {
    const bad = { ...content, places: [...content.places, { ...content.places[0], regionId: 'nope' }] };
    const problems = validateContent(bad);
    expect(problems).toContain(`duplicate id: ${content.places[0].id}`);
    expect(problems.some((p) => p.includes('unknown regionId nope'))).toBe(true);
  });
});
