import { describe, expect, it } from 'vitest';
import { content } from '../../data/content';
import { pickSadongMemoryPlaces, SADONG_ID } from './sadongMemories';
import type { Place } from '../../domain/types';

describe('Sadong display-only memory examples', () => {
  it('picks two distinct actual Sadong places without mutating content', () => {
    const before = JSON.stringify(content);
    const picked = pickSadongMemoryPlaces(content.places, [], () => 0);
    expect(picked).toHaveLength(2);
    expect(new Set(picked.map(p => p.id)).size).toBe(2);
    expect(picked.every(p => p.regionId === SADONG_ID && !p.isVirtual && p.location && p.searchSource?.url)).toBe(true);
    expect(JSON.stringify(content)).toBe(before);
    expect(pickSadongMemoryPlaces(content.places, picked.map(p => p.id), () => 0).some(p => picked.includes(p))).toBe(false);
  });

  it('does not pick other dongs, virtual venues, chains or places without coordinates', () => {
    const valid = content.places.find(p => p.regionId === SADONG_ID)!;
    const excluded: Place[] = [
      { ...valid, id: 'other', regionId: 'other-dong' },
      { ...valid, id: 'virtual', isVirtual: true },
      { ...valid, id: 'chain', discovery: { category: 'food', excludedReason: 'chain' } },
      { ...valid, id: 'unlocated', location: null },
    ];
    expect(pickSadongMemoryPlaces(excluded)).toEqual([]);
    expect(pickSadongMemoryPlaces([valid, ...excluded])).toEqual([valid]);
  });
});
