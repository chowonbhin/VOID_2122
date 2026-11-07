// Golden-path step 2 (조건 입력). Owner: chowonbhin.
import { useState, type FormEvent } from 'react';
import { useAppState } from '../../AppState';
import { content } from '../../data/content';
import { CATEGORY_LABELS, DEFAULT_MAX_DISTANCE_KM, LEVEL_LABELS } from '../../domain/policy';
import type { Category, Profile, SearchContext } from '../../domain/types';
import { go } from '../../route';
import { dongAt, dongByCode, dongs } from '../map/ansanGeo';
import './setup.css';

function localDateTime() {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (name: string) => parts.find((part) => part.type === name)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function SetupPage() {
  const { state, update } = useAppState();
  const [levels, setLevels] = useState<Profile['initialLevels']>({ ...state.profile.initialLevels });
  const [interests, setInterests] = useState<Category[]>(state.search?.interests ?? state.profile.interests);
  const [origin, setOrigin] = useState(state.search?.origin ?? content.regions[0].start);
  const [when, setWhen] = useState(state.search?.when ?? localDateTime());
  const [maxDistance, setMaxDistance] = useState(String(state.search?.maxDistanceKm ?? DEFAULT_MAX_DISTANCE_KM));
  const [latitude, setLatitude] = useState(String(origin.lat));
  const [longitude, setLongitude] = useState(String(origin.lng));
  const [error, setError] = useState('');
  const [homeDongCode, setHomeDongCode] = useState((state.profile.homeDongCode ? dongByCode(state.profile.homeDongCode)?.code : dongAt(origin.lat, origin.lng)?.code) ?? '');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lat = Number(latitude);
    const lng = Number(longitude);
    const distance = Number(maxDistance);
    if (!origin.label.trim() || !latitude.trim() || !longitude.trim() ||
      !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lng) || lng < -180 || lng > 180 ||
      !Number.isFinite(distance) || distance <= 0 || !when ||
      !Number.isFinite(Date.parse(`${when}:00+09:00`))) {
      setError('출발지, 날짜·시각, 최대 거리를 확인해 주세요.');
      return;
    }

    // Contract: Profile.initialLevels/interests + SearchContext are saved together.
    // Visits and experiencedEventIds are preserved; the shared score engine consumes this state.
    const search: SearchContext = {
      origin: { label: origin.label.trim(), lat, lng }, when, interests, maxDistanceKm: distance,
    };
    const saved = update((previous) => ({
      ...previous,
      needsDongLevelReview: false,
      profile: { ...previous.profile, initialLevels: levels, interests, homeDongCode: homeDongCode || undefined },
      search,
    }));
    if (!saved) {
      setError('조건을 저장하지 못했습니다. 브라우저 저장 공간을 확인하고 다시 시도해 주세요.');
      return;
    }
    go({ name: 'recommend' });
  }

  return (
    <section className="setup">
      <p className="eyebrow">나에게 맞는 지역 탐험</p>
      <h1>탐험 조건</h1>
      <p className="lead">지역별 경험과 외출 조건을 알려주세요. 선택한 한국 시각의 운영정보로 추천합니다.</p>
      <form onSubmit={submit}>
        {state.needsDongLevelReview && <p role="status">행정동 기준으로 변경되었습니다. 기존 방문 기록은 유지되며 A·B권역의 초기 익숙함은 보관했습니다. 행정동별 익숙함을 다시 선택해 주세요.</p>}
        <fieldset>
          <legend>내 동네</legend>
          <label>
            내 동네 선택
            <select value={homeDongCode} onChange={(event) => setHomeDongCode(event.target.value)}>
              <option value="">선택 안 함</option>
              {[...dongs].sort((a, b) => a.name.localeCompare(b.name, 'ko')).map((dong) => <option key={dong.code} value={dong.code}>{dong.name}</option>)}
            </select>
          </label>
          <p className="setup-hint">지도에 집 모양으로 표시돼요. 출발지나 익숙함과는 별개이며, 2026-10-01 행정동 기준입니다.</p>
        </fieldset>
        <fieldset>
          <legend>지역별 익숙함</legend>
          <p className="setup-hint">새로 온 주민은 기본값인 신규로 시작하세요. 기존 주민은 익숙한 지역만 변경할 수 있습니다. 방문 기록은 유지됩니다.</p>
          <div className="setup-dongs">{(['단원구', '상록구'] as const).map(district => <details key={district} open><summary>{district}</summary>
          <div className="setup-dong-grid">{content.regions.filter(region => region.district === district).sort((a, b) => a.name.localeCompare(b.name, 'ko')).map((region) => (
            <label key={region.id}>
              {region.name} 익숙함
              <select value={levels[region.id] ?? 0} onChange={(event) => {
                const level = Number(event.target.value) as 0 | 1 | 2;
                setLevels((previous) => ({ ...previous, [region.id]: level }));
              }}>
                {([0, 1, 2] as const).map((level) => (
                  <option key={level} value={level}>{LEVEL_LABELS[level]} · Lv.{level}</option>
                ))}
              </select>
            </label>
          ))}</div></details>)}</div>
        </fieldset>
        <fieldset>
          <legend>관심 활동</legend>
          <p className="setup-hint">선택하지 않으면 모든 활동을 포함합니다.</p>
          <div className="setup-interests">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((category) => (
              <label key={category} className="setup-checkbox">
                <input type="checkbox" checked={interests.includes(category)} onChange={(event) => {
                  const checked = event.target.checked;
                  setInterests((previous) => checked ? [...previous, category] : previous.filter((item) => item !== category));
                }} />
                {CATEGORY_LABELS[category]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>출발지</legend>
          <label>
            출발지 선택
            <select value="" onChange={(event) => {
              const region = content.regions.find((item) => item.id === event.target.value);
              if (!region) return;
              setOrigin(region.start);
              setLatitude(String(region.start.lat));
              setLongitude(String(region.start.lng));
            }}>
              <option value="" disabled>행정동 대표 지점을 선택하거나 아래에서 직접 입력</option>
              {content.regions.map((region) => <option key={region.id} value={region.id}>{region.start.label}</option>)}
            </select>
          </label>
          <label>출발지 이름<input required maxLength={100} value={origin.label} onChange={(event) => setOrigin({ ...origin, label: event.target.value })} /></label>
          <div className="setup-grid">
            <label>위도<input required type="number" min="-90" max="90" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} /></label>
            <label>경도<input required type="number" min="-180" max="180" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></label>
          </div>
          <p className="setup-hint">직접 입력한 좌표가 출발지입니다. 거리는 행정동 대표 지점까지의 직선거리이며 이동 경로나 도착 시간을 뜻하지 않습니다.</p>
        </fieldset>
        <fieldset>
          <legend>외출 조건</legend>
          <div className="setup-grid">
            <label>날짜·시각 (한국 시간)<input required type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} /></label>
            <label>최대 거리 (km)<input required type="number" min="0.1" step="any" value={maxDistance} onChange={(event) => setMaxDistance(event.target.value)} /></label>
          </div>
          <p className="setup-hint">운영 중인 여러 장소를 한 번에 모두 방문할 수 있다는 의미는 아닙니다.</p>
        </fieldset>
        {error && <p role="alert" className="setup-error">{error}</p>}
        <button className="primary" type="submit">추천 받기</button>
      </form>
    </section>
  );
}
