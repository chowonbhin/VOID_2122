import { Icon } from '../../components/Icon';
// Onboarding: Q1 거주 시기 → (초심자면 바로 관심 활동) → Q2 가본 동네 → Q3 지금 동네에서 가본 장소 → 관심 활동.
// Finishing also saves the search, so the main map opens without a separate setup page.
import { useRef, useState } from 'react';
import { useAppState } from '../../AppState';
import { content, placesOfRegion } from '../../data/content';
import { CATEGORY_LABELS, DEFAULT_MAX_DISTANCE_KM } from '../../domain/policy';
import { distanceKm } from '../../domain/score';
import type { Category, OnboardingAnswers, Residence, SearchContext } from '../../domain/types';
import { go } from '../../route';
import { centreLatLng, dongByCode, dongs, dongsOfRegion, mapAreas, pathOfDong, wholeBox } from '../map/ansanGeo';
import { CardDeck } from './CardDeck';
import { useQuestionTransition } from './useQuestionTransition';
import { useExitTransition } from '../navigation/useExitTransition';
import { buildOnboardingPayload, isBeginner } from './onboardingScore';
import { submitOnboarding } from './submit';
import './onboarding.css';

const RESIDENCE: { value: Residence; label: string }[] = [
  { value: 'visitor', label: '여행·방문 중이에요' },
  { value: 'under_6m', label: '6개월이 안 됐어요' },
  { value: '6m_2y', label: '6개월 ~ 2년' },
  { value: 'over_2y', label: '2년 이상' },
];

const toggle = <T extends string>(list: T[], id: T) => list.includes(id) ? list.filter(item => item !== id) : [...list, id];

// The demo plans an afternoon outing: today's Korean date at 14:00.
function demoWhen() {
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return `${date}T14:00`;
}

// The trip starts from 내 동네: its region start point, else the dong's label point, else the default start.
function startFrom(code: string) {
  const dong = code ? dongByCode(code) : undefined;
  if (!dong) return content.regions[0].start;
  const region = content.regions.find(item => item.adminCode === dong.code);
  return region?.start ?? { label: `${dong.name} (내 동네)`, lat: dong.labelPoint.lat, lng: dong.labelPoint.lng };
}

