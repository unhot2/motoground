import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { findPlaceCategory, formatDistance, ratingOf, tagLabel } from '../data/place.js';
import { formatCount } from '../lib/format.js';

// 장소 카드 (플레이스 목록 · 주변 장소)
// distance: km (내 위치 또는 기준 장소에서) / active: 지도에서 고른 장소
const PlaceCard = forwardRef(function PlaceCard({ place, distance = null, active = false, onHover }, ref) {
  const p = place;
  const cat = findPlaceCategory(p.category);
  const rating = ratingOf(p);

  return (
    <Link
      ref={ref}
      to={`/place/${p.id}`}
      className={`card place-card ${active ? 'is-active' : ''}`}
      onMouseEnter={onHover && (() => onHover(p.id))}
      onFocus={onHover && (() => onHover(p.id))}
    >
      <span className="place-card__thumb">
        {p.imageUrls[0] ? (
          <img src={p.imageUrls[0]} alt="" loading="lazy" decoding="async" />
        ) : (
          <Icon name={cat?.icon ?? 'pin'} size={30} />
        )}
      </span>
      <span className="place-card__body">
        <span className="place-card__cat">
          {cat?.label}
          {!p.isPublished && <span className="place-badge">비공개</span>}
        </span>
        <strong className="place-card__name">{p.name}</strong>
        <span className="place-card__meta">
          {p.reviewCount > 0 && (
            <span className="place-rating">
              <Icon name="star" size={14} strokeWidth={2} /> {rating.toFixed(1)}
              <span className="muted-2"> ({formatCount(p.reviewCount)})</span>
            </span>
          )}
          <span>{p.address.split(' ').slice(0, 2).join(' ')}</span>
          {distance != null && <span className="place-card__dist">{formatDistance(distance)}</span>}
        </span>
        {p.tags.length > 0 && (
          <span className="place-card__tags">
            {p.tags.slice(0, 3).map((t) => (
              <span key={t} className="place-tag">{tagLabel(t)}</span>
            ))}
          </span>
        )}
      </span>
    </Link>
  );
});

export default PlaceCard;
