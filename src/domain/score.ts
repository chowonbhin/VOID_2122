// Scoring engine (M03 운영 판정, M04 Lv·점수·정렬). Owner: Byeunghee02.
// Pure functions: same input → same output. Screens call these and never re-implement the math.
//
//   regionLevel = max(initialLevel, levelFromDistinctVisitedPlaces)
//   placeLevel  = min(3, regionLevel + (visited ? 1 : 0))
//   placeScore  = max(0, B - w[placeLevel] * P) + E
//   regionBase = sum(top20) / (20 * maxPlaceScore) * 100
//   regionScore = regionBase * (1 - footfallRate) * (novelty / maxNovelty) * distanceWeight
import type { Content } from '../data/content';
import type { Event, LatLng, Place, PlaceStatus, Profile, Region, RegionRecommendation, SearchContext, TimeRange, Visit } from './types';
import {
  DISTANCE_SCALE_KM,
  EVENT_BONUS_CAP,
  MAX_PLACE_LEVEL,
  NOVELTY,
  PLACE_VISIT_DELTA,
  POPULARITY_WEIGHT,
  REGION_PLACE_LIMIT,
  PLACE_SCORE_MAX,
  REGION_SCORE_MAX,
  MAX_NOVELTY,
  UNKNOWN_POPULARITY_PENALTY,
  levelFromDistinctVisits,
} from './policy';
import { footfallAdjustment } from './footfall';
import { franchiseStatus, isRecommendationCandidate, isRealSearchPlace } from './placeEligibility';
import { placePopularity, type PopularityResult } from './popularity';

// ---------- time (selected time is always Asia/Seoul) ----------

interface KstTime {
  date: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  minutes: number;
  epochMs: number;
}

/** Parses 'YYYY-MM-DDTHH:MM' as Asia/Seoul, independent of the browser time zone. */
export function parseKst(when: string): KstTime {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(when);
  if (!m) throw new Error(`bad time: ${when}`);
  const [, y, mo, d, h, mi] = m.map(Number);
  return {
    date: when.slice(0, 10),
    dayOfWeek: new Date(Date.UTC(y, mo - 1, d)).getUTCDay() as KstTime['dayOfWeek'],
    minutes: h * 60 + mi,
    epochMs: Date.UTC(y, mo - 1, d, h, mi) - 9 * 3600_000,
  };
}

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Range end and last entry are exclusive: close 18:00 → 18:00 is not open. */
function inRange(r: TimeRange, minutes: number): boolean {
  const end = r.lastEntry ? Math.min(toMinutes(r.close), toMinutes(r.lastEntry)) : toMinutes(r.close);
  return toMinutes(r.open) <= minutes && minutes < end;
}

export interface PlaceStatusResult {
  status: PlaceStatus;
  /** Why, for the screen: exception note, entry cutoff, etc. */
  note?: string;
}

/** M03: open / closed / unknown at the selected time. Missing info is never treated as open. */
export function placeStatus(place: Place, when: string): PlaceStatusResult {
  const o = place.opening;
  if (!o || o.status !== 'known' || !o.weekly) return { status: 'unknown', note: '운영정보 미확인' };
  const t = parseKst(when);
  if (o.verifiedPeriod && (t.date < o.verifiedPeriod.from || t.date > o.verifiedPeriod.through)) {
    return { status: 'unknown', note: '운영정보 검토 기간 밖 · 공식 안내 재확인 필요' };
  }
  const exception = o.exceptions?.find((e) => e.date === t.date);
  if (!exception && o.unknownDays?.includes(t.dayOfWeek)) {
    return { status: 'unknown', note: '선택한 요일의 운영정보 미확인' };
  }
  const ranges = exception ? exception.ranges : (o.weekly[t.dayOfWeek] ?? []);
  if (ranges.length === 0) return { status: 'closed', note: exception?.note ?? '휴무일' };
  if (ranges.some((r) => inRange(r, t.minutes))) return { status: 'open', note: exception?.note };
  const afterEntry = ranges.find((r) => r.lastEntry && toMinutes(r.lastEntry) <= t.minutes && t.minutes < toMinutes(r.close));
  return { status: 'closed', note: afterEntry ? `입장·주문 마감 ${afterEntry.lastEntry}` : '운영 시간 아님' };
}

// ---------- events ----------

export type EventState = 'active' | 'cancelled' | 'ended' | 'upcoming' | 'not_now' | 'condition_unknown';

