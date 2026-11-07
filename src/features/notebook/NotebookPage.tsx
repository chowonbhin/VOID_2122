import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../../components/Icon';
import { useAppState } from '../../AppState';
import { content, regionById } from '../../data/content';
import { MEMORY_PHOTOS, type MemoryPhoto } from '../../data/memoryPhotos';
import type { Place } from '../../domain/types';
import { deletePhoto, listPhotos, photoFileError, photoStorageError, readPhoto, savePhoto, type NotebookPhoto } from './photoStorage';
import './notebook.css';

type Album = { place: Place; dates: string[]; photo?: MemoryPhoto; saved: NotebookPhoto[] };
const dateLabel = (date: string) => date.replaceAll('-', '. ');

function useBlobUrl(blob?: Blob) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) { setUrl(''); return; }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

function SavedImage({ photo, full = false }: { photo: NotebookPhoto; full?: boolean }) {
  const [original, setOriginal] = useState<Blob>();
  const [error, setError] = useState('');
  const url = useBlobUrl(original ?? photo.thumbnail);
  useEffect(() => {
    if (!full) return;
    let active = true;
    readPhoto(photo.id).then(blob => {
      if (!active) return;
      if (blob) setOriginal(blob);
      else setError('원본 사진을 찾을 수 없어 미리보기를 표시해요.');
    }).catch(() => { if (active) setError('원본 사진을 열 수 없어 미리보기를 표시해요.'); });
    return () => { active = false; };
  }, [photo.id, full]);
  return <>{url && <img src={url} alt={dateLabel(photo.date) + '에 남긴 추억 사진'} loading={full ? 'eager' : 'lazy'}
    className={full ? 'notebook-lightbox-image' : undefined} width="576" height="432" />}
    {error && <p role="alert"><Icon name="alert" size={18} />{error}</p>}</>;
}


function Sheet({ title, onClose, children, wide = false, busy = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; busy?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef(document.activeElement as HTMLElement | null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
      else document.querySelector<HTMLButtonElement>('.notebook-add')?.focus();
    };
  }, []);
  return <dialog ref={dialog} className={'notebook-dialog' + (wide ? ' notebook-lightbox' : '')}
    aria-label={title} aria-busy={busy} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => { if (!busy && event.target === event.currentTarget) onClose(); }}>
    <div className="notebook-dialog-body">
      <div className="notebook-dialog-head"><h2>{title}</h2>
        <button autoFocus aria-label="닫기" className="notebook-close" disabled={busy} onClick={onClose}><Icon name="close" /></button>
      </div>
      {children}
    </div>
  </dialog>;
}

function PhotoEditor({ albums, initialPlaceId, onClose, onSaved }: {
  albums: Album[]; initialPlaceId?: string; onClose: () => void; onSaved: (photo: NotebookPhoto) => void;
}) {
  const [file, setFile] = useState<File>();
  const url = useBlobUrl(file);
  const [error, setError] = useState('');
  const [placeId, setPlaceId] = useState(initialPlaceId ?? albums[0]?.place.id ?? '');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [date, setDate] = useState(albums.find(album => album.place.id === placeId)?.dates[0] ?? today);
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  return <Sheet title="한 장의 추억 남기기" onClose={onClose} busy={saving}>
    <form onSubmit={async event => {
      event.preventDefault();
      if (pending.current || !file || !date || !albums.some(album => album.place.id === placeId)) return;
      pending.current = true; setSaving(true); setError('');
      try { onSaved(await savePhoto({ file, placeId, date, memo })); }
      catch (cause) { setError(photoStorageError(cause)); }
      finally { pending.current = false; setSaving(false); }
    }}>
    <fieldset disabled={saving} className="notebook-form-fields">
    <label className={'notebook-upload' + (url ? ' has-photo' : '')}>
      {url ? <img src={url} alt="선택한 사진 미리보기" onError={() => { setFile(undefined); setError('사진을 읽을 수 없어요. 다른 사진을 골라주세요.'); }} /> : <><Icon name="camera" /><strong>사진 고르기</strong><span>JPG · PNG · WebP / 최대 10MB</span></>}
      <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="추억 사진 선택" onChange={event => {
        const next = event.target.files?.[0];
        if (!next) return;
        const invalid = photoFileError(next);
        if (invalid) {
          setFile(undefined); setError(invalid); event.target.value = ''; return;
        }
        setError(''); setFile(next);
      }} />
      {url && <span className="notebook-replace">다른 사진 고르기</span>}
    </label>
    {error && <p role="alert"><Icon name="alert" size={18} />{error}</p>}
    <label className="notebook-field">장소
      <select aria-label="장소" required value={placeId} onChange={event => setPlaceId(event.target.value)}>{albums.map(({ place }) => <option key={place.id} value={place.id}>{place.name} · {regionById(place.regionId)?.name}</option>)}</select>
    </label>
    <label className="notebook-field">기억할 날짜
      <input type="date" required value={date} max={today} onChange={event => setDate(event.target.value)} />
    </label>
    <label className="notebook-field">짧은 메모 <span className="notebook-optional">선택</span>
      <textarea placeholder="그날의 분위기, 함께한 사람, 기억하고 싶은 것…" maxLength={300} rows={3} value={memo} onChange={event => setMemo(event.target.value)} />
    </label>
    </fieldset>
    <p className="notebook-draft-note">사진은 이 브라우저에 저장돼요. 브라우저 데이터를 지우면 사라져요.</p>
    <button type="submit" className="notebook-save" disabled={saving || !file || !placeId || !date}>{saving ? '저장하는 중…' : '추억 저장하기'}</button>
    </form>
  </Sheet>;
}

