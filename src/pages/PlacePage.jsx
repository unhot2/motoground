import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import KakaoMap from '../components/KakaoMap.jsx';
import PlaceCard from '../components/PlaceCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAsync from '../hooks/useAsync.js';
import { SEARCH_MAX, fetchPlaces } from '../api/place.js';
import { distanceKm, placeCategories } from '../data/place.js';
import { sidoList } from '../data/regions.js';
import { formatCount } from '../lib/format.js';

export function PlaceHead({ title = '플레이스', desc, action }) {
  return (
    <section className="page-head">
      <div className="container page-head__inner garage-head">
        <div>
          <span className="eyebrow">
            <span className="checker checker--short" aria-hidden="true" />
            <span>RIDER PLACE</span>
          </span>
          <h1 className="page-head__title">{title}</h1>
          {desc && <p className="muted">{desc}</p>}
        </div>
        {action}
      </div>
    </section>
  );
}

export default function PlacePage() {
  const { isAdmin } = useAuth();
  // 분류·지역·검색어는 주소에 둬서 뒤로 가기·링크 공유가 되게
  const [params, setParams] = useSearchParams();
  const category = placeCategories.some((c) => c.key === params.get('category')) ? params.get('category') : '';
  const sido = sidoList.includes(params.get('sido')) ? params.get('sido') : '';
  const q = params.get('q') ?? '';

  const list = useAsync(() => fetchPlaces({ category, sido, q }), [category, sido, q]);
  const [input, setInput] = useState(q);
  useEffect(() => setInput(q), [q]);

  const [selected, setSelected] = useState(null);
  const cardRefs = useRef(new Map());
  const [myPos, setMyPos] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  // 내 위치가 있으면 가까운 순, 없으면 최신순
  const places = (list.data ?? [])
    .map((p) => ({ place: p, distance: myPos ? distanceKm(myPos, p) : null }))
    .sort((a, b) => (myPos ? (a.distance ?? Infinity) - (b.distance ?? Infinity) : 0));

  function update(changes) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { preventScrollReset: true });
    setSelected(null);
  }

  function onSearch(e) {
    e.preventDefault();
    update({ q: input.trim() });
  }

  function onLocate() {
    if (myPos) {
      setMyPos(null);
      return;
    }
    if (!navigator.geolocation) {
      setLocError('이 브라우저는 위치 찾기를 지원하지 않아요.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError('위치를 가져오지 못했어요. 브라우저의 위치 권한을 확인해 주세요.');
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  // 지도에서 핀을 누르면 목록의 해당 카드로 스크롤
  function onPin(id) {
    setSelected(id);
    cardRefs.current.get(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  return (
    <>
      <PlaceHead
        desc="바이크 주차가 되는 카페, 믿을 만한 정비소, 라이더가 모이는 곳을 한눈에"
        action={
          isAdmin && (
            <Link to="/place/new" className="btn btn--gold garage-head__btn">
              <Icon name="plus" size={18} strokeWidth={2} /> 장소 등록
            </Link>
          )
        }
      />

      <div className="container place-page">
        <section className="card place-filter" aria-label="장소 찾기">
          <div className="place-filter__row">
            <form className="board-search place-search" role="search" onSubmit={onSearch}>
              <label htmlFor="place-q" className="sr-only">장소 이름·주소 검색</label>
              <input
                id="place-q"
                type="search"
                value={input}
                maxLength={SEARCH_MAX}
                onChange={(e) => setInput(e.target.value)}
                placeholder="장소 이름, 주소로 검색"
              />
              <button type="submit" aria-label="검색">
                <Icon name="search" size={18} strokeWidth={2} />
              </button>
            </form>
            <label htmlFor="place-sido" className="sr-only">지역</label>
            <select id="place-sido" className={`my-select place-sido ${sido ? 'is-set' : ''}`} value={sido} onChange={(e) => update({ sido: e.target.value })}>
              <option value="">전국</option>
              {sidoList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              type="button"
              className={`btn btn--outline place-locate ${myPos ? 'is-on' : ''}`}
              aria-pressed={Boolean(myPos)}
              onClick={onLocate}
              disabled={locating}
            >
              <Icon name="locate" size={18} strokeWidth={2} />
              {locating ? '찾는 중…' : myPos ? '가까운 순' : '내 주변'}
            </button>
          </div>
          {locError && <p className="field__msg field__msg--error" role="alert">{locError}</p>}

          <div className="write-boards place-cats" role="radiogroup" aria-label="분류">
            {[{ key: '', label: '전체', icon: 'pin' }, ...placeCategories].map((c) => (
              <button
                key={c.key || 'all'}
                type="button"
                role="radio"
                aria-checked={category === c.key}
                className={`write-chip place-cat ${category === c.key ? 'is-active' : ''}`}
                onClick={() => update({ category: c.key })}
              >
                <Icon name={c.icon} size={16} strokeWidth={2} />
                {c.label}
              </button>
            ))}
          </div>
        </section>

        <div className="place-layout">
          <div className="place-list" aria-busy={list.loading}>
            <p className="place-list__count" aria-live="polite">
              {q && <><strong>‘{q}’</strong> 검색 결과 </>}
              <span className="text-gold">{formatCount(places.length)}</span>곳
            </p>

            {list.error && <div className="card board-empty">장소를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>}
            {list.loading && !list.data &&
              Array.from({ length: 4 }, (_, i) => <div key={i} className="card place-card place-card--skeleton" aria-hidden="true" />)}
            {list.data && places.length === 0 && (
              <div className="card market-empty">
                <span className="garage-empty__icon" aria-hidden="true"><Icon name="pin" size={32} /></span>
                <h2>조건에 맞는 장소가 없어요</h2>
                <p className="muted">다른 분류나 지역으로 찾아보세요.</p>
              </div>
            )}

            {places.map(({ place, distance }) => (
              <PlaceCard
                key={place.id}
                ref={(el) => (el ? cardRefs.current.set(place.id, el) : cardRefs.current.delete(place.id))}
                place={place}
                distance={distance}
                active={selected === place.id}
                onHover={setSelected}
              />
            ))}
          </div>

          <div className="place-layout__map">
            <KakaoMap places={places.map((x) => x.place)} selectedId={selected} onSelect={onPin} myPos={myPos} />
          </div>
        </div>
      </div>
    </>
  );
}
