import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import KakaoMap from '../components/KakaoMap.jsx';
import PlaceCard from '../components/PlaceCard.jsx';
import ShareModal from '../components/ShareModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAsync from '../hooks/useAsync.js';
import {
  REVIEW_MAX,
  createPlaceReview,
  deletePlace,
  deletePlaceReview,
  fetchMyPlaceLike,
  fetchNearbyPlaces,
  fetchPlace,
  fetchPlaceReviews,
  setPlaceLike,
} from '../api/place.js';
import { distanceKm, findPlaceCategory, kakaoMapUrl, kakaoRouteUrl, ratingOf, tagLabel } from '../data/place.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { formatCount, formatDate } from '../lib/format.js';
import NotFoundPage from './NotFoundPage.jsx';

export default function PlaceDetailPage() {
  const { id } = useParams();
  const detail = useAsync(() => fetchPlace(id), [id]);

  if (detail.loading && !detail.data) {
    return (
      <div className="container listing-page">
        <div className="card listing-page__skeleton" aria-busy="true" />
      </div>
    );
  }
  if (detail.error) {
    return (
      <div className="container listing-page">
        <div className="card board-empty">장소를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>
      </div>
    );
  }
  if (!detail.data) return <NotFoundPage />;
  return <PlaceDetail key={detail.data.id} place={detail.data} onReviewed={detail.reload} />;
}

