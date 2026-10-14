import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Pagination from '../components/Pagination.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAsync from '../hooks/useAsync.js';
import { boards, boardName } from '../data/community.js';
import { PAGE_SIZE, fetchNotices, fetchPosts, fetchWeeklyTop } from '../api/community.js';
import { formatCount, formatListDate } from '../lib/format.js';

const sorts = [
  { key: 'latest', label: '최신순' },
  { key: 'views', label: '조회순' },
  { key: 'comments', label: '댓글순' },
  { key: 'likes', label: '추천순' },
];

export default function CommunityPage() {
  const { board = 'all' } = useParams();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);
  const current = boards.find((b) => b.slug === board);

  // 게시판·정렬이 바뀌면 1페이지로
  useEffect(() => setPage(1), [board, sort]);

  const list = useAsync(() => fetchPosts({ board, sort, page }), [board, sort, page]);
  const notices = useAsync(() => fetchNotices(2), []);
  const weekly = useAsync(() => fetchWeeklyTop({ limit: 5 }), []);

  if (!current) return <Navigate to="/community" replace />;

  const items = list.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE));
  const showNotices = board !== 'notice' && page === 1;

  return (
    <>
      {/* 페이지 헤더 */}
      <section className="page-head">
        <div className="container page-head__inner">
          <span className="eyebrow">
            <span className="checker checker--short" aria-hidden="true" />
            <span>COMMUNITY</span>
          </span>
          <h1 className="page-head__title">{board === 'all' ? '커뮤니티' : current.name}</h1>
          <p className="muted">{current.desc}</p>
        </div>
      </section>

      <div className="container community">
        {/* 게시판 분류 (데스크톱: 좌측 사이드바 / 모바일: 가로 스크롤 탭) */}
        <aside className="community__side">
          <nav className="board-nav" aria-label="게시판">
            <span className="board-nav__title">게시판</span>
            {boards.map((b) => (
              <Link
                key={b.slug}
                to={b.slug === 'all' ? '/community' : `/community/${b.slug}`}
                className={`board-nav__item ${board === b.slug ? 'is-active' : ''}`}
                aria-current={board === b.slug ? 'page' : undefined}
              >
                {b.name}
              </Link>
            ))}
          </nav>

          <div className="card side-box">
            <span className="side-box__title">주간 인기글</span>
            {weekly.data?.length === 0 && <p className="side-box__empty">이번 주 인기글이 아직 없어요.</p>}
            <ol className="side-rank">
              {(weekly.data ?? []).map((p, i) => (
                <li key={p.id}>
                  <Link to={`/community/post/${p.id}`}>
                    <span className="side-rank__no">{i + 1}</span>
                    <span className="side-rank__title">{p.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <div className="community__main">
          {/* 툴바: 정렬 / 검색 / 글쓰기 */}
          <div className="board-toolbar">
            <div className="sort-tabs" role="tablist" aria-label="정렬">
              {sorts.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={sort === s.key}
                  className={`sort-tab ${sort === s.key ? 'is-active' : ''}`}
                  onClick={() => setSort(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="board-toolbar__right">
              <form className="board-search" role="search" onSubmit={(e) => e.preventDefault()}>
                <label htmlFor="board-search" className="sr-only">게시글 검색</label>
                <input id="board-search" type="search" placeholder="제목, 내용 검색" />
                <button type="submit" aria-label="검색">
                  <Icon name="search" size={18} strokeWidth={2} />
                </button>
              </form>
              <Link
                to={user ? '#write' : `/login?next=${encodeURIComponent(pathname)}`}
                className="btn btn--gold write-btn"
              >
                <Icon name="pen" size={18} strokeWidth={2} />
                <span>글쓰기</span>
              </Link>
            </div>
          </div>

          {/* 목록 */}
          <div className="card board-list" aria-busy={list.loading}>
            <div className="board-row board-row--head" aria-hidden="true">
              <span className="col-no">번호</span>
              <span className="col-cat">분류</span>
              <span className="col-title">제목</span>
              <span className="col-author">작성자</span>
              <span className="col-date">날짜</span>
              <span className="col-num">조회</span>
              <span className="col-num">추천</span>
            </div>

            {showNotices &&
              (notices.data ?? []).map((p) => <PostRow key={`n${p.id}`} post={p} notice />)}

            {list.loading && !list.data &&
              Array.from({ length: 6 }, (_, i) => <div key={i} className="board-row board-row--skeleton" />)}

            {list.error && (
              <div className="board-empty">글을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>
            )}

            {!list.error &&
              items.map((p) => <PostRow key={p.id} post={p} notice={board === 'notice' && p.pinned} />)}

            {!list.loading && !list.error && items.length === 0 && (
              <div className="board-empty">아직 등록된 글이 없어요.</div>
            )}
          </div>

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>
    </>
  );
}

function PostRow({ post, notice = false }) {
  return (
    <Link to={`/community/post/${post.id}`} className={`board-row ${notice ? 'board-row--notice' : ''}`}>
      <span className="col-no">{notice ? <span className="badge-notice">공지</span> : post.id}</span>
      <span className="col-cat">{boardName(post.board)}</span>
      <span className="col-title">
        <span className="col-title__text">{post.title}</span>
        {post.comments > 0 && <span className="comment-count">[{post.comments}]</span>}
      </span>
      <span className="col-author">{post.author}</span>
      <span className="col-date">{formatListDate(post.createdAt)}</span>
      <span className="col-num col-views">{notice ? '-' : formatCount(post.views)}</span>
      <span className="col-num col-likes">{notice ? '-' : post.likes}</span>
    </Link>
  );
}
