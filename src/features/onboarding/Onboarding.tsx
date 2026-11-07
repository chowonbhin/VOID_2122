// First-run onboarding: Q1 거주 시기 → (초심자면 바로 지도) → Q2 가본 동네 → Q3 지금 동네에서 가본 장소.
import { useState } from 'react';
import { useAppState } from '../../AppState';
import { content, placesOfRegion } from '../../data/content';
import { CATEGORY_LABELS } from '../../domain/policy';
import { distanceKm } from '../../domain/score';
import type { OnboardingAnswers, Residence } from '../../domain/types';
import { go } from '../../route';
import { centreLatLng, dongByCode, dongs, dongsOfRegion, mapAreas, pathOfDong, wholeBox } from '../map/ansanGeo';
import { CardDeck } from './CardDeck';
import { buildOnboardingPayload, isBeginner } from './onboardingScore';
import { submitOnboarding } from './submit';
import './onboarding.css';

const RESIDENCE: { value: Residence; label: string; hint: string }[] = [
  { value: 'visitor', label: '여행·방문 중이에요', hint: '안산에 살지 않아요' },
  { value: 'under_6m', label: '6개월이 안 됐어요', hint: '새로 이사 왔어요' },
  { value: '6m_2y', label: '6개월 ~ 2년', hint: '조금 익숙해졌어요' },
  { value: 'over_2y', label: '2년 이상', hint: '오래 살았어요' },
];

const toggle = (list: string[], id: string) => list.includes(id) ? list.filter(item => item !== id) : [...list, id];

export function Onboarding() {
  const { state, update } = useAppState();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [residence, setResidence] = useState<Residence>();
  const [home, setHome] = useState(state.profile.homeDongCode ?? '');
  const [visitedDongs, setVisitedDongs] = useState<string[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<string[]>([]);
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
    const saved = update(previous => ({
      ...previous,
      profile: { ...previous.profile, homeDongCode: answers.homeDongCode, onboarding: answers, initialLevels: { ...previous.profile.initialLevels, ...payload.initialLevels } },
    }));
    if (!saved) {
      setError('답변을 저장하지 못했어요. 브라우저 저장 공간을 확인하고 다시 시도해 주세요.');
      return;
    }
    void submitOnboarding(payload);
    go({ name: 'recommend' });
  }

  return <section className="onboarding">
    <ol className="onboarding-steps" aria-label="온보딩 단계">
      {[1, 2, 3].map(n => <li key={n} aria-current={step === n ? 'step' : undefined} className={n <= step ? 'done' : ''}>Q{n}</li>)}
    </ol>

    {step === 1 && <>
      <p className="eyebrow">Q1 · 안산과 나</p>
      <h1>안산에 산 지 얼마나 됐나요?</h1>
      <p className="lead">답에 맞춰 첫 지도를 준비할게요. 6개월이 안 됐거나 여행 중이면 바로 시작해요.</p>
      <div className="onboarding-options" role="radiogroup" aria-label="안산 거주 시기">
        {RESIDENCE.map(option => <button type="button" role="radio" key={option.value} aria-checked={residence === option.value}
          className="onboarding-option" onClick={() => setResidence(option.value)}>
          <strong>{option.label}</strong><span>{option.hint}</span>
        </button>)}
      </div>
      {residence && residence !== 'visitor' && <label className="onboarding-home">
        지금 사는 동네 <span>(선택 · 2013년 행정동 기준)</span>
        <select value={home} onChange={event => setHome(event.target.value)}>
          <option value="">선택 안 함</option>
          {[...dongs].sort((a, b) => a.name.localeCompare(b.name, 'ko')).map(dong => <option key={dong.code} value={dong.code}>{dong.name}</option>)}
        </select>
      </label>}
      {residence && (isBeginner(residence)
        ? <button className="primary onboarding-next" onClick={() => finish(residence)}>탐험 시작</button>
        : <button className="primary onboarding-next" onClick={() => setStep(2)}>다음</button>)}
    </>}

    {step === 2 && <>
      <p className="eyebrow">Q2 · 가본 동네</p>
      <h1>안산에서 가본 동네를 알려주세요</h1>
      <p className="lead">가봤던 동네라면 "여기 가봤어요"를 눌러요. 처음 지도 색과 추천에 반영돼요.</p>
      <CardDeck label="가본 동네 카드" items={deckDongs} checked={visitedDongs} onToggle={id => setVisitedDongs(list => toggle(list, id))}
        render={dong => <>
          <svg className="deck-map" viewBox={(mapAreas.find(area => area.dongs.some(d => d.code === dong.code))?.box ?? wholeBox).join(' ')} aria-hidden="true">
            {dongs.map(d => <path key={d.code} d={pathOfDong(d)} className={d.code === dong.code ? 'target' : ''} />)}
          </svg>
          <h2>{dong.name}{dong.code === home ? ' · 내 동네' : ''}</h2>
        </>} />
      <div className="onboarding-actions">
        <button onClick={() => setStep(1)}>이전</button>
        <button className="primary" onClick={() => setStep(3)}>다음 질문</button>
      </div>
    </>}

    {step === 3 && <>
      <p className="eyebrow">Q3 · {ownArea && homeDong ? `${homeDong.name}의 장소` : `가까운 탐험 동네 · ${homeRegion?.name ?? ''}`}</p>
      <h1>{ownArea ? '지금 동네에서 가본 곳이 있나요?' : '이 동네에서 가본 곳이 있나요?'}</h1>
      <p className="lead">{ownArea ? '' : '내 동네의 장소 데이터는 준비 중이라 장소 데이터가 있는 가장 가까운 동네로 물어볼게요. '}가본 곳을 체크하면 처음부터 덜 알려진 곳 위주로 추천해요.</p>
      {deckPlaces.length > 0 && <CardDeck label="가본 장소 카드" items={deckPlaces} checked={visitedPlaces} onToggle={id => setVisitedPlaces(list => toggle(list, id))}
        render={place => <>
          <p className="deck-kicker">{CATEGORY_LABELS[place.category]}{place.isVirtual ? ' · 시연용 장소' : ''}</p>
          <h2>{place.name}</h2>
          <p className="deck-sub">{homeRegion?.name}</p>
        </>} />}
      {error && <p role="alert" className="setup-error">{error}</p>}
      <div className="onboarding-actions">
        <button onClick={() => setStep(2)}>이전</button>
        <button className="primary" onClick={() => residence && finish(residence)}>완료하고 지도 보기</button>
      </div>
    </>}
  </section>;
}
