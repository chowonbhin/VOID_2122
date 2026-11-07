import { describe, expect, it } from 'vitest';
import { content } from '../../data/content';
import { buildOnboardingPayload, initialLevelsFrom, isBeginner } from './onboardingScore';

const JUNGANG = 'dong-4127353200'; // 중앙동: places a1–a5 (+ a6-franchise)
const WONGOK = 'dong-4127354500'; // 원곡동
const answers = (visitedDongCodes: string[], visitedPlaceIds: string[]) => ({
  residence: 'over_2y' as const, homeDongCode: '4127353200', visitedDongCodes, visitedPlaceIds, completedAt: '2026-11-08T02:00:00+09:00',
});

describe('onboarding → initial familiarity', () => {
  it('treats visitors and residents under 6 months as beginners', () => {
    expect(isBeginner('visitor')).toBe(true);
    expect(isBeginner('under_6m')).toBe(true);
    expect(isBeginner('6m_2y')).toBe(false);
    expect(isBeginner('over_2y')).toBe(false);
  });

  it('starts every 동네 at Lv.0 with no answers', () => {
    const levels = initialLevelsFrom(answers([], []), content);
    expect(Object.keys(levels)).toHaveLength(content.regions.length);
    expect(Object.values(levels).every(level => level === 0)).toBe(true);
  });

  it('a visited 동네 alone gives that 동네 Lv.1', () => {
    const levels = initialLevelsFrom(answers(['4127354500'], []), content);
    expect(levels[WONGOK]).toBe(1);
    expect(levels[JUNGANG]).toBe(0);
  });

  it('known places use the shared visit thresholds: 1–2 → Lv.1, 3+ → Lv.2', () => {
    expect(initialLevelsFrom(answers([], ['a1']), content)[JUNGANG]).toBe(1);
    expect(initialLevelsFrom(answers([], ['a1', 'a2', 'a3']), content)[JUNGANG]).toBe(2);
  });

  it('ignores franchise and unknown place ids', () => {
    expect(initialLevelsFrom(answers([], ['a6-franchise', 'nope']), content)[JUNGANG]).toBe(0);
  });

  it('builds a backend payload that carries answers and the derived levels', () => {
    const payload = buildOnboardingPayload(answers(['4127354500'], ['a1']), content);
    expect(payload).toMatchObject({ version: 1, residence: 'over_2y', beginner: false, homeDongCode: '4127353200',
      visitedDongCodes: ['4127354500'], visitedPlaceIds: ['a1'] });
    expect(payload.initialLevels[JUNGANG]).toBe(1);
    expect(payload.initialLevels[WONGOK]).toBe(1);
  });
});
