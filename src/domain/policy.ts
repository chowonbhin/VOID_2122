// Every tunable number lives here (mvp_implementation_plan.md §5). Owner: Byeunghee02.
// "선택된 정책" values come from the guidelines; the rest are proposals the team may change here only.

export const TIME_ZONE = 'Asia/Seoul';

/** 선택된 정책: distinct visited places 0 → Lv0, 1~2 → Lv1, 3+ → Lv2. */
export function levelFromDistinctVisits(distinctPlaces: number): 0 | 1 | 2 {
  if (distinctPlaces >= 3) return 2;
  if (distinctPlaces >= 1) return 1;
  return 0;
}

/** 선택된 정책: novelty multiplier by region Lv 0/1/2. */
export const NOVELTY: Record<0 | 1 | 2, number> = { 0: 1.2, 1: 1.1, 2: 1.0 };

/** 제안: extra place Lv when the place itself has a visit record. */
export const PLACE_VISIT_DELTA = 1;
export const MAX_PLACE_LEVEL = 3;

/** 제안: popularity penalty strength w by place Lv 0/1/2/3. */
export const POPULARITY_WEIGHT: Record<0 | 1 | 2 | 3, number> = { 0: 0, 1: 10, 2: 20, 3: 30 };

/** 제안: only the largest matching, not-yet-experienced event bonus counts, capped. */
export const EVENT_BONUS_CAP = 10;

/** 기획 §8.4: α = -f(regionLv) * F. Initial tuning values, not measured coefficients. */
export const FOOTFALL_PENALTY: Record<0 | 1 | 2, number> = { 0: 0, 1: 10, 2: 20 };

/** 제안: W = 1 / (1 + d / DISTANCE_SCALE_KM). Max-distance filter applies first. */
export const DISTANCE_SCALE_KM = 20;

export const DEFAULT_MAX_DISTANCE_KM = 10;

export const CATEGORY_LABELS = {
  nature: '자연·산책',
  culture: '문화·전시',
  food: '음식',
  market: '시장·골목',
  activity: '체험·활동',
} as const;

export const LEVEL_LABELS: Record<0 | 1 | 2, string> = {
  0: '신규',
  1: '방문 경험 적음',
  2: '익숙함',
};
