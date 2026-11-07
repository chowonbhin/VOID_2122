// Onboarding answers → initial region familiarity and the payload sent to the backend.
import type { Content } from '../../data/content';
import { levelFromDistinctVisits } from '../../domain/policy';
import { isRecommendationCandidate } from '../../domain/placeEligibility';
import type { OnboardingAnswers, Residence } from '../../domain/types';

/** Visitors and residents of under 6 months skip Q2/Q3 and start as 초심자. */
export const isBeginner = (residence: Residence) => residence === 'visitor' || residence === 'under_6m';

/**
 * Same thresholds as real visits (1–2 places → Lv.1, 3+ → Lv.2), so self-reported knowledge and
 * recorded visits mean the same Lv. A visited 동네 alone counts as Lv.1. Creates no Visit records.
 */
export function initialLevelsFrom(answers: OnboardingAnswers, data: Content): Record<string, 0 | 1 | 2> {
  return Object.fromEntries(data.regions.map(region => {
    const known = data.places.filter(place => place.regionId === region.id && isRecommendationCandidate(place)
      && answers.visitedPlaceIds.includes(place.id)).length;
    const dongVisited = region.adminCode ? answers.visitedDongCodes.includes(region.adminCode) : false;
    return [region.id, Math.max(levelFromDistinctVisits(known), dongVisited ? 1 : 0) as 0 | 1 | 2];
  }));
}

export interface OnboardingPayload extends OnboardingAnswers {
  version: 1;
  beginner: boolean;
  initialLevels: Record<string, 0 | 1 | 2>;
}

export function buildOnboardingPayload(answers: OnboardingAnswers, data: Content): OnboardingPayload {
  return { version: 1, ...answers, beginner: isBeginner(answers.residence), initialLevels: initialLevelsFrom(answers, data) };
}