/** Event state at the selected time. Only 'active' can give a bonus. */
export function eventState(event: Event, when: string): EventState {
  if (event.cancelled) return 'cancelled';
  const now = parseKst(when).epochMs;
  const sessions = event.sessions.map((s) => ({ start: Date.parse(s.start), end: Date.parse(s.end) }));
  if (sessions.every((s) => s.end <= now)) return 'ended';
  if (sessions.every((s) => s.start > now)) return 'upcoming';
  if (!sessions.some((s) => s.start <= now && now < s.end)) return 'not_now';
  if (event.condition.status !== 'known') return 'condition_unknown';
  return 'active';
}

const matchesInterest = (categories: string[], interests: string[]) =>
  interests.length === 0 || categories.some((c) => interests.includes(c));

/** E: largest bonus among active, interest-matching, not-yet-experienced events at the place, capped. */
export function eventBonus(placeId: string, events: Event[], ctx: SearchContext, profile: Profile): { bonus: number; event?: Event } {
  let best: Event | undefined;
  for (const e of events) {
    if (e.placeId !== placeId) continue;
    if (eventState(e, ctx.when) !== 'active') continue;
    if (!matchesInterest(e.categories, ctx.interests)) continue;
    if (profile.experiencedEventIds.includes(e.id)) continue;
    if (!best || e.bonus > best.bonus) best = e;
  }
  return best ? { bonus: Math.min(EVENT_BONUS_CAP, best.bonus), event: best } : { bonus: 0 };
}

// ---------- levels ----------

/** Distinct places visited in the region. Repeat visits to one place count once. */
export function distinctVisitedPlaces(regionId: string, visits: Visit[], places: Place[]): string[] {
  const inRegion = new Set(places.filter((p) => p.regionId === regionId && isRecommendationCandidate(p)).map((p) => p.id));
  return [...new Set(visits.map((v) => v.placeId).filter((id) => inRegion.has(id)))];
}

export function regionLevel(regionId: string, profile: Profile, visits: Visit[], places: Place[]): 0 | 1 | 2 {
  const initial = profile.initialLevels[regionId] ?? 0;
  const fromVisits = levelFromDistinctVisits(distinctVisitedPlaces(regionId, visits, places).length);
  return Math.max(initial, fromVisits) as 0 | 1 | 2;
}

export function placeLevel(placeId: string, regionLv: 0 | 1 | 2, visits: Visit[]): 0 | 1 | 2 | 3 {
  const delta = visits.some((v) => v.placeId === placeId) ? PLACE_VISIT_DELTA : 0;
  return Math.min(MAX_PLACE_LEVEL, regionLv + delta) as 0 | 1 | 2 | 3;
}

// ---------- distance ----------

export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
}

export const distanceWeight = (km: number) => 1 / (1 + km / DISTANCE_SCALE_KM);

// ---------- recommendation ----------

export interface PlaceScore {
  placeId: string;
  status: PlaceStatusResult;
  level: 0 | 1 | 2 | 3;
  /** Candidate matches interest and is not confirmed closed; unknown evidence is provisional. */
  eligible: boolean;
  provisional: boolean;
  selected: boolean;
  /** Rank among eligible candidates, including those below 20. */
  rank?: number;
  popularity: PopularityResult;
  score: number;
  event?: Event;
}

export function scorePlaces(region: Region, content: Content, profile: Profile, visits: Visit[], ctx: SearchContext): PlaceScore[] {
  const regionLv = regionLevel(region.id, profile, visits, content.places);
  const scored = content.places
    .filter((p) => p.regionId === region.id && isRecommendationCandidate(p))
    .map((p) => {
      const status = placeStatus(p, ctx.when);
      const level = placeLevel(p.id, regionLv, visits);
      const popularity = placePopularity(p, content.places);
      const provisionalAllowed = isRealSearchPlace(p);
      const eligible = (status.status === 'open' || (status.status === 'unknown' && provisionalAllowed))
        && matchesInterest([p.category], ctx.interests) && (popularity.status !== 'unknown' || provisionalAllowed);
      const provisional = status.status === 'unknown' || popularity.status === 'unknown' || franchiseStatus(p) === 'unknown';
      const { bonus, event } = eventBonus(p.id, content.events, ctx, profile);
      const score = eligible ? Math.max(0, p.baseValue - POPULARITY_WEIGHT[level] * (popularity.value ?? UNKNOWN_POPULARITY_PENALTY)) + bonus : 0;
      return { placeId: p.id, status, level, popularity, eligible, provisional, score, event: eligible ? event : undefined };
    });
  // Rebuild from the complete candidate pool every time, not the previously selected 20.
  // Stable ID tie-break preserves equal-score membership through reloads and source reorder.
  const ranked = scored.filter(place => place.eligible).sort((a, b) =>
    b.score - a.score || Number(a.provisional) - Number(b.provisional) || (a.placeId < b.placeId ? -1 : a.placeId > b.placeId ? 1 : 0));
  const ranks = new Map(ranked.map((place, index) => [place.placeId, index + 1]));
  return scored.map(place => ({ ...place, rank: ranks.get(place.placeId),
    selected: (ranks.get(place.placeId) ?? Infinity) <= REGION_PLACE_LIMIT }));
}

