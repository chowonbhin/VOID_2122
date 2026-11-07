import { describe, expect, it } from 'vitest';
import { content } from '../../data/content';
import { fixedSadongMemoryPlaces, SADONG_ID } from './sadongMemories';
import type { Place } from '../../domain/types';

describe('Sadong display-only memory examples', () => {
  it('picks two distinct actual Sadong places without mutating content', () => {
    const before = JSON.stringify(content);
    const picked = fixedSadongMemoryPlaces(content.places);
    expect(picked).toHaveLength(2);
    expect(new Set(picked.map(p => p.id)).size).toBe(2);
    expect(picked.every(p => p.regionId === SADONG_ID && !p.isVirtual && p.location && p.searchSource?.url)).toBe(true);
    expect(JSON.stringify(content)).toBe(before);
    expect(fixedSadongMemoryPlaces([...content.places].reverse()).map(p => p.id)).toEqual(picked.map(p => p.id));
    expect(picked.map(p => p.name)).toEqual(['도니스커피', '초지참숯불갈비']);
  });

  it('does not pick other dongs, virtual venues, chains or places without coordinates', () => {
    const valid = fixedSadongMemoryPlaces(content.places)[0];
    const excluded: Place[] = [
      { ...valid, regionId: 'other-dong' },
      { ...valid, isVirtual: true },
      { ...valid, discovery: { category: 'food', excludedReason: 'chain' } },
      { ...valid, location: null },
    ];
    expect(fixedSadongMemoryPlaces(excluded)).toEqual([]);
    expect(fixedSadongMemoryPlaces([valid, ...excluded])).toEqual([valid]);
  });
});
