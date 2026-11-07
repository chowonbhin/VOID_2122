import { describe, expect, it } from 'vitest';
import { content } from '../../data/content';
import { buildOnboardingPayload, initialLevelsFrom, isBeginner } from './onboardingScore';

const answers = (visitedDongCodes: string[], visitedPlaceIds: string[]) => ({
  residence: 'over_2y' as const, homeDongCode: '3109261', visitedDongCodes, visitedPlaceIds, completedAt: '2026-11-08T02:00:00+09:00',
});

describe('onboarding → initial familiarity', () => {
  it('treats visitors and residents under 6 months as beginners', () => {
    expect(isBeginner('visitor')).toBe(true);
    expect(isBeginner('under_6m')).toBe(true);
    expect(isBeginner('6m_2y')).toBe(false);
    expect(isBeginner('over_2y')).toBe(false);
  });

  it('starts every region at Lv.0 with no answers', () => {
    expect(initialLevelsFrom(answers([], []), content)).toEqual({ 'region-a': 0, 'region-b': 0 });
  });

  it('a visited 동네 alone gives Lv.1 to the exploration area drawn on it', () => {
    expect(initialLevelsFrom(answers(['3109263'], []), content)).toEqual({ 'region-a': 0, 'region-b': 1 });
  });

  it('known places use the shared visit thresholds: 1–2 → Lv.1, 3+ → Lv.2', () => {
    expect(initialLevelsFrom(answers([], ['a1']), content)['region-a']).toBe(1);
    expect(initialLevelsFrom(answers([], ['a1', 'a2', 'a3']), content)['region-a']).toBe(2);
  });

  it('ignores franchise and unknown place ids', () => {
    expect(initialLevelsFrom(answers([], ['a6-franchise', 'nope']), content)['region-a']).toBe(0);
  });

  it('builds a backend payload that carries answers and the derived levels', () => {
    const payload = buildOnboardingPayload(answers(['3109263'], ['a1']), content);
    expect(payload).toMatchObject({ version: 1, residence: 'over_2y', beginner: false, homeDongCode: '3109261',
      visitedDongCodes: ['3109263'], visitedPlaceIds: ['a1'], initialLevels: { 'region-a': 1, 'region-b': 1 } });
  });
});