function PlaceDetail({ place, onReviewed }) {
  const p = place;
  const cat = findPlaceCategory(p.category);
  const { isAdmin } = useAuth();
  const reviews = useAsync(() => fetchPlaceReviews(p.id), [p.id]);
  const paragraphs = p.description.split(/\n{2,}|\r\n\r\n/).filter((t) => t.trim());

  // 후기를 쓰거나 지우면 목록과 별점 둘 다 새로
  const reload = useCallback(() => {
    reviews.reload();
    onReviewed();
  }, [reviews, onReviewed]);

  return (
    <div className="container listing-page">
      <nav className="breadcrumb" aria-label="현재 위치">
        <Link to="/place">플레이스</Link>
        <span aria-hidden="true">›</span>
        <Link to={`/place?category=${p.category}`}>{cat?.label}</Link>
        <span aria-hidden="true">›</span>
        <span>{p.name}</span>
      </nav>

      <div className="listing-layout">
        <div className="listing-main">
          <PlaceGallery place={p} />

          <section className="card listing-section">
            <h2 className="listing-section__title">소개</h2>
            {paragraphs.length > 0 ? (
              paragraphs.map((t, i) => <p key={i} className="listing-desc">{t}</p>)
            ) : (
              <p className="muted">아직 소개가 없어요.</p>
            )}
            {p.tags.length > 0 && (
              <div className="place-detail__tags">
                {p.tags.map((t) => (
                  <span key={t} className="place-tag place-tag--lg">
                    <Icon name="check" size={14} strokeWidth={2.4} /> {tagLabel(t)}
                  </span>
                ))}
              </div>
            )}
          </section>

          <ReviewSection place={p} reviews={reviews} onChange={reload} />
        </div>

        <aside className="listing-side">
          <section className="card listing-summary">
            <div className="listing-summary__top">
              <span className="place-card__cat">
                <Icon name={cat?.icon ?? 'pin'} size={16} strokeWidth={2} /> {cat?.label}
                {!p.isPublished && <span className="place-badge">비공개</span>}
              </span>
            </div>
            <h1 className="listing-summary__title">{p.name}</h1>
            {p.reviewCount > 0 ? (
              <p className="place-rating place-rating--lg">
                <Stars value={ratingOf(p)} /> {ratingOf(p).toFixed(1)}
                <span className="muted-2"> · 후기 {formatCount(p.reviewCount)}</span>
              </p>
            ) : (
              <p className="muted-2 place-summary__none">아직 후기가 없어요</p>
            )}

            <dl className="place-info">
              <div>
                <dt><Icon name="pin" size={16} strokeWidth={2} /><span className="sr-only">주소</span></dt>
                <dd>{p.address}</dd>
              </div>
              {p.phone && (
                <div>
                  <dt><Icon name="phone" size={16} strokeWidth={2} /><span className="sr-only">전화</span></dt>
                  <dd><a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`}>{p.phone}</a></dd>
                </div>
              )}
              {p.hours && (
                <div>
                  <dt><Icon name="clock" size={16} strokeWidth={2} /><span className="sr-only">영업시간</span></dt>
                  <dd className="place-info__hours">{p.hours}</dd>
                </div>
              )}
            </dl>

            <PlaceActions place={p} />
            {isAdmin && <AdminActions place={p} />}
          </section>

          {p.lat != null && (
            <section className="card place-mini">
              <KakaoMap places={[p]} selectedId={p.id} zoom={3} className="place-map--mini" />
              <a href={kakaoMapUrl(p)} target="_blank" rel="noopener noreferrer" className="place-mini__link">
                카카오맵에서 크게 보기 <Icon name="arrow" size={14} strokeWidth={2} />
              </a>
            </section>
          )}
        </aside>
      </div>

      <NearbyPlaces place={p} />

      <div className="post-page__footer">
        <Link to="/place" className="btn btn--outline btn--pill">목록으로</Link>
      </div>
    </div>
  );
}

function PlaceGallery({ place }) {
  const [index, setIndex] = useState(0);
  const cat = findPlaceCategory(place.category);
  const urls = place.imageUrls;
  if (!urls.length) {
    return (
      <section className="card listing-gallery" aria-label="장소 사진">
        <div className="listing-gallery__main place-gallery__empty">
          <Icon name={cat?.icon ?? 'pin'} size={64} strokeWidth={1.2} />
          <span>등록된 사진이 없어요</span>
        </div>
      </section>
    );
  }
  const go = (n) => setIndex((n + urls.length) % urls.length);
  return (
    <section className="card listing-gallery" aria-label="장소 사진">
      <div className="listing-gallery__main">
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

// 별 5개 (값만큼 채움)
function Stars({ value, size = 16 }) {
  return (
    <span className="stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={size} strokeWidth={1.8} className={n <= Math.round(value) ? 'is-on' : ''} />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------
// 길찾기 · 찜 · 공유
// ---------------------------------------------------------------------
function PlaceActions({ place }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const myLike = useAsync(() => fetchMyPlaceLike(place.id, user?.id), [place.id, user?.id]);
  const [liked, setLiked] = useState(null);
  const [likes, setLikes] = useState(place.likes);
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const closeShare = useCallback(() => setShareOpen(false), []);
  const isLiked = liked ?? Boolean(myLike.data);

  async function onLike() {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (busy || myLike.loading) return;
    const next = !isLiked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    setBusy(true);
    try {
      await setPlaceLike({ placeId: place.id, userId: user.id, liked: next });
    } catch (err) {
      console.error(err);
      setLiked(!next);
      setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
      window.alert('찜하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="listing-actions">
      <a
        href={place.lat != null ? kakaoRouteUrl(place) : kakaoMapUrl(place)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn--gold listing-actions__main"
      >
        <Icon name="route" size={18} strokeWidth={2} /> 카카오맵 길찾기
      </a>
      <div className="listing-actions__row">
        <button type="button" className={`btn btn--outline listing-like-btn ${isLiked ? 'is-on' : ''}`} aria-pressed={isLiked} onClick={onLike}>
          <Icon name="heart" size={18} strokeWidth={2} /> 찜 {formatCount(likes)}
        </button>
        <button type="button" className="btn btn--outline" onClick={() => setShareOpen(true)} aria-haspopup="dialog">
          <Icon name="share" size={18} strokeWidth={1.8} /> 공유
        </button>
      </div>
      <ShareModal
        open={shareOpen}
        onClose={closeShare}
        url={`${window.location.origin}/place/${place.id}`}
        title={`${place.name} · 모토그라운드 플레이스`}
        description={[findPlaceCategory(place.category)?.label, place.address].filter(Boolean).join(' · ')}
        imageUrl={place.imageUrls[0]}
      />
    </div>
  );
}

function AdminActions({ place }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!window.confirm(`'${place.name}'을(를) 삭제할까요? 후기와 사진도 함께 삭제되고 되돌릴 수 없어요.`)) return;
    setBusy(true);
    try {
      await deletePlace(place);
      navigate('/place', { replace: true });
    } catch (err) {
      console.error(err);
      window.alert('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  }

  return (
    <div className="listing-actions__row place-admin">
      <Link to={`/place/${place.id}/edit`} className="btn btn--outline">
        <Icon name="pen" size={16} strokeWidth={2} /> 수정
      </Link>
      <button type="button" className="btn btn--outline my-btn-danger" onClick={onDelete} disabled={busy}>
        <Icon name="trash" size={16} strokeWidth={2} /> 삭제
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------
// 후기
// ---------------------------------------------------------------------
function ReviewSection({ place, reviews, onChange }) {
  const { user, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const list = reviews.data ?? [];
  const mine = user ? list.find((r) => r.authorId === user.id) : null;
  const [deletingId, setDeletingId] = useState(null);

  async function onDelete(r) {
    if (!window.confirm('후기를 삭제할까요?')) return;
    setDeletingId(r.id);
    try {
      await deletePlaceReview(r.id);
      onChange();
    } catch (err) {
      console.error(err);
      window.alert('후기를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="card listing-section">
      <h2 className="listing-section__title">
        후기 <span className="text-gold">{formatCount(reviews.data && isSupabaseConfigured ? list.length : place.reviewCount)}</span>
      </h2>

      {!user ? (
        <p className="place-review-login">
          <Link to={`/login?next=${encodeURIComponent(pathname)}`}>로그인</Link>하고 다녀온 후기를 남겨보세요.
        </p>
      ) : !isSupabaseConfigured ? (
        <p className="muted-2">예시 장소에는 후기를 남길 수 없어요.</p>
      ) : mine ? (
        <p className="muted-2">이 장소에 이미 후기를 남겼어요. 다시 쓰려면 내 후기를 지우고 새로 남겨주세요.</p>
      ) : (
        reviews.data && place.isPublished && <ReviewForm placeId={place.id} onDone={onChange} />
      )}

      {reviews.error && <p className="muted-2">후기를 불러오지 못했어요.</p>}
      {isSupabaseConfigured && reviews.data && list.length === 0 && <p className="muted-2 place-reviews__empty">첫 후기를 남겨주세요.</p>}
      {list.length > 0 && (
        <ul className="place-reviews">
          {list.map((r) => (
            <li key={r.id} className="place-review">
              <Avatar src={r.avatarUrl} size={36} />
              <div className="place-review__body">
                <div className="place-review__head">
                  <strong>{r.author}</strong>
                  <Stars value={r.rating} size={14} />
                  <span className="muted-2">{formatDate(r.createdAt)}</span>
                  {user && (r.authorId === user.id || isAdmin) && (
                    <button type="button" className="my-link-btn place-review__del" onClick={() => onDelete(r)} disabled={deletingId === r.id}>
                      삭제
                    </button>
                  )}
                </div>
                <p className="place-review__text">{r.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReviewForm({ placeId, onDone }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!rating) return setError('별점을 골라주세요.');
    if (!content.trim()) return setError('후기 내용을 적어주세요.');
    setBusy(true);
    setError('');
    try {
      await createPlaceReview({ placeId, authorId: user.id, rating, content });
      setRating(0);
      setContent('');
      onDone();
    } catch (err) {
      console.error(err);
      setError(err.message?.startsWith('이미') ? err.message : '후기를 등록하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="place-review-form" onSubmit={onSubmit} noValidate>
      <div className="place-review-form__stars" role="radiogroup" aria-label="별점">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n}점`}
            className={`place-star ${n <= rating ? 'is-on' : ''}`}
            onClick={() => {
              setRating(n);
              setError('');
            }}
          >
            <Icon name="star" size={26} strokeWidth={1.8} />
          </button>
        ))}
        <span className="muted-2">{rating ? `${rating}점` : '별점을 골라주세요'}</span>
      </div>
      <label htmlFor="place-review" className="sr-only">후기 내용</label>
      <textarea
        id="place-review"
        className="garage-textarea"
        rows={3}
        maxLength={REVIEW_MAX}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setError('');
        }}
        placeholder="바이크 주차는 편했는지, 라이더에게 추천할 만한지 알려주세요."
      />
      <div className="place-review-form__foot">
        {error ? <p className="field__msg field__msg--error" role="alert">{error}</p> : <span className="write-label__sub">{content.length} / {REVIEW_MAX}</span>}
        <button type="submit" className="btn btn--gold my-btn-sm" disabled={busy}>
          {busy ? '등록 중…' : '후기 등록'}
        </button>
      </div>
    </form>
  );
}

function NearbyPlaces({ place }) {
  const nearby = useAsync(() => fetchNearbyPlaces(place), [place.id]);
  const items = (nearby.data ?? [])
    .map((p) => ({ place: p, distance: distanceKm(place, p) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 4);
  if (!items.length) return null;

  return (
    <section className="listing-similar">
      <div className="section__head">
        <h2 className="explore-level__title">주변 장소</h2>
        <Link to={`/place?sido=${encodeURIComponent(place.region)}`} className="section__more">{place.region} 더 보기</Link>
      </div>
      <div className="place-nearby">
        {items.map(({ place: p, distance }) => (
          <PlaceCard key={p.id} place={p} distance={distance} />
        ))}
      </div>
    </section>
  );
}
