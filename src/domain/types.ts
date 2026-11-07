// Shared data contract (mvp_implementation_plan.md §3). Owner: Byeunghee02.
// Change field names only after telling the team: every feature folder reads these.

export type RegionId = string;
export type PlaceId = string;
export type EventId = string;

/** Lv 0 = 신규, 1 = 방문 경험 적음, 2 = 익숙함. Place Lv goes up to 3. */
export type Level = 0 | 1 | 2 | 3;

export type Category = 'nature' | 'culture' | 'food' | 'market' | 'activity';

export interface LatLng {
  lat: number;
  lng: number;
}

/** 'YYYY-MM-DD' in Asia/Seoul. */
export type DateString = string;
/** 'HH:MM' in Asia/Seoul. */
export type TimeString = string;

export interface Source {
  label: string;
  url?: string;
  checkedAt: DateString;
}

/** A single-period snapshot of collected commercial-area daily-average footfall. */
export interface FootfallDataset {
  period: string;
  source: Source;
  sourceAsset: string;
  markets: { id: string; name: string; sourceDong: string; dailyAverage: number }[];
}

export type FootfallAdjustment =
  | { status: 'available'; adjustment: number; normalizedShare: number; dailyAverage: number; referenceTotal: number; period: string; source: Source }
  | { status: 'unavailable'; adjustment: 0; reason: 'unmapped' | 'missing_data' | 'invalid_data' };

export interface Region {
  id: RegionId;
  adminCode?: string;
  district?: '상록구' | '단원구';
  /** WGS84 administrative-dong MultiPolygon, including holes and islands. */
  geometry?: { type: 'MultiPolygon'; coordinates: number[][][][] };
  name: string;
  description: string;
  features: string[];
  start: LatLng & { label: string };
  placeIds: PlaceId[];
  /** Explicit source-market mapping; never inferred from a district name or coordinates. */
  footfallMarketIds?: string[];
  source?: Source;
  startSource?: Source;
  /** App-defined approximate exploration area, not an official boundary. */
  boundary?: LatLng[];
  /** Legacy KOSTAT codes kept only for compatibility; current geometry uses adminCode. */
  dongCodes?: string[];
  /** 개발용 가상 데이터면 true. 화면에 "가상 데이터"로 표시한다. */
  isVirtual: boolean;
}

/** One opening slot on a single day. `close` and `lastEntry` are exclusive. */
export interface TimeRange {
  open: TimeString;
  close: TimeString;
  lastEntry?: TimeString;
}

export interface OpeningInfo {
  /** 'unknown' → 운영정보 미확인: listed but never scored. */
  status: 'known' | 'unknown';
  /** Outside the reviewed period, never infer holiday/temporary opening. */
  verifiedPeriod?: { from: DateString; through: DateString };
  /** Key = day of week in KST, 0 = Sunday. A missing or empty day means closed. */
  weekly?: Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, TimeRange[]>>;
  /** Overrides `weekly` for that date. Empty `ranges` = 휴무. */
  exceptions?: { date: DateString; ranges: TimeRange[]; note?: string }[];
  entryCondition?: string;
}

export interface Place {
  id: PlaceId;
  regionId: RegionId;
  name: string;
  category: Category;
  /** Product classification includes franchise branches and same-brand company-operated chains. */
  franchise: {
    status: 'non_franchise' | 'franchise' | 'unknown';
    /** Independent of opening-hours source. Simulated classifications must say so. */
    source: Source | null;
  };
  location: LatLng | null;
  address?: string;
  regionSource?: Source;
  searchSource?: Source;
  /** 기본 가치 B, 0~100. Not a star rating. */
  baseValue: number;
  /** Legacy simulated P, accepted only for explicitly virtual places. */
  popularity?: number;
  popularityEvidence?: {
    provider: 'naver_place' | 'operator';
    metric: 'visitor_reviews' | 'blog_reviews' | 'visits';
    count: number;
    /** 'cumulative' or YYYY-MM; different periods are never pooled. */
    period: string;
    source: Source;
  };
  opening: OpeningInfo;
  source: Source | null;
  isVirtual: boolean;
}

export interface EventSession {
  /** ISO date-time with offset, e.g. '2026-11-08T10:00+09:00'. `end` is exclusive. */
  start: string;
  end: string;
}

export interface Event {
  id: EventId;
  placeId: PlaceId;
  name: string;
  sessions: EventSession[];
  cancelled: boolean;
  condition: { status: 'known' | 'unknown'; text?: string };
  categories: Category[];
  /** 행사 가점 E. Capped by policy. */
  bonus: number;
  source: Source | null;
  isVirtual: boolean;
}

export interface Profile {
  /** 사용자가 신고한 지역별 초기 Lv. Missing region = 0. */
  initialLevels: Record<RegionId, 0 | 1 | 2>;
  interests: Category[];
  experiencedEventIds: EventId[];
  /** 내 동네: current administrative-dong code. Not the same as 출발지 or familiarity. */
  homeDongCode?: string;
}

export interface Visit {
  id: string;
  placeId: PlaceId;
  date: DateString;
  method: 'self_report';
}

export interface SearchContext {
  origin: LatLng & { label: string };
  /** Selected time, 'YYYY-MM-DDTHH:MM' interpreted in Asia/Seoul. */
  when: string;
  /** Empty = all categories. */
  interests: Category[];
  maxDistanceKm: number;
}

export type PlaceStatus = 'open' | 'closed' | 'unknown';

export interface RegionRecommendation {
  regionId: RegionId;
  score: number;
  reasons: string[];
  /** Straight-line km from origin to region start point. */
  distanceKm: number;
  level: 0 | 1 | 2;
  /** Current top 20 by personal place score; all candidates are retained for reselection. */
  placeIds: PlaceId[];
  eligiblePlaceCount: number;
  placeLimit: number;
  shortfallCount: number;
  openPlaceCount: number;
  unknownPlaceCount: number;
  /** Adjustment before novelty/distance weighting; missing data is distinct from zero footfall. */
  footfall: FootfallAdjustment;
}
