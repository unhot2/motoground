import { useEffect, useRef, useState } from 'react';
import BikeArt from './BikeArt.jsx';
import BrandSelect from './BrandSelect.jsx';
import Icon from './Icon.jsx';
import { brands, findBrand, normalizeModel } from '../data/bikeCatalog.js';
import { genreLabel, genres } from '../data/garage.js';

const DIRECT = '__direct__';
const brandOptions = [
  ...brands.map((b) => ({ value: b.name, label: b.name, sub: b.en, meta: `모델 ${b.models.length}` })),
  { value: DIRECT, label: '기타 (직접 입력)', sub: 'OTHER' },
];

// 1단계: 제조사 → 모델 카드 슬라이드에서 고르기
// onNext({ brand, model }) 목록에서 고름 / onDirect(brand) 직접 입력
export default function ModelPicker({ initialBrand = '', initialModel = '', onNext, onDirect }) {
  const [brandName, setBrandName] = useState(findBrand(initialBrand) ? initialBrand : '');
  const [genre, setGenre] = useState('all');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(initialModel);
  const [error, setError] = useState('');
  const brand = findBrand(brandName);

  const brandGenres = brand ? genres.filter((g) => brand.models.some((m) => m.genre === g.key)) : [];
  const keyword = normalizeModel(query);
  const models = brand
    ? brand.models
        .filter((m) => genre === 'all' || m.genre === genre)
        .filter((m) => !keyword || normalizeModel(m.name).includes(keyword))
    : [];
  const pickedModel = brand?.models.find((m) => m.name === picked) ?? null;

  function onBrand(value) {
    setError('');
    if (value === DIRECT) return onDirect('');
    if (value !== brandName) {
      setBrandName(value);
      setGenre('all');
      setQuery('');
      setPicked('');
    }
  }

  function next() {
    if (!brand) return setError('제조사를 골라주세요.');
    if (!pickedModel) return setError('모델을 골라주세요.');
    onNext({ brand: brand.name, model: pickedModel });
  }

  return (
    <div className="model-picker">
      <div className="write-field">
        <div className="write-label">
          <label htmlFor="mp-brand">제조사</label>
          <span className="write-label__sub">필수</span>
        </div>
        <BrandSelect id="mp-brand" options={brandOptions} value={brandName} onChange={onBrand} invalid={Boolean(error && !brand)} />
      </div>

      {brand && (
        <div className="write-field">
          <div className="model-picker__bar">
            <div className="model-search">
              <Icon name="search" size={18} strokeWidth={2} />
              <label htmlFor="mp-search" className="sr-only">모델명 검색</label>
              <input
                id="mp-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="모델명 검색 (예: R15, MT-07)"
                autoComplete="off"
              />
            </div>
            <div className="write-boards model-picker__genres" role="radiogroup" aria-label="장르">
              {[{ key: 'all', label: '전체' }, ...brandGenres].map((g) => (
                <button
                  key={g.key}
                  type="button"
                  role="radio"
                  aria-checked={genre === g.key}
                  className={`write-chip ${genre === g.key ? 'is-active' : ''}`}
                  onClick={() => setGenre(g.key)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          <ModelSlider
            key={`${brand.name}-${genre}-${keyword}`}
            models={models}
            picked={picked}
            onPick={(m) => {
              setPicked(m.name);
              setError('');
            }}
          />
        </div>
      )}

      <div className="model-picked">
        <span className="model-picked__art">
          {pickedModel ? <BikeArt genre={pickedModel.genre} width={72} /> : <Icon name="bike" size={28} />}
        </span>
        <div className="model-picked__info">
          <span className="model-picked__label">선택한 모델</span>
          <strong>
            {pickedModel ? `${brand.name} ${pickedModel.name}` : brand ? '모델을 골라주세요' : '제조사를 먼저 골라주세요'}
            {pickedModel?.old && <span className="model-card__old model-card__old--inline">단종</span>}
          </strong>
          {error && <span className="field__msg field__msg--error" role="alert">{error}</span>}
        </div>
        <button type="button" className="my-link-btn model-picked__direct" onClick={() => onDirect(brand?.name ?? '')}>
          목록에 없나요? 직접 입력
        </button>
        <button type="button" className="btn btn--gold model-picked__next" onClick={next}>
          다음 <Icon name="arrow" size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

// 모델 카드 가로 슬라이드: 화살표 · 마우스로 끌기 · 터치 밀기 + 위치 막대
function ModelSlider({ models, picked, onPick }) {
  const trackRef = useRef(null);
  const drag = useRef(null);
  const [bar, setBar] = useState({ width: 100, left: 0 });
  const [edges, setEdges] = useState({ start: true, end: true });

  function measure() {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const width = el.scrollWidth ? (el.clientWidth / el.scrollWidth) * 100 : 100;
    setBar({ width, left: max > 0 ? (el.scrollLeft / max) * (100 - width) : 0 });
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft >= max - 2 });
  }

  useEffect(() => {
    measure();
    // 수정 화면 등에서 이미 고른 모델이 보이게
    trackRef.current?.querySelector('.model-card.is-active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const scrollByPage = (dir) => {
    const el = trackRef.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  // 마우스로 끌어서 넘기기 (터치는 브라우저 기본 스크롤 사용)
  function onPointerDown(e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { x: e.clientX, left: trackRef.current.scrollLeft, moved: false };
  }
  function onPointerMove(e) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 5) {
      d.moved = true;
      trackRef.current.classList.add('is-dragging');
    }
    if (d.moved) trackRef.current.scrollLeft = d.left - dx;
  }
  function endDrag() {
    if (!drag.current) return;
    trackRef.current.classList.remove('is-dragging');
    if (!drag.current.moved) {
      drag.current = null;
      return;
    }
    // 끌기가 끝난 직후에 오는 클릭은 선택으로 치지 않도록 잠깐 남겨둠
    setTimeout(() => {
      drag.current = null;
    }, 0);
  }

  return (
    <div className="model-slider">
      <div className="model-slider__head">
        <span className="write-label__sub">
          {models.length ? `${models.length}개 모델 · 카드를 눌러 골라주세요` : '찾는 모델이 없어요. 아래 ‘직접 입력’으로 등록할 수 있어요.'}
        </span>
        <div className="model-slider__arrows">
          <button type="button" className="icon-btn" aria-label="이전 모델" onClick={() => scrollByPage(-1)} disabled={edges.start}>
            <Icon name="chevron" size={18} strokeWidth={2} className="rot-90" />
          </button>
          <button type="button" className="icon-btn" aria-label="다음 모델" onClick={() => scrollByPage(1)} disabled={edges.end}>
            <Icon name="chevron" size={18} strokeWidth={2} className="rot--90" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="model-slider__track"
        role="radiogroup"
        aria-label="모델"
        onScroll={measure}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {models.map((m) => (
          <button
            key={m.name}
            type="button"
            role="radio"
            aria-checked={picked === m.name}
            className={`model-card ${picked === m.name ? 'is-active' : ''}`}
            onClick={() => {
              if (drag.current?.moved) return;
              onPick(m);
            }}
          >
            <span className="model-card__check" aria-hidden="true"><Icon name="check" size={14} strokeWidth={2.6} /></span>
            {m.old && <span className="model-card__old">단종</span>}
            <span className="model-card__art"><BikeArt genre={m.genre} width={112} /></span>
            <strong className="model-card__name">{m.name}</strong>
            <span className="model-card__spec">{m.cc.toLocaleString('ko-KR')}cc · {genreLabel(m.genre)}</span>
          </button>
        ))}
      </div>

      <div className="model-slider__progress" aria-hidden="true">
        <i style={{ width: `${bar.width}%`, marginLeft: `${bar.left}%` }} />
      </div>
    </div>
  );
}
