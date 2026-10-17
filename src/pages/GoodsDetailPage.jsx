import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import GoodsCard from '../components/GoodsCard.jsx';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAsync from '../hooks/useAsync.js';
import {
  deleteGoods,
  fetchGoods,
  fetchGoodsContact,
  fetchSimilarGoods,
  increaseGoodsView,
  setGoodsLike,
  setGoodsStatus,
} from '../api/goods.js';
import { categoryLabel, conditionLabel, formatPrice, goodsStatusLabel, goodsStatuses } from '../data/goods.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { formatAgo, formatCount } from '../lib/format.js';
import NotFoundPage from './NotFoundPage.jsx';

export default function GoodsDetailPage() {
  const { id } = useParams();
  const detail = useAsync(() => fetchGoods(id), [id]);
  const goods = detail.data;
  const [status, setStatus] = useState(null); // 상태 바꾼 뒤 값

  useEffect(() => {
    if (goods) increaseGoodsView(goods.id);
    setStatus(null);
  }, [goods]);

  if (detail.loading && !goods) {
    return (
      <div className="container listing-page">
        <div className="card listing-page__skeleton" aria-busy="true" />
      </div>
    );
  }
  if (detail.error) {
    return (
      <div className="container listing-page">
        <div className="card board-empty">용품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>
      </div>
    );
  }
  if (!goods) return <NotFoundPage />;

  const current = { ...goods, status: status ?? goods.status };
  return <GoodsDetail key={goods.id} goods={current} onStatus={setStatus} />;
}