export function Onboarding() {
  const { state, update } = useAppState();
  const { step, changeStep, pending, panel } = useQuestionTransition();
  const screen = useRef<HTMLElement>(null);
  const finishing = useExitTransition();
  const [residence, setResidence] = useState<Residence>();
  const [home, setHome] = useState(state.profile.homeDongCode ?? '');
  const [visitedDongs, setVisitedDongs] = useState<string[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<string[]>([]);
  const [interests, setInterests] = useState<Category[]>(state.search?.interests ?? state.profile.interests);
  const [error, setError] = useState('');

  const homeDong = dongByCode(home);
  const origin = homeDong ? centreLatLng(homeDong) : null;
  // Q2: nearest 동네 first, so the first cards are the ones the user most likely knows.
  const deckDongs = [...dongs].sort((a, b) => origin
    ? distanceKm(origin, centreLatLng(a)) - distanceKm(origin, centreLatLng(b))
    : a.name.localeCompare(b.name, 'ko')).map(dong => ({ ...dong, id: dong.code }));
  // Q3: places of 내 동네, else of the nearest 동네 that has place data.
  const mapped = content.regions.filter(region => dongsOfRegion(region).length && placesOfRegion(region.id).length);
  const homeRegion = mapped.find(region => region.adminCode === home)
    ?? [...mapped].sort((a, b) => origin ? distanceKm(origin, centreLatLng(dongsOfRegion(a)[0])) - distanceKm(origin, centreLatLng(dongsOfRegion(b)[0])) : 0)[0];
  const ownArea = homeRegion?.adminCode === home;
  const deckPlaces = homeRegion ? placesOfRegion(homeRegion.id) : [];

  function finish(chosen: Residence) {
    const answers: OnboardingAnswers = {
      residence: chosen, homeDongCode: home || undefined,
      visitedDongCodes: isBeginner(chosen) ? [] : visitedDongs,
      visitedPlaceIds: isBeginner(chosen) ? [] : visitedPlaces,
      completedAt: new Date().toISOString(),
    };
    const payload = buildOnboardingPayload(answers, content);
    const search: SearchContext = { origin: startFrom(home), when: demoWhen(), interests, maxDistanceKm: DEFAULT_MAX_DISTANCE_KM };
    // Answers replace earlier familiarity, so 다시 설정하기 can also lower it. Visits are kept.
    const saved = update(previous => ({
      ...previous,
      needsDongLevelReview: false,
      profile: { ...previous.profile, homeDongCode: answers.homeDongCode, onboarding: answers, interests, initialLevels: payload.initialLevels },
      search,
    }));
    if (!saved) {
      setError('답변을 저장하지 못했어요. 브라우저 저장 공간을 확인하고 다시 시도해 주세요.');
      return false;
    }
    void submitOnboarding(payload);
    go({ name: 'recommend' });
    return true;
  }

  const beginner = !!residence && isBeginner(residence);
  const steps = beginner ? [1, 4] : [1, 2, 3, 4];

  return <section className="onboarding" ref={screen} aria-busy={pending || finishing.pending}>
    <ol className="onboarding-steps" aria-label="온보딩 단계">
      {steps.map((n, index) => <li key={n} aria-current={step === n ? 'step' : undefined} className={n <= step ? 'done' : ''}>Q{index + 1}</li>)}
    </ol>

    <div className="onboarding-question-viewport">
    <div key={step} ref={panel} className="onboarding-question" inert={pending || finishing.pending}>
    {step === 1 && <>
      <p className="eyebrow">Q1 · 안산과 나</p>
      <h1 tabIndex={-1}>안산에 산 지 얼마나 됐나요?</h1>
      <div className="onboarding-options" role="radiogroup" aria-label="안산 거주 시기">
        {RESIDENCE.map(option => <button type="button" role="radio" key={option.value} aria-checked={residence === option.value}
          className="onboarding-option" onClick={() => setResidence(option.value)}>
          <strong>{option.label}</strong>
        </button>)}
      </div>
      {residence && residence !== 'visitor' && <label className="onboarding-home">
        지금 사는 동네 <span>(선택)</span>
        <select value={home} onChange={event => setHome(event.target.value)}>
          <option value="">선택 안 함</option>
          {[...dongs].sort((a, b) => a.name.localeCompare(b.name, 'ko')).map(dong => <option key={dong.code} value={dong.code}>{dong.name}</option>)}
        </select>
      </label>}
      {residence && <button className="primary onboarding-next" onClick={() => changeStep(beginner ? 4 : 2)}>다음</button>}
    </>}

    {step === 2 && <>
      <p className="eyebrow">Q2 · 가본 동네</p>
      <h1 tabIndex={-1}>안산에서 가본 동네를 알려주세요</h1>
      <CardDeck label="가본 동네 카드" items={deckDongs} checked={visitedDongs} onToggle={id => setVisitedDongs(list => toggle(list, id))}
        render={dong => <>
          <svg className="deck-map" viewBox={(mapAreas.find(area => area.dongs.some(d => d.code === dong.code))?.box ?? wholeBox).join(' ')} aria-hidden="true">
            {dongs.map(d => <path key={d.code} d={pathOfDong(d)} className={d.code === dong.code ? 'target' : ''} />)}
          </svg>
          <h2>{dong.name}{dong.code === home ? ' · 내 동네' : ''}</h2>
        </>} />
      <div className="onboarding-actions">
        <button onClick={() => changeStep(1)}>이전</button>
        <button className="primary" onClick={() => changeStep(3)}>다음 질문</button>
      </div>
    </>}

    {step === 3 && <>
      <p className="eyebrow">Q3 · {ownArea && homeDong ? `${homeDong.name}의 장소` : `가까운 탐험 동네 · ${homeRegion?.name ?? ''}`}</p>
      <h1 tabIndex={-1}>{ownArea ? '지금 동네에서 가본 곳이 있나요?' : '이 동네에서 가본 곳이 있나요?'}</h1>
      {deckPlaces.length > 0 && <CardDeck label="가본 장소 카드" items={deckPlaces} checked={visitedPlaces} onToggle={id => setVisitedPlaces(list => toggle(list, id))}
        render={place => <>
          <p className="deck-kicker">{CATEGORY_LABELS[place.category]}{place.isVirtual ? ' · 시연용 장소' : ''}</p>
          <h2>{place.name}</h2>
          <p className="deck-sub">{homeRegion?.name}</p>
        </>} />}
      <div className="onboarding-actions">
        <button onClick={() => changeStep(2)}>이전</button>
        <button className="primary" onClick={() => changeStep(4)}>다음 질문</button>
      </div>
    </>}

    {step === 4 && <>
      <p className="eyebrow">Q{steps.length} · 관심 활동</p>
      <h1 tabIndex={-1}>어떤 활동을 좋아하나요?</h1>
      <p className="lead">복수 선택 · 미선택 시 전체</p>
      <div className="onboarding-interests" role="group" aria-label="관심 활동">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map(category => <label key={category} className="onboarding-interest">
          <input type="checkbox" checked={interests.includes(category)} onChange={() => setInterests(list => toggle(list, category))} />
          {CATEGORY_LABELS[category]}
        </label>)}
      </div>
      {error && <p role="alert" className="onboarding-error"><Icon name="alert" size={18} />{error}</p>}
      <div className="onboarding-actions">
        <button onClick={() => changeStep(beginner ? 1 : 3)}>이전</button>
        <button className="primary" onClick={() => residence && finishing.exit(screen.current, [{ opacity: 1 }, { opacity: 0 }], () => finish(residence), 440)}>탐험 시작</button>
      </div>
    </>}
    </div>
    </div>
  </section>;
}