function AlbumDetail({ album, showSample, canAdd, onClose, onAdd, onDeleted }: {
  album: Album; showSample: boolean; canAdd: boolean; onClose: () => void; onAdd: () => void; onDeleted: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | undefined>(showSample ? 'sample' : album.saved[0]?.id);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const active = activeId === 'sample' ? undefined : album.saved.find(photo => photo.id === activeId) ?? album.saved[0];
  const sample = !active ? album.photo : undefined;
  return <Sheet title={album.place.name} wide onClose={onClose} busy={deleting}>
    {active ? <SavedImage key={active.id} photo={active} full /> : sample
      ? <img className="notebook-lightbox-image" src={sample.src} alt={sample.alt} />
      : <div className="notebook-no-photo"><Icon name="camera" /><p>아직 남긴 사진이 없어요.</p></div>}
    {album.saved.length + Number(!!album.photo) > 1 && <div className="notebook-photo-picker" role="group" aria-label="장소 사진 선택">
      {album.saved.map((photo, index) => <button key={photo.id} disabled={deleting} aria-label={'내 사진 ' + (index + 1)} aria-pressed={active?.id === photo.id}
        onClick={() => { setActiveId(photo.id); setConfirming(false); setError(''); }}><SavedImage photo={photo} /></button>)}
      {album.photo && <button disabled={deleting} aria-pressed={!!sample} onClick={() => { setActiveId('sample'); setConfirming(false); setError(''); }}>간판 예시</button>}
    </div>}
    {active && <><p className="notebook-subtle">{dateLabel(active.date)} · 내 사진</p>{active.memo && <p className="notebook-memo">{active.memo}</p>}</>}
    <p className="notebook-subtle">{album.place.address}</p>
    {album.dates.length > 0 && <p className="notebook-subtle">남긴 방문 기록 · {album.dates.map(dateLabel).join(' / ')}</p>}
    {sample && <div className="notebook-photo-source"><span>간판 사진 예시</span><a href={sample.sourceUrl} target="_blank" rel="noreferrer">{sample.sourceLabel} ↗</a></div>}
    {error && <p role="alert"><Icon name="alert" size={18} />{error}</p>}
    {confirming && active ? <div className="notebook-delete-confirm">
      <p>이 사진과 메모를 삭제할까요? 방문 기록은 그대로 남아요.</p>
      <button disabled={deleting} onClick={() => setConfirming(false)}>취소</button>
      <button disabled={deleting} onClick={async () => {
        setDeleting(true); setError('');
        try { await deletePhoto(active.id); onDeleted(active.id); setActiveId(undefined); setConfirming(false); }
        catch (cause) { setError(photoStorageError(cause)); }
        finally { setDeleting(false); }
      }}>{deleting ? '삭제하는 중…' : '삭제하기'}</button>
    </div> : <div className="notebook-photo-actions"><button disabled={!canAdd} onClick={onAdd}>＋ 사진 추가</button>
      {active && <button className="notebook-delete" onClick={() => setConfirming(true)}>이 사진 삭제</button>}</div>}
    <a className="notebook-place-link" href={'#/region/' + album.place.regionId}>이 동네 둘러보기 →</a>
  </Sheet>;
}

export function NotebookPage() {
  const { state } = useAppState();
  const [filter, setFilter] = useState<'all' | 'visited' | 'sample'>('all');
  const [sort, setSort] = useState('recent');
  const [selectedId, setSelectedId] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [addPlaceId, setAddPlaceId] = useState<string>();
  const [photos, setPhotos] = useState<NotebookPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError('');
    listPhotos().then(saved => { if (active) setPhotos(saved); })
      .catch(error => { if (active) setLoadError(photoStorageError(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  const visitedIds = new Set(state.visits.map(visit => visit.placeId));
  const savedIds = new Set(photos.map(photo => photo.placeId));
  const sampleIds = MEMORY_PHOTOS.map(photo => photo.placeId);
  const albums: Album[] = content.places.filter(place => visitedIds.has(place.id) || savedIds.has(place.id) || sampleIds.includes(place.id as typeof sampleIds[number]))
    .map(place => ({
      place, dates: state.visits.filter(visit => visit.placeId === place.id).map(visit => visit.date).sort().reverse(),
      photo: MEMORY_PHOTOS.find(photo => photo.placeId === place.id),
      saved: photos.filter(photo => photo.placeId === place.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    }));
  const selected = albums.find(album => album.place.id === selectedId);
  const recordedCount = albums.filter(album => album.dates.length > 0 || album.saved.length > 0).length;
  const recentDate = (album: Album) => [album.dates[0] ?? '', album.saved[0]?.date ?? ''].sort().at(-1) ?? '';
  const shown = albums.filter(album => filter === 'all' || (filter === 'visited' ? album.dates.length > 0 : !!album.photo))
    .sort((a, b) => sort === 'name' ? a.place.name.localeCompare(b.place.name, 'ko')
      : recentDate(b).localeCompare(recentDate(a)) || sampleIds.indexOf(a.place.id as typeof sampleIds[number]) - sampleIds.indexOf(b.place.id as typeof sampleIds[number]));
  const openEditor = (placeId?: string) => { setAddPlaceId(placeId); setSelectedId(undefined); setAdding(true); setNotice(''); };
  return <section className="notebook">
    <a className="notebook-back" href="#/recommend"><Icon name="arrowLeft" size={18} /> 나의 안산 지도로</a>
    <header className="notebook-heading">
      <h1><span className="title-prefix">나의 </span><span className="title-accent">동네수첩</span><span className="notebook-title-dot">.</span></h1>
      <button className="notebook-add" disabled={loading || !!loadError} onClick={() => openEditor()}><Icon name="plus" /> 사진 남기기</button>
    </header>
    <div className="notebook-overview">
      <span><strong>{recordedCount}</strong> 기록한 장소</span><span><strong>{photos.length}</strong> 내 사진</span><span><strong>{MEMORY_PHOTOS.length}</strong> 사진 예시</span>
    </div>
    <div className="notebook-tools">
      <div className="notebook-tabs" role="group" aria-label="수첩 보기">
        {([['all', '모든 추억'], ['visited', '방문한 곳'], ['sample', '사진 예시']] as const).map(([value, label]) =>
          <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}
      </div>
      <select aria-label="추억 정렬" value={sort} onChange={event => setSort(event.target.value)}><option value="recent">최근 기록순</option><option value="name">가게 이름순</option></select>
    </div>
    {loading && <p role="status" className="notebook-subtle">저장한 사진을 펼치고 있어요…</p>}
    {loadError && <div className="notebook-storage-error"><p role="alert"><Icon name="alert" size={18} />{loadError}</p><button onClick={() => setRevision(value => value + 1)}>다시 불러오기</button></div>}
    {notice && <p role="status" className="notebook-notice"><Icon name="check" size={18} />{notice}</p>}
    <p className="notebook-section-label">장소 <span>{shown.length}</span></p>
    {shown.length ? <ul className="notebook-grid" aria-label="동네수첩 사진">
      {shown.map(album => <li key={album.place.id} className="notebook-photo-card">
        <button className="notebook-photo-open" onClick={() => setSelectedId(album.place.id)} aria-label={album.place.name + ' 추억 보기'}>
          <div className="notebook-photo-wrap">
            {album.saved.length && filter !== 'sample' ? <SavedImage key={album.saved[0].id} photo={album.saved[0]} /> : album.photo ? <img src={album.photo.src} alt={album.photo.alt} loading="lazy" width="576" height="432" />
              : <div className="notebook-no-photo"><Icon name="camera" /><span>사진 없음</span></div>}
            {album.saved.length && filter !== 'sample' ? <span className="notebook-photo-badge">내 사진 {album.saved.length}장</span>
              : album.photo && <span className="notebook-photo-badge">간판 사진 예시</span>}
            <span className="notebook-expand"><Icon name="arrowUpRight" size={16} /></span>
          </div>
          <div className="notebook-photo-caption"><p>{regionById(album.place.regionId)?.name}{recentDate(album) && <span>{dateLabel(recentDate(album))}</span>}</p>
            <h2>{album.place.name}</h2>{filter !== 'sample' && album.saved[0]?.memo && <p className="notebook-photo-note">{album.saved[0].memo}</p>}
          </div>
        </button>
      </li>)}
      <li className="notebook-next"><button disabled={loading || !!loadError} onClick={() => openEditor()}><span className="notebook-next-symbol"><Icon name="plus" /></span><strong>사진 추가</strong></button></li>
    </ul> : <div className="notebook-empty"><Icon name="camera" /><h2>아직 남긴 발걸음이 없어요</h2><a href="#/recommend">동네 둘러보기 →</a></div>}
    <div className="notebook-end">안산에서, 한 장씩.</div>
    {selected && <AlbumDetail key={selected.place.id} album={selected} showSample={filter === 'sample'} canAdd={!loading && !loadError} onClose={() => setSelectedId(undefined)}
      onAdd={() => openEditor(selected.place.id)} onDeleted={id => { setPhotos(current => current.filter(photo => photo.id !== id)); setNotice('사진을 삭제했어요.'); }} />}
    {adding && <PhotoEditor albums={albums} initialPlaceId={addPlaceId} onClose={() => setAdding(false)} onSaved={photo => {
      setPhotos(current => [...current, photo]); setAdding(false); setFilter('all'); setNotice('사진과 메모를 수첩에 저장했어요.');
    }} />}
  </section>;
}
