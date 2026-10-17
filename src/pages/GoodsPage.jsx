import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import GoodsCard from '../components/GoodsCard.jsx';
import Icon from '../components/Icon.jsx';
import Pagination from '../components/Pagination.jsx';
import useAsync from '../hooks/useAsync.js';
import { PAGE_SIZE, SEARCH_MAX, fetchGoodsList } from '../api/goods.js';
import { goodsCategories, goodsConditions } from '../data/goods.js';
import { sidoList } from '../data/regions.js';
import { formatCount } from '../lib/format.js';

export function GoodsHead({ title = '용품', desc, action }) {
  return (
    <section className="page-head">
      <div className="container page-head__inner garage-head">
        <div>
          <span className="eyebrow">
            <span className="checker checker--short" aria-hidden="true" />
            <span>GEAR MARKET</span>
          </span>
          <h1 className="page-head__title">{title}</h1>
          {desc && <p className="muted">{desc}</p>}
        </div>
        {action}
      </div>
    </section>
  );
}

// 상세 필터 (select) — 값은 주소(?condition=&region=...)에 저장
// region: fetchGoodsList 가 시·도 접두어로 찾음 (data/regions.js 의 sido)
const selectFilters = [
  { key: 'condition', label: '상태', all: '상태 전체', options: goodsConditions },
  { key: 'region', label: '지역', all: '전국', options: sidoList.map((s) => ({ key: s, label: s })) },
];
const FILTER_KEYS = ['q', 'category', ...selectFilters.map((f) => f.key)];

export default function GoodsPage() {
  // 검색·필터·페이지를 주소에 둬서 뒤로 가기·새로고침·링크 공유가 되게
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? '']));
  const page = Math.max(1, Number(params.get('page')) || 1);

  const list = useAsync(() => fetchGoodsList({ ...filters, page }), [params.toString()]);
  const items = list.data?.items ?? [];
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
      <GoodsHead
        desc="라이더들이 올린 헬멧, 자켓, 보호장비를 한눈에 비교해 보세요"
        action={
          <Link to="/goods/new" className="btn btn--gold garage-head__btn">
            <Icon name="tag" size={18} strokeWidth={2} /> 용품 등록
          </Link>
        }
      />

      <div className="container market-page">
        <section className="card market-filter" aria-label="용품 찾기">
          <form className="board-search market-search" role="search" onSubmit={onSearch}>
            <Icon name="search" size={18} strokeWidth={2} className="market-search__icon" />
            <label htmlFor="goods-q" className="sr-only">용품명·브랜드 검색</label>
            <input
              id="goods-q"
              type="search"
              value={input}
              maxLength={SEARCH_MAX}
              onChange={(e) => setInput(e.target.value)}
              placeholder="용품명, 브랜드로 검색 (예: 아라이 헬멧)"
            />
            <button type="submit" className="btn btn--gold market-search__btn">검색</button>
          </form>

          <div className="write-boards market-genres" role="radiogroup" aria-label="카테고리">
            {[{ key: '', label: '전체' }, ...goodsCategories].map((c) => (
              <button
                key={c.key || 'all'}
                type="button"
                role="radio"
                aria-checked={filters.category === c.key}
                className={`write-chip ${filters.category === c.key ? 'is-active' : ''}`}
                onClick={() => update({ category: c.key })}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="market-selects goods-selects">
            {selectFilters.map((f) => (
              <div key={f.key} className="market-select">
                <label htmlFor={`gf-${f.key}`} className="sr-only">{f.label}</label>
                <select
                  id={`gf-${f.key}`}
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

          {(activeCount > 0 || filters.q) && (
            <div className="market-filter__foot market-filter__foot--end">
              <button type="button" className="my-link-btn" onClick={() => setParams({}, { preventScrollReset: true })}>
                필터 초기화
              </button>
            </div>
          )}
        </section>

        <div className="market-toolbar">
          <p className="market-toolbar__count" aria-live="polite">
            {filters.q && <><strong>‘{filters.q}’</strong> 검색 결과 </>}
            <span className="text-gold">{formatCount(total)}</span>개
          </p>
        </div>

        {list.error && <div className="card board-empty">용품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>}

        {list.loading && !list.data && (
          <div className="listing-grid">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="card listing-card listing-card--skeleton" aria-hidden="true" />)}
          </div>
        )}

        {list.data && items.length === 0 && (
          <div className="card market-empty">
            <span className="garage-empty__icon" aria-hidden="true"><Icon name="search" size={32} /></span>
            <h2>조건에 맞는 용품이 없어요</h2>
            <p className="muted">필터를 줄이거나 다른 이름으로 찾아보세요.</p>
            {(activeCount > 0 || filters.q) && (
              <button type="button" className="btn btn--outline btn--pill" onClick={() => setParams({})}>필터 초기화</button>
            )}
          </div>
        )}

        {items.length > 0 && (
          <div className={`listing-grid ${list.loading ? 'is-loading' : ''}`} aria-busy={list.loading}>
            {items.map((g) => (
              <GoodsCard key={g.id} goods={g} />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={onPage} />
      </div>
    </>
  );
}