export type ExclusionReason = 'too_far' | 'no_eligible_places' | 'no_data';

export interface RecommendResult {
  /** Sorted best first. */
  recommendations: RegionRecommendation[];
  excluded: { regionId: string; reason: ExclusionReason; distanceKm: number }[];
  /** Every remaining candidate scored 0: show 조건 변경 안내 + 직접 탐색. */
  allZero: boolean;
}

/** Fixed 20-place denominator, independent of other regions or the current result set. */
export function normalizeRegionBase(placeScoreSum: number): number {
  if (!Number.isFinite(placeScoreSum)) return 0;
  return Math.min(REGION_SCORE_MAX, Math.max(0, placeScoreSum) / (REGION_PLACE_LIMIT * PLACE_SCORE_MAX) * REGION_SCORE_MAX);
}

export function recommend(content: Content, profile: Profile, visits: Visit[], ctx: SearchContext): RecommendResult {
  const recommendations: RegionRecommendation[] = [];
  const excluded: RecommendResult['excluded'] = [];

  for (const region of content.regions) {
    const km = distanceKm(ctx.origin, region.start);
    if (!content.places.some((place) => place.regionId === region.id)) {
      excluded.push({ regionId: region.id, reason: 'no_data', distanceKm: km });
      continue;
    }
    if (km > ctx.maxDistanceKm) {
      excluded.push({ regionId: region.id, reason: 'too_far', distanceKm: km });
      continue;
    }
    const places = scorePlaces(region, content, profile, visits, ctx);
    const eligible = places.filter((p) => p.eligible);
    if (eligible.length === 0) {
      excluded.push({ regionId: region.id, reason: 'no_eligible_places', distanceKm: km });
      continue;
    }
    const level = regionLevel(region.id, profile, visits, content.places);
    const selected = places.filter(p => p.selected).sort((a, b) => a.rank! - b.rank!);
    const sum = selected.reduce((s, p) => s + p.score, 0);
    const normalizedBaseScore = normalizeRegionBase(sum);
    const footfall = footfallAdjustment(region, level, content.footfall, normalizedBaseScore);
    const score = Math.max(0, normalizedBaseScore + footfall.adjustment) * (NOVELTY[level] / MAX_NOVELTY) * distanceWeight(km);

    const reasons: string[] = [];
    const visited = distinctVisitedPlaces(region.id, visits, content.places).length;
    if (visited === 0 && level === 0) reasons.push('아직 방문 기록이 없는 행정동이에요');
    else reasons.push(`방문 기록 ${visited}곳 · 지역 Lv.${level}`);
    reasons.push(`조건 충족 후보 ${eligible.length}곳 중 상위 ${selected.length}/${REGION_PLACE_LIMIT}개 합산`);
    for (const p of selected) if (p.event) reasons.push(`진행 중 행사: ${p.event.name}`);

    recommendations.push({
      regionId: region.id,
      score,
      normalizedBaseScore,
      placeScoreSum: sum,
      provisionalPlaceCount: selected.filter(place => place.provisional).length,
      reasons,
      distanceKm: km,
      level,
      placeIds: selected.map((p) => p.placeId),
      eligiblePlaceCount: eligible.length,
      placeLimit: REGION_PLACE_LIMIT,
      shortfallCount: Math.max(0, REGION_PLACE_LIMIT - selected.length),
      openPlaceCount: places.filter((p) => p.status.status === 'open').length,
      unknownPlaceCount: places.filter((p) => p.status.status === 'unknown').length,
      footfall,
    });
  }

  recommendations.sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm || a.regionId.localeCompare(b.regionId));
  return { recommendations, excluded, allZero: recommendations.length > 0 && recommendations.every((r) => r.score === 0) };
}
