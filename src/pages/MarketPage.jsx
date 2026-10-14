import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import ListingCard, { useListingLikes } from '../components/ListingCard.jsx';
import Pagination from '../components/Pagination.jsx';
import useAsync from '../hooks/useAsync.js';
import { PAGE_SIZE, SEARCH_MAX, fetchListings } from '../api/market.js';
import { brands } from '../data/bikeCatalog.js';
import { genres } from '../data/garage.js';
import { ccRanges, kmRanges, priceRanges, sorts, yearOptions } from '../data/market.js';
import { sidoList } from '../data/regions.js';
import { formatCount } from '../lib/format.js';

export function MarketHead({ title = '중고 매물', desc, action }) {
  return (
    <section className="page-head">
      <div className="container page-head__inner garage-head">
        <div>
          <span className="eyebrow">
            <span className="checker checker--short" aria-hidden="true" />
            <span>USED BIKES</span>
          </span>
          <h1 className="page-head__title">{title}</h1>
          {desc && <p className="muted">{desc}</p>}
        </div>
        {action}
      </div>
    </section>
  );
}

// 상세 필터 (select) — 값은 주소(?brand=&sido=...)에 저장
const selectFilters = [
  { key: 'brand', label: '제조사', all: '전체 제조사', options: brands.map((b) => ({ key: b.name, label: b.name })) },
  { key: 'sido', label: '지역', all: '전국', options: sidoList.map((s) => ({ key: s, label: s })) },
  { key: 'price', label: '가격', all: '가격 전체', options: priceRanges },
  { key: 'cc', label: '배기량', all: '배기량 전체', options: ccRanges },
  { key: 'year', label: '연식', all: '연식 전체', options: yearOptions },
  { key: 'km', label: '주행거리', all: '주행거리 전체', options: kmRanges },
];
const FILTER_KEYS = ['q', 'genre', 'sold', ...selectFilters.map((f) => f.key)];

export default function MarketPage() {
  // 검색·필터·정렬·페이지를 주소에 둬서 뒤로 가기·새로고침·링크 공유가 되게
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? '']));
  const sort = sorts.some((s) => s.key === params.get('sort')) ? params.get('sort') : 'latest';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const sold = filters.sold === '1';

  const list = useAsync(() => fetchListings({ ...filters, sold, sort, page }), [params.toString()]);
  const items = list.data?.items ?? [];
  const likes = useListingLikes(items.map((l) => l.id));
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [input, setInput] = useState(filters.q);
  useEffect(() => setInput(filters.q), [filters.q]);

  // 값 하나 바꾸기 (필터가 바뀌면 1페이지로)
  function update(changes) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next, { preventScrollReset: !('page' in changes) });
  }
  const activeCount = FILTER_KEYS.filter((k) => k !== 'q' && filters[k]).length;

  function onSearch(e) {
    e.preventDefault();
    update({ q: input.trim() });
  }
  function onPage(n) {
    update({ page: n > 1 ? String(n) : '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <MarketHead
        desc="전국 라이더들이 올린 중고 바이크를 한눈에 비교해 보세요"
        action={
          <Link to="/market/new" className="btn btn--gold garage-head__btn">
            <Icon name="tag" size={18} strokeWidth={2} /> 내 바이크 팔기
          </Link>
        }
      />

      <div className="container market-page">
        <section className="card market-filter" aria-label="매물 찾기">
          <form className="board-search market-search" role="search" onSubmit={onSearch}>
            <Icon name="search" size={18} strokeWidth={2} className="market-search__icon" />
            <label htmlFor="market-q" className="sr-only">모델명·브랜드 검색</label>
            <input
              id="market-q"
              type="search"
              value={input}
              maxLength={SEARCH_MAX}
              onChange={(e) => setInput(e.target.value)}
              placeholder="모델명, 브랜드로 검색 (예: MT-07, 혼다)"
            />
            <button type="submit" className="btn btn--gold market-search__btn">검색</button>
          </form>

          <div className="write-boards market-genres" role="radiogroup" aria-label="장르">
            {[{ key: '', label: '전체' }, ...genres.filter((g) => g.key !== 'etc')].map((g) => (
              <button
                key={g.key || 'all'}
                type="button"
                role="radio"
                aria-checked={filters.genre === g.key}
                className={`write-chip ${filters.genre === g.key ? 'is-active' : ''}`}
                onClick={() => update({ genre: g.key })}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="market-selects">
            {selectFilters.map((f) => (
              <div key={f.key} className="market-select">
                <label htmlFor={`mf-${f.key}`} className="sr-only">{f.label}</label>
                <select
                  id={`mf-${f.key}`}
                  className={`my-select ${filters[f.key] ? 'is-set' : ''}`}
                  value={filters[f.key]}
                  onChange={(e) => update({ [f.key]: e.target.value })}
                >
                  <option value="">{f.all}</option>
                  {f.options.map((o) => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="market-filter__foot">
            <div className="check">
              <input id="mf-sold" type="checkbox" checked={sold} onChange={(e) => update({ sold: e.target.checked ? '1' : '' })} />
              <label htmlFor="mf-sold">판매완료 매물도 보기</label>
            </div>
            {(activeCount > 0 || filters.q) && (
              <button type="button" className="my-link-btn" onClick={() => setParams({}, { preventScrollReset: true })}>
                필터 초기화
              </button>
            )}
          </div>
        </section>

        <div className="market-toolbar">
          <p className="market-toolbar__count" aria-live="polite">
            {filters.q && <><strong>‘{filters.q}’</strong> 검색 결과 </>}
            <span className="text-gold">{formatCount(total)}</span>대
          </p>
          <label htmlFor="market-sort" className="sr-only">정렬</label>
          <select id="market-sort" className="my-select market-sort" value={sort} onChange={(e) => update({ sort: e.target.value === 'latest' ? '' : e.target.value })}>
            {sorts.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        {list.error && <div className="card board-empty">매물을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>}

        {list.loading && !list.data && (
          <div className="listing-grid">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="card listing-card listing-card--skeleton" aria-hidden="true" />)}
          </div>
        )}

        {list.data && items.length === 0 && (
          <div className="card market-empty">
            <span className="garage-empty__icon" aria-hidden="true"><Icon name="search" size={32} /></span>
            <h2>조건에 맞는 매물이 없어요</h2>
            <p className="muted">필터를 줄이거나 다른 모델명으로 찾아보세요.</p>
            {(activeCount > 0 || filters.q) && (
              <button type="button" className="btn btn--outline btn--pill" onClick={() => setParams({})}>필터 초기화</button>
            )}
          </div>
        )}

        {items.length > 0 && (
          <div className={`listing-grid ${list.loading ? 'is-loading' : ''}`} aria-busy={list.loading}>
            {items.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                liked={likes.isLiked(l.id)}
                onLike={likes.toggle}
              />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={onPage} />
      </div>
    </>
  );
}
