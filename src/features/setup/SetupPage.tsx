// Golden-path step 2 (조건 입력). Owner: chowonbhin.
import { useEffect, useRef, useState, type FormEvent } from 'react';
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

// The trip starts from the chosen 내 동네: its region start point, else the dong's label point.
function homeOrigin(code: string) {
  const dong = code ? dongByCode(code) : undefined;
  if (!dong) return undefined;
  const region = content.regions.find((item) => item.adminCode === dong.code);
  return region?.start ?? { label: `${dong.name} (내 동네)`, lat: dong.labelPoint.lat, lng: dong.labelPoint.lng };
}

const STEPS =['내 동네', '지역별 익숙함', '관심 활동'] as const;
const LAST_STEP = STEPS.length - 1;

export function SetupPage() {
  const { state, update } = useAppState();
  const [levels, setLevels] = useState<Profile['initialLevels']>({ ...state.profile.initialLevels });
  const [interests, setInterests] = useState<Category[]>(state.search?.interests ?? state.profile.interests);
  // 날짜·최대 거리 are no longer asked: keep the saved values, else the first-run defaults.
  const savedOrigin = state.search?.origin ?? content.regions[0].start;
  const [error, setError] = useState('');
  // Re-entering after the 행정동 migration starts on familiarity, the step that needs review.
  const [step, setStep] = useState(state.needsDongLevelReview ? 1 : 0);
  const panelRef = useRef<HTMLFieldSetElement>(null);
  const moved = useRef(false);
  const [homeDongCode, setHomeDongCode] = useState((state.profile.homeDongCode ? dongByCode(state.profile.homeDongCode)?.code : dongAt(savedOrigin.lat, savedOrigin.lng)?.code) ?? '');
  // A saved point already inside the home dong stays; otherwise start from the home dong.
  const origin = dongAt(savedOrigin.lat, savedOrigin.lng)?.code === homeDongCode ? savedOrigin : homeOrigin(homeDongCode) ?? savedOrigin;

  // Move focus to the new step so keyboard and screen-reader users land on its heading.
  useEffect(() => {
    if (moved.current) panelRef.current?.focus();
  }, [step]);

  function goTo(next: number) {
    moved.current = true;
    setError('');
    setStep(next);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Enter or 다음 on an earlier step only advances.
    if (step < LAST_STEP) {
      goTo(step + 1);
      return;
    }

    // Contract: Profile.initialLevels/interests + SearchContext are saved together.
    // Visits and experiencedEventIds are preserved; the shared score engine consumes this state.
    const search: SearchContext = {
      origin, when: state.search?.when ?? localDateTime(), interests,
      maxDistanceKm: state.search?.maxDistanceKm ?? DEFAULT_MAX_DISTANCE_KM,
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
      <p className="lead">내 동네와 지역별 경험, 관심 활동을 알려주세요.</p>
      <form onSubmit={submit} noValidate>
        {state.needsDongLevelReview && <p role="status">행정동 기준으로 변경되었습니다. 기존 방문 기록은 유지되며 A·B권역의 초기 익숙함은 보관했습니다. 행정동별 익숙함을 다시 선택해 주세요.</p>}
        <nav className="setup-steps" aria-label="탐험 조건 단계">
          <p className="setup-progress">{step + 1} / {STEPS.length}단계</p>
          <ol>
            {STEPS.map((title, index) => (
              <li key={title}>
                <button type="button" aria-current={index === step ? 'step' : undefined}
                  className={index < step ? 'done' : undefined} onClick={() => goTo(index)}>
                  <span className="setup-step-dot" aria-hidden="true">{index + 1}</span>
                  <span className="setup-step-name">{title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        {step === 0 && <fieldset ref={panelRef} tabIndex={-1} className="setup-panel">
          <legend>내 동네</legend>
          <label>
            내 동네 선택
            <select value={homeDongCode} onChange={(event) => setHomeDongCode(event.target.value)}>
              <option value="">선택 안 함</option>
              {[...dongs].sort((a, b) => a.name.localeCompare(b.name, 'ko')).map((dong) => <option key={dong.code} value={dong.code}>{dong.name}</option>)}
            </select>
          </label>
          <p className="setup-hint">지도에 빗금으로 표시되고, 이 동네의 대표 지점에서 출발해 거리를 계산해요. 익숙함과는 별개이며, 2026-10-01 행정동 기준입니다.</p>
        </fieldset>}
        {step === 1 && <fieldset ref={panelRef} tabIndex={-1} className="setup-panel">
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
        </fieldset>}
        {step === 2 && <fieldset ref={panelRef} tabIndex={-1} className="setup-panel">
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
        </fieldset>}
        {error && <p role="alert" className="setup-error">{error}</p>}
        <div className="setup-actions">
          {step > 0 && <button type="button" onClick={() => goTo(step - 1)}>이전</button>}
          <button key={step === LAST_STEP ? 'submit' : 'next'} className="primary" type="submit">{step === LAST_STEP ? '추천 받기' : '다음'}</button>
        </div>
      </form>
    </section>
  );
}
