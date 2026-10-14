import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAsync from '../hooks/useAsync.js';
import { boardName } from '../data/community.js';
import { fetchComments, fetchPost, increaseView } from '../api/community.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { formatCount, formatDateTime } from '../lib/format.js';
import NotFoundPage from './NotFoundPage.jsx';

export default function PostDetailPage() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const { user, nickname } = useAuth();
  const detail = useAsync(() => fetchPost(id), [id]);
  const comments = useAsync(() => fetchComments(id), [id]);

  useEffect(() => {
    if (detail.data?.post) increaseView(detail.data.post.id);
  }, [detail.data]);

  if (detail.loading) {
    return (
      <div className="container post-page">
        <div className="card article article--skeleton" aria-busy="true" />
      </div>
    );
  }
  if (detail.error) {
    return (
      <div className="container post-page">
        <div className="card board-empty">글을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>
      </div>
    );
  }
  if (!detail.data) return <NotFoundPage />;

  const { post, prev, next } = detail.data;
  const boardPath = `/community/${post.board}`;
  const paragraphs = post.content.split(/\n{2,}|\r\n\r\n/).filter((t) => t.trim());
  const commentList = comments.data ?? [];

  return (
    <div className="container post-page">
      {/* 경로 */}
      <nav className="breadcrumb" aria-label="현재 위치">
        <Link to="/community">커뮤니티</Link>
        <span aria-hidden="true">›</span>
        <Link to={boardPath}>{boardName(post.board)}</Link>
      </nav>

      <article className="card article">
        <header className="article__head">
          <Link to={boardPath} className="article__board">{boardName(post.board)}</Link>
          <h1 className="article__title">{post.title}</h1>
          <div className="article__meta">
            <span className="avatar" aria-hidden="true">
              <Icon name="helmet" size={18} />
            </span>
            <span className="article__author">{post.author}</span>
            <span className="dot" aria-hidden="true">·</span>
            <span>{formatDateTime(post.createdAt)}</span>
            <span className="article__stats">
              조회 {formatCount(post.views)} · 댓글 {post.comments} · 추천 {post.likes}
            </span>
          </div>
        </header>

        <div className="article__body">
          {paragraphs.length > 0 ? (
            paragraphs.map((t, i) => (
              <p key={i} className="article__para">{t}</p>
            ))
          ) : (
            <p className="muted">[본문 영역] 게시글 본문이 들어갈 자리입니다.</p>
          )}

          {post.imageUrls.map((src) => (
            <img key={src} src={src} alt="" className="article__img" loading="lazy" />
          ))}

          {!isSupabaseConfigured && post.imageUrls.length === 0 && (
            <div className="img-placeholder" role="img" aria-label="첨부 사진 자리">
              <Icon name="image" size={40} strokeWidth={1.3} />
              <span>첨부 사진</span>
            </div>
          )}
        </div>

        <div className="article__actions">
          <button type="button" className="like-btn">
            <Icon name="heart" size={20} strokeWidth={1.8} />
            <span>추천 {post.likes}</span>
          </button>
          <button type="button" className="ghost-btn">
            <Icon name="share" size={18} strokeWidth={1.8} />
            <span>공유</span>
          </button>
        </div>
      </article>

      {/* 댓글 */}
      <section className="card comments" aria-labelledby="comments-title">
        <h2 id="comments-title" className="comments__title">
          댓글 <span className="text-gold">{comments.data ? commentList.length : post.comments}</span>
        </h2>

        {user ? (
          <form className="comment-form" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="comment-input" className="sr-only">댓글 입력</label>
            <textarea id="comment-input" rows={3} placeholder={`${nickname || '회원'} 님, 댓글을 남겨보세요`} />
            <button type="submit" className="btn btn--gold">등록</button>
          </form>
        ) : (
          <div className="comment-login">
            <span>로그인하면 댓글을 남길 수 있어요.</span>
            <Link to={`/login?next=${encodeURIComponent(pathname)}`} className="btn btn--gold btn--pill">로그인</Link>
          </div>
        )}

        {comments.data && commentList.length === 0 && (
          <p className="comments__empty">첫 댓글을 남겨보세요.</p>
        )}

        <ul className="comment-list">
          {commentList.map((c) => (
            <li key={c.id} className={`comment ${c.reply ? 'comment--reply' : ''}`}>
              <div className="comment__meta">
                <span className="avatar avatar--sm" aria-hidden="true"><Icon name="helmet" size={14} /></span>
                <strong>{c.author}</strong>
                <span>{formatDateTime(c.createdAt)}</span>
              </div>
              <p className="comment__text">{c.text}</p>
              <div className="comment__actions">
                <button type="button">답글</button>
                <button type="button">추천 {c.likes}</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 이전/다음 글 */}
      {(prev || next) && (
        <nav className="card post-nav" aria-label="다른 글">
          {next && (
            <Link to={`/community/post/${next.id}`} className="post-nav__row">
              <span className="post-nav__label">다음글</span>
              <span className="post-nav__title">{next.title}</span>
            </Link>
          )}
          {prev && (
            <Link to={`/community/post/${prev.id}`} className="post-nav__row">
              <span className="post-nav__label">이전글</span>
              <span className="post-nav__title">{prev.title}</span>
            </Link>
          )}
        </nav>
      )}

      <div className="post-page__footer">
        <Link to={boardPath} className="btn btn--outline btn--pill">목록으로</Link>
      </div>
    </div>
  );
}
