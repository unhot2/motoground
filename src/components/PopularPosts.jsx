import { useState } from 'react';
import { Link } from 'react-router-dom';
import { homeBoardTabs } from '../data/menu.js';
import { boardName } from '../data/community.js';
import { fetchWeeklyTop } from '../api/community.js';
import useAsync from '../hooks/useAsync.js';
import { formatCount } from '../lib/format.js';

export default function PopularPosts() {
  const [active, setActive] = useState('all');
  const { data, loading, error } = useAsync(
    () => fetchWeeklyTop({ board: active, limit: 5 }),
    [active]
  );
  const list = data ?? [];

  return (
    <section id="community" className="container section">
      <div className="section__head section__head--wrap">
        <h2 className="section__title">주간 인기 소식</h2>
        <div className="tabs" role="tablist" aria-label="게시판 분류">
          {homeBoardTabs.map((t) => (
            <button
              key={t.slug}
              type="button"
              role="tab"
              aria-selected={active === t.slug}
              className={`tab ${active === t.slug ? 'is-active' : ''}`}
              onClick={() => setActive(t.slug)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card posts" aria-busy={loading}>
        {loading && !data &&
          Array.from({ length: 5 }, (_, i) => <div key={i} className="post post--skeleton" />)}

        {error && <div className="posts__empty">소식을 불러오지 못했어요.</div>}

        {!loading && !error && list.length === 0 && (
          <div className="posts__empty">이번 주 인기 소식이 아직 없어요.</div>
        )}

        {list.map((p, i) => (
          <Link key={p.id} to={`/community/post/${p.id}`} className="post">
            <span className="post__rank">{String(i + 1).padStart(2, '0')}</span>
            <span className="post__cat">{boardName(p.board)}</span>
            <span className="post__title">{p.title}</span>
            <span className="post__meta">
              댓글 {p.comments} · 조회 {formatCount(p.views)}
            </span>
          </Link>
        ))}
        <div className="posts__more">
          <Link to={active === 'all' ? '/community' : `/community/${active}`}>
            바이크 소식 더보기 →
          </Link>
        </div>
      </div>
    </section>
  );
}
