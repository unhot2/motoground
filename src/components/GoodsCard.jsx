import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { categoryLabel, formatPrice, goodsStatusLabel } from '../data/goods.js';
import { formatAgo } from '../lib/format.js';

// 용품 카드 (목록 · 비슷한 용품)
export default function GoodsCard({ goods }) {
  const g = goods;
  const meta = [g.brand, g.size].filter(Boolean).join(' · ');

  return (
    <article className={`card listing-card ${g.status !== 'selling' ? `is-${g.status}` : ''}`}>
      <Link to={`/goods/${g.id}`} className="listing-card__link">
        <div className="listing-card__photo">
          <GoodsPhoto goods={g} />
          {g.status !== 'selling' && <span className={`listing-status listing-status--${g.status}`}>{goodsStatusLabel(g.status)}</span>}
          {g.imageUrls.length > 1 && (
            <span className="listing-card__count">
              <Icon name="image" size={13} strokeWidth={2} /> {g.imageUrls.length}
            </span>
          )}
        </div>
        <div className="listing-card__body">
          <span className="listing-card__brand">{categoryLabel(g.category) || '용품'}</span>
          <strong className="listing-card__model">{g.title}</strong>
          {meta && <span className="listing-card__title">{meta}</span>}
          <span className="listing-card__price">{formatPrice(g.price)}</span>
          <span className="listing-card__meta">{g.region}</span>
          <span className="listing-card__foot">
            <span className="listing-tag listing-tag--likes">
              <Icon name="heart" size={13} strokeWidth={2} /> {g.likes}
            </span>
            <span className="listing-card__ago">{formatAgo(g.createdAt)}</span>
          </span>
        </div>
      </Link>
    </article>
  );
}

function GoodsPhoto({ goods }) {
  const src = goods.imageUrls[0];
  if (src) return <img src={src} alt="" className="listing-photo__img" loading="lazy" decoding="async" />;
  return <Icon name="helmet" size={56} strokeWidth={1.2} className="listing-photo__art" />;
}
