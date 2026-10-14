import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Avatar from '../components/Avatar.jsx';
import ShareModal from '../components/ShareModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAsync from '../hooks/useAsync.js';
import { boardName } from '../data/community.js';
import {
  COMMENT_MAX,
  createComment,
  deleteComment,
  deletePost,
  fetchComments,
  fetchMyPostLike,
  fetchPost,
  increaseView,
  setPostLike,
} from '../api/community.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { formatCount, formatDateTime } from '../lib/format.js';
import NotFoundPage from './NotFoundPage.jsx';

export default function PostDetailPage() {
  const { id } = useParams();
  const detail = useAsync(() => fetchPost(id), [id]);
  const comments = useAsync(() => fetchComments(id), [id]);
  const [likes, setLikes] = useState(null); // 추천 누른 뒤 바뀐 추천 수
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (detail.data?.post) increaseView(detail.data.post.id);
    setLikes(null);
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
  const commentCount = comments.data ? comments.data.length : post.comments;
  const likeCount = likes ?? post.likes;
  const canManage = Boolean(user) && (post.authorId === user.id || isAdmin);

  async function onDeletePost() {
    if (!window.confirm('이 글을 삭제할까요? 댓글과 사진도 함께 삭제돼요.')) return;
    setDeleting(true);
    try {
      await deletePost(post);
      navigate(boardPath, { replace: true });
    } catch (err) {
      console.error(err);
      window.alert('글을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setDeleting(false);
    }
  }

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
              조회 {formatCount(post.views)} · 댓글 {commentCount} · 추천 {likeCount}
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

        <PostActions post={post} likes={likeCount} onLikesChange={setLikes} />
      </article>

      <CommentSection postId={post.id} comments={comments} fallbackCount={post.comments} />

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
        {canManage && (
          <div className="post-page__manage">
            <Link to={`/community/write?edit=${post.id}`} className="btn btn--outline btn--pill">
              <Icon name="pen" size={16} strokeWidth={2} /> 수정
            </Link>
            <button
              type="button"
              className="btn btn--outline btn--pill my-btn-danger"
              onClick={onDeletePost}
              disabled={deleting}
            >
              <Icon name="trash" size={16} strokeWidth={2} /> {deleting ? '삭제 중…' : '삭제'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 게시글 추천 · 공유
// ---------------------------------------------------------------------
function PostActions({ post, likes, onLikesChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const myLike = useAsync(() => fetchMyPostLike(post.id, user?.id), [post.id, user?.id]);
  const [liked, setLiked] = useState(null); // 누른 뒤 상태 (null 이면 서버 값)
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const closeShare = useCallback(() => setShareOpen(false), []);

  useEffect(() => setLiked(null), [post.id, user?.id]);
  const isLiked = liked ?? Boolean(myLike.data);

  async function onLike() {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (busy || myLike.loading) return;
    const next = !isLiked;
    // 먼저 화면에 반영하고, 실패하면 되돌림
    setLiked(next);
    onLikesChange(Math.max(0, likes + (next ? 1 : -1)));
    setBusy(true);
    try {
      await setPostLike({ postId: post.id, userId: user.id, liked: next });
    } catch (err) {
      console.error(err);
      setLiked(!next);
      onLikesChange(likes);
      window.alert('추천하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  const url = `${window.location.origin}/community/post/${post.id}`;
  const description = post.content.replace(/\s+/g, ' ').trim().slice(0, 80) || `모토그라운드 ${boardName(post.board)}`;

  return (
    <div className="article__actions">
      <button
        type="button"
        className={`like-btn ${isLiked ? 'is-active' : ''}`}
        aria-pressed={isLiked}
        onClick={onLike}
        disabled={busy}
      >
        <Icon name="heart" size={20} strokeWidth={1.8} />
        <span>추천 {formatCount(likes)}</span>
      </button>
      <button type="button" className="ghost-btn" onClick={() => setShareOpen(true)} aria-haspopup="dialog">
        <Icon name="share" size={18} strokeWidth={1.8} />
        <span>공유</span>
      </button>

      <ShareModal
        open={shareOpen}
        onClose={closeShare}
        url={url}
        title={post.title}
        description={description}
        imageUrl={post.imageUrls[0]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// 댓글: 등록 · 답글 · 내 댓글 삭제
// ---------------------------------------------------------------------
function CommentSection({ postId, comments, fallbackCount }) {
  const { pathname } = useLocation();
  const { user, nickname } = useAuth();
  const [replyTo, setReplyTo] = useState(null); // 답글을 달 댓글
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const list = comments.data ?? [];
  const hasReplies = (id) => list.some((c) => c.parentId === id);

  async function submit(content, parentId) {
    await createComment({ postId, authorId: user.id, content, parentId });
    setReplyTo(null);
    comments.reload();
  }

  async function onDelete(c) {
    if (!window.confirm('댓글을 삭제할까요?')) return;
    setError('');
    setDeletingId(c.id);
    try {
      await deleteComment(c.id);
      comments.reload();
    } catch (err) {
      console.error(err);
      setError('댓글을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="card comments" aria-labelledby="comments-title">
      <h2 id="comments-title" className="comments__title">
        댓글 <span className="text-gold">{comments.data ? list.length : fallbackCount}</span>
      </h2>

      {user ? (
        <CommentForm
          id="comment-input"
          placeholder={`${nickname || '회원'} 님, 댓글을 남겨보세요`}
          onSubmit={(content) => submit(content, null)}
        />
      ) : (
        <div className="comment-login">
          <span>로그인하면 댓글을 남길 수 있어요.</span>
          <Link to={`/login?next=${encodeURIComponent(pathname)}`} className="btn btn--gold btn--pill">로그인</Link>
        </div>
      )}

      {error && <p className="form-alert comment-alert" role="alert">{error}</p>}

      {comments.error && <p className="comments__empty">댓글을 불러오지 못했어요.</p>}
      {comments.data && list.length === 0 && <p className="comments__empty">첫 댓글을 남겨보세요.</p>}

      <ul className="comment-list">
        {list.map((c) => {
          const mine = user && c.authorId === user.id;
          const rootId = c.parentId ?? c.id; // 답글의 답글은 같은 댓글 아래로
          return (
            <li key={c.id} className={`comment ${c.reply ? 'comment--reply' : ''}`}>
              <div className="comment__meta">
                <Avatar src={c.avatarUrl} size={26} className="avatar--sm" />
                <strong>{c.author}</strong>
                {mine && <span className="comment__mine">내 댓글</span>}
                <span>{formatDateTime(c.createdAt)}</span>
              </div>
              <p className="comment__text">{c.text}</p>
              <div className="comment__actions">
                {user && (
                  <button
                    type="button"
                    aria-expanded={replyTo?.id === c.id}
                    onClick={() => setReplyTo(replyTo?.id === c.id ? null : { id: c.id, rootId, author: c.author })}
                  >
                    답글
                  </button>
                )}
                <button type="button">추천 {c.likes}</button>
                {mine && !hasReplies(c.id) && (
                  <button type="button" disabled={deletingId === c.id} onClick={() => onDelete(c)}>
                    {deletingId === c.id ? '삭제 중…' : '삭제'}
                  </button>
                )}
              </div>

              {replyTo?.id === c.id && (
                <CommentForm
                  id={`reply-${c.id}`}
                  className="comment-form--reply"
                  placeholder={`${replyTo.author} 님에게 답글 남기기`}
                  autoFocus
                  onCancel={() => setReplyTo(null)}
                  onSubmit={(content) => submit(content, replyTo.rootId)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CommentForm({ id, placeholder, onSubmit, onCancel, autoFocus = false, className = '' }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const content = text.trim();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content || busy) return;
    setError('');
    setBusy(true);
    try {
      await onSubmit(content);
      setText('');
    } catch (err) {
      console.error(err);
      setError('댓글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`comment-form ${className}`} onSubmit={handleSubmit}>
      <div className="comment-form__box">
        <label htmlFor={id} className="sr-only">댓글 입력</label>
        <textarea
          id={id}
          rows={3}
          value={text}
          maxLength={COMMENT_MAX}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Ctrl(⌘)+Enter 로 바로 등록
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e);
          }}
        />
        <div className="comment-form__foot">
          {error ? (
            <span className="field__msg field__msg--error" role="alert">{error}</span>
          ) : (
            <span className="comment-form__count">{text.length} / {COMMENT_MAX}</span>
          )}
        </div>
      </div>
      <div className="comment-form__btns">
        {onCancel && (
          <button type="button" className="btn btn--outline" onClick={onCancel} disabled={busy}>취소</button>
        )}
        <button type="submit" className="btn btn--gold" disabled={!content || busy}>
          {busy ? '등록 중…' : '등록'}
        </button>
      </div>
    </form>
  );
}
