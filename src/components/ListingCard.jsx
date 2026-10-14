import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BikeArt from './BikeArt.jsx';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchMyListingLikes, setListingLike } from '../api/market.js';
import { findBrand, findModel } from '../data/bikeCatalog.js';
import { formatKm, formatPrice, statusLabel } from '../data/market.js';
import { formatAgo } from '../lib/format.js';

// 매물 카드 (목록 · 비슷한 매물)
export default function ListingCard({ listing, liked, onLike }) {
  const l = listing;
  const en = findBrand(l.brand)?.en ?? l.brand;
  const meta = [l.modelYear && `${l.modelYear}년식`, l.mileageKm != null && formatKm(l.mileageKm), l.region.split(' ').slice(0, 2).join(' ')]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className={`card listing-card ${l.status !== 'selling' ? `is-${l.status}` : ''}`}>
      <Link to={`/market/${l.id}`} className="listing-card__link">
        <div className="listing-card__photo">
          <ListingPhoto listing={l} width={240} />
          {l.status !== 'selling' && <span className={`listing-status listing-status--${l.status}`}>{statusLabel(l.status)}</span>}
          {l.imageUrls.length > 1 && (
            <span className="listing-card__count">
              <Icon name="image" size={13} strokeWidth={2} /> {l.imageUrls.length}
            </span>
          )}
        </div>
        <div className="listing-card__body">
          <span className="listing-card__brand">{en}</span>
          <strong className="listing-card__model">{l.model}</strong>
          <span className="listing-card__title">{l.title}</span>
          <span className="listing-card__price">{formatPrice(l.price)}</span>
          <span className="listing-card__meta">{meta}</span>
          <span className="listing-card__foot">
            {l.accident === 'none' && <span className="listing-tag">무사고</span>}
            <span className="listing-card__ago">{formatAgo(l.createdAt)}</span>
          </span>
        </div>
      </Link>
      {onLike && (
        <button
          type="button"
          className={`listing-like ${liked ? 'is-on' : ''}`}
          aria-pressed={liked}
          aria-label={liked ? `${l.model} 찜 해제` : `${l.model} 찜하기`}
          onClick={() => onLike(l)}
        >
          <Icon name="heart" size={18} strokeWidth={2} />
        </button>
      )}
    </article>
  );
}

// 올린 사진 → 기종 일러스트 → 장르 실루엣 순서로 표시
export function ListingPhoto({ listing, index = 0, width = 240 }) {
  const src = listing.imageUrls[index];
  if (src) return <img src={src} alt="" className="listing-photo__img" loading="lazy" decoding="async" />;
  const model = findModel(listing.brand, listing.model);
  return (
    <BikeArt
      genre={listing.genre}
      image={model?.image}
      width={model?.image ? width : Math.round(width * 0.6)}
      className={model?.image ? 'listing-photo__model' : 'listing-photo__art'}
    />
  );
}

// 찜 상태 + 누르기 (화면에 먼저 반영하고 실패하면 되돌림)
// onCount(id, +1|-1) 로 찜 수 표시를 같이 바꿀 수 있음
export function useListingLikes(ids, onCount) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [liked, setLiked] = useState(() => new Set());
  const [busy, setBusy] = useState(() => new Set());
  const key = ids.join(',');

  useEffect(() => {
    let alive = true;
    fetchMyListingLikes(ids, user?.id)
      .then((set) => alive && setLiked(set))
      .catch((err) => console.error(err));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, user?.id]);

  const toggle = useCallback(
    async (listing) => {
      if (!user) {
        navigate(`/login?next=${encodeURIComponent(pathname + search)}`);
        return;
      }
      if (busy.has(listing.id)) return;
      const next = !liked.has(listing.id);
      const apply = (on) =>
        setLiked((s) => {
          const copy = new Set(s);
          if (on) copy.add(listing.id);
          else copy.delete(listing.id);
          return copy;
        });
      apply(next);
      onCount?.(listing.id, next ? 1 : -1);
      setBusy((s) => new Set(s).add(listing.id));
      try {
        await setListingLike({ listingId: listing.id, userId: user.id, liked: next });
      } catch (err) {
        console.error(err);
        apply(!next);
        onCount?.(listing.id, next ? -1 : 1);
        window.alert('찜하지 못했어요. 잠시 후 다시 시도해 주세요.');
      } finally {
        setBusy((s) => {
          const copy = new Set(s);
          copy.delete(listing.id);
          return copy;
        });
      }
    },
    [user, liked, busy, navigate, pathname, search, onCount]
  );

  return { isLiked: (id) => liked.has(id), toggle };
}
