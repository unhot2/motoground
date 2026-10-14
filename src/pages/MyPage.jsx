import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import Pagination from '../components/Pagination.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAsync from '../hooks/useAsync.js';
import { boardName } from '../data/community.js';
import { MY_PAGE_SIZE, fetchMyComments, fetchMyLikedPosts, fetchMyPosts, fetchMyStats } from '../api/profile.js';
import { formatCount, formatDate, formatListDate } from '../lib/format.js';

const tabs = [
  { key: 'posts', label: '작성한 글', fetch: fetchMyPosts, empty: '아직 작성한 글이 없어요.' },
  { key: 'comments', label: '작성한 댓글', fetch: fetchMyComments, empty: '아직 작성한 댓글이 없어요.' },
  { key: 'likes', label: '추천한 글', fetch: fetchMyLikedPosts, empty: '아직 추천한 글이 없어요.' },
];

export default function MyPage() {
  const { user, profile, nickname } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = tabs.find((t) => t.key === params.get('tab')) ?? tabs[0];
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [tab.key]);

  const stats = useAsync(() => fetchMyStats(user.id), [user.id]);
  const list = useAsync(() => tab.fetch(user.id, page), [tab.key, user.id, page]);

  const items = list.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / MY_PAGE_SIZE));
  const ride = [profile?.bike_model, profile?.region].filter(Boolean);

  return (
    <>
      {/* 프로필 카드 */}
      <section className="card my-profile" aria-label="내 프로필">
        <Avatar src={profile?.avatar_url} size={88} className="my-profile__avatar" />
        <div className="my-profile__info">
          <h2 className="my-profile__name">
            {nickname || '회원'}
            {profile?.role === 'admin' && <span className="badge-notice">관리자</span>}
          </h2>
          <p className="my-profile__email">{user.email}</p>
          <div className="my-profile__chips">
            {ride.length ? (
              <>
                {profile?.bike_model && (
                  <span className="chip chip--solid"><Icon name="bike" size={16} /> {profile.bike_model}</span>
                )}
                {profile?.region && (
                  <span className="chip chip--solid"><Icon name="pin" size={16} /> {profile.region}</span>
                )}
              </>
            ) : (
              <Link to="/my/edit" className="chip">내 바이크와 활동 지역을 등록해 보세요</Link>
            )}
          </div>
          {profile?.created_at && <p className="my-profile__since">가입일 {formatDate(profile.created_at)}</p>}
        </div>
        <Link to="/my/edit" className="btn btn--outline btn--pill my-profile__edit">
          <Icon name="pen" size={16} strokeWidth={2} /> 프로필 수정
        </Link>

        <dl className="my-stats">
          <div>
            <dt>작성글</dt>
            <dd>{stats.data ? formatCount(stats.data.posts) : '-'}</dd>
          </div>
          <div>
            <dt>댓글</dt>
            <dd>{stats.data ? formatCount(stats.data.comments) : '-'}</dd>
          </div>
          <div>
            <dt>받은 추천</dt>
            <dd>{stats.data ? formatCount(stats.data.likes) : '-'}</dd>
          </div>
        </dl>
      </section>

      {/* 내 활동 */}
      <section className="my-activity" aria-label="내 활동">
        <div className="sort-tabs" role="tablist" aria-label="활동 종류">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab.key === t.key}
              className={`sort-tab ${tab.key === t.key ? 'is-active' : ''}`}
              onClick={() => setParams(t.key === 'posts' ? {} : { tab: t.key }, { replace: true })}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="card my-list" aria-busy={list.loading}>
          {list.loading && !list.data &&
            Array.from({ length: 4 }, (_, i) => <div key={i} className="my-item my-item--skeleton" />)}

          {list.error && <div className="board-empty">목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>}

          {!list.error &&
            items.map((item) =>
              tab.key === 'comments' ? (
                <CommentItem key={item.id} comment={item} />
              ) : (
                <PostItem key={item.id} post={item} showAuthor={tab.key === 'likes'} />
              )
            )}

          {!list.loading && !list.error && items.length === 0 && (
            <div className="board-empty">
              {tab.empty}
              <div>
                <Link to="/community" className="btn btn--outline btn--pill my-empty__btn">커뮤니티 둘러보기</Link>
              </div>
            </div>
          )}
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </section>
    </>
  );
}

function PostItem({ post, showAuthor }) {
  return (
    <Link to={`/community/post/${post.id}`} className="my-item">
      <span className="my-item__cat">{boardName(post.board)}</span>
      <span className="my-item__title">
        <span className="col-title__text">{post.title}</span>
        {post.comments > 0 && <span className="comment-count">[{post.comments}]</span>}
      </span>
      <span className="my-item__meta">
        {showAuthor && <span>{post.author}</span>}
        <span>{formatListDate(post.createdAt)}</span>
        <span>조회 {formatCount(post.views)}</span>
        <span>추천 {formatCount(post.likes)}</span>
      </span>
    </Link>
  );
}

function CommentItem({ comment }) {
  const body = (
    <>
      <span className="my-item__text">{comment.text}</span>
      <span className="my-item__meta">
        {comment.board && <span>{boardName(comment.board)}</span>}
        <span className="my-item__origin">{comment.postTitle}</span>
        <span>{formatListDate(comment.createdAt)}</span>
      </span>
    </>
  );
  return comment.postId ? (
    <Link to={`/community/post/${comment.postId}`} className="my-item my-item--comment">{body}</Link>
  ) : (
    <div className="my-item my-item--comment">{body}</div>
  );
}