function GoodsDetail({ goods, onStatus }) {
  const g = goods;
  const { user, isAdmin } = useAuth();
  const isMine = Boolean(user) && g.sellerId === user.id;
  const canManage = isMine || isAdmin;
  const paragraphs = g.description.split(/\n{2,}|\r\n\r\n/).filter((t) => t.trim());

  return (
    <div className="container listing-page">
      <nav className="breadcrumb" aria-label="현재 위치">
        <Link to="/goods">용품</Link>
        <span aria-hidden="true">›</span>
        <Link to={`/goods?category=${g.category}`}>{categoryLabel(g.category)}</Link>
        <span aria-hidden="true">›</span>
        <span>{g.title}</span>
      </nav>

      <div className="listing-layout">
        <div className="listing-main">
          <Gallery goods={g} />

          <section className="card listing-section">
            <h2 className="listing-section__title">상품 설명</h2>
            {paragraphs.length > 0 ? (
              paragraphs.map((t, i) => <p key={i} className="listing-desc">{t}</p>)
            ) : (
              <p className="muted">판매자가 남긴 설명이 없어요.</p>
            )}
          </section>
        </div>

        <aside className="listing-side">
          <section className="card listing-summary">
            <div className="listing-summary__top">
              <span className="listing-card__brand">{categoryLabel(g.category) || '용품'}</span>
              {g.status !== 'selling' && <span className={`listing-status listing-status--${g.status} listing-status--inline`}>{goodsStatusLabel(g.status)}</span>}
            </div>
            <h1 className="listing-summary__title">{g.title}</h1>
            <p className="listing-summary__price">{formatPrice(g.price)}</p>

            <dl className="listing-specs goods-specs">
              <div className="listing-spec">
                <dt>브랜드</dt>
                <dd>{g.brand || '-'}</dd>
              </div>
              <div className="listing-spec">
                <dt>사이즈</dt>
                <dd>{g.size || '-'}</dd>
              </div>
              <div className="listing-spec">
                <dt>상태</dt>
                <dd>{conditionLabel(g.condition) || '-'}</dd>
              </div>
            </dl>

            <p className="listing-summary__meta">
              <Icon name="pin" size={15} strokeWidth={2} /> {g.region}
              <span className="dot" aria-hidden="true">·</span>
              {formatAgo(g.createdAt)}
            </p>

            {g.status === 'sold' && <p className="form-alert form-alert--warn">판매가 완료된 용품이에요.</p>}

            {canManage ? (
              <OwnerActions goods={g} onStatus={onStatus} canEdit={isMine} />
            ) : (
              <BuyerActions goods={g} />
            )}
          </section>

          <SellerCard goods={g} />
        </aside>
      </div>

      <SimilarGoods goods={g} />

      <div className="post-page__footer">
        <Link to="/goods" className="btn btn--outline btn--pill">목록으로</Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 사진 갤러리
// ---------------------------------------------------------------------
function Gallery({ goods }) {
  const [index, setIndex] = useState(0);
  const urls = goods.imageUrls;

  if (!urls.length) {
    return (
      <section className="card listing-gallery" aria-label="용품 사진">
        <div className="listing-gallery__main place-gallery__empty">
          <Icon name="helmet" size={64} strokeWidth={1.2} />
          <span>등록된 사진이 없어요</span>
        </div>
      </section>
    );
  }

  const go = (n) => setIndex((n + urls.length) % urls.length);
  return (
    <section className="card listing-gallery" aria-label="용품 사진">
      <div
        className="listing-gallery__main"
        tabIndex={urls.length > 1 ? 0 : undefined}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') go(index - 1);
          if (e.key === 'ArrowRight') go(index + 1);
        }}
      >
        <img src={urls[index]} alt="" className="listing-photo__img" />
        {urls.length > 1 && (
          <>
            <button type="button" className="listing-gallery__arrow listing-gallery__arrow--prev" aria-label="이전 사진" onClick={() => go(index - 1)}>
              <Icon name="chevron" size={22} strokeWidth={2} className="rot-90" />
            </button>
            <button type="button" className="listing-gallery__arrow listing-gallery__arrow--next" aria-label="다음 사진" onClick={() => go(index + 1)}>
              <Icon name="chevron" size={22} strokeWidth={2} className="rot--90" />
            </button>
            <span className="listing-gallery__count">{index + 1} / {urls.length}</span>
          </>
        )}
      </div>
      {urls.length > 1 && (
        <div className="listing-gallery__thumbs">
          {urls.map((src, i) => (
            <button
              key={src}
              type="button"
              className={`listing-gallery__thumb ${i === index ? 'is-active' : ''}`}
              aria-label={`사진 ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
            >
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------
// 구매자: 연락처 보기 · 찜
// ---------------------------------------------------------------------
const isUrl = (text) => /^https?:\/\//i.test(text);
const isPhone = (text) => /^[\d\s()+-]{8,}$/.test(text);

function BuyerActions({ goods }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(goods.likes);
  const [likeBusy, setLikeBusy] = useState(false);
  const [contact, setContact] = useState(null); // null: 아직 안 봄
  const [contactError, setContactError] = useState('');

  async function onLike() {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (likeBusy) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((n) => Math.max(0, n + (next ? 1 : -1)));
    setLikeBusy(true);
    try {
      await setGoodsLike(goods.id, next);
    } catch (err) {
      console.error(err);
      setLiked(!next);
      setLikeCount((n) => Math.max(0, n + (next ? -1 : 1)));
      window.alert('찜하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLikeBusy(false);
    }
  }

  async function onContact() {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setContactError('');
    try {
      setContact(await fetchGoodsContact(goods.id));
    } catch (err) {
      console.error(err);
      setContactError('연락처를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  return (
    <div className="listing-actions">
      {contact === null ? (
        <button type="button" className="btn btn--gold listing-actions__main" onClick={onContact} disabled={goods.status === 'sold'}>
          <Icon name="bubble" size={18} strokeWidth={2} />
          {user ? '연락하기' : '로그인하고 연락하기'}
        </button>
      ) : (
        <div className="listing-contact" role="status">
          <span className="listing-contact__label">판매자 연락처</span>
          {!contact ? (
            <span className="muted">{isSupabaseConfigured ? '등록된 연락처가 없어요.' : '예시 용품이라 연락처가 없어요.'}</span>
          ) : isUrl(contact) ? (
            <a href={contact} target="_blank" rel="noopener noreferrer nofollow" className="listing-contact__value">
              오픈채팅 열기 <Icon name="arrow" size={16} strokeWidth={2} />
            </a>
          ) : isPhone(contact) ? (
            <a href={`tel:${contact.replace(/[^\d+]/g, '')}`} className="listing-contact__value">{contact}</a>
          ) : (
            <span className="listing-contact__value">{contact}</span>
          )}
        </div>
      )}
      {contactError && <p className="field__msg field__msg--error" role="alert">{contactError}</p>}

      <div className="listing-actions__row goods-actions__row">
        <button
          type="button"
          className={`btn btn--outline listing-like-btn ${liked ? 'is-on' : ''}`}
          aria-pressed={liked}
          onClick={onLike}
          disabled={likeBusy}
        >
          <Icon name="heart" size={18} strokeWidth={2} /> 찜 {formatCount(likeCount)}
        </button>
      </div>
      <p className="listing-actions__stats">조회 {formatCount(goods.views)}</p>
    </div>
  );
}

// ---------------------------------------------------------------------
// 판매자: 상태 변경 · 수정 · 삭제
// ---------------------------------------------------------------------
function OwnerActions({ goods, onStatus, canEdit }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function changeStatus(next) {
    if (next === goods.status || busy) return;
    setBusy(true);
    setError('');
    try {
      await setGoodsStatus(goods.id, next);
      onStatus(next);
    } catch (err) {
      console.error(err);
      setError('상태를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!window.confirm('이 용품을 삭제할까요? 사진도 함께 삭제되고 되돌릴 수 없어요.')) return;
    setBusy(true);
    try {
      await deleteGoods(goods.id);
      navigate('/goods', { replace: true });
    } catch (err) {
      console.error(err);
      setError('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  }

  return (
    <div className="listing-actions">
      <div className="listing-owner__label">판매 상태</div>
      <div className="listing-owner__status" role="radiogroup" aria-label="판매 상태">
        {goodsStatuses.map((s) => (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={goods.status === s.key}
            className={`write-chip ${goods.status === s.key ? 'is-active' : ''}`}
            onClick={() => changeStatus(s.key)}
            disabled={busy}
          >
            {s.label}
          </button>
        ))}
      </div>
      {error && <p className="field__msg field__msg--error" role="alert">{error}</p>}
      <div className="listing-actions__row">
        {canEdit && (
          <Link to={`/goods/${goods.id}/edit`} className="btn btn--outline">
            <Icon name="pen" size={16} strokeWidth={2} /> 수정
          </Link>
        )}
        <button type="button" className="btn btn--outline my-btn-danger" onClick={onDelete} disabled={busy}>
          <Icon name="trash" size={16} strokeWidth={2} /> 삭제
        </button>
      </div>
      <p className="listing-actions__stats">조회 {formatCount(goods.views)} · 찜 {formatCount(goods.likes)}</p>
    </div>
  );
}

function SellerCard({ goods }) {
  return (
    <section className="card listing-seller">
      <Avatar src={goods.sellerAvatar} size={44} />
      <div className="listing-seller__info">
        <strong>{goods.seller}</strong>
        <span className="muted-2">판매자</span>
      </div>
    </section>
  );
}

function SimilarGoods({ goods }) {
  const similar = useAsync(() => fetchSimilarGoods(goods.id, goods.category), [goods.id]);
  const items = similar.data ?? [];
  if (!items.length) return null;

  return (
    <section className="listing-similar">
      <div className="section__head">
        <h2 className="explore-level__title">비슷한 용품</h2>
        <Link to={goods.category ? `/goods?category=${goods.category}` : '/goods'} className="section__more">더 보기</Link>
      </div>
      <div className="listing-grid">
        {items.map((g) => (
          <GoodsCard key={g.id} goods={g} />
        ))}
      </div>
    </section>
  );
}
