import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import Icon from '../components/Icon.jsx';
import { BrandName } from '../components/BrandLogo.jsx';
import ListingCard, { ListingPhoto, useListingLikes } from '../components/ListingCard.jsx';
import ShareModal from '../components/ShareModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAsync from '../hooks/useAsync.js';
import {
  deleteListing,
  fetchContact,
  fetchListing,
  fetchSellerStats,
  fetchSimilarListings,
  increaseListingView,
  setListingStatus,
} from '../api/market.js';
import { findBrand } from '../data/bikeCatalog.js';
import { genreLabel } from '../data/garage.js';
import { accidentLabel, formatKm, formatPrice, licenseOf, statusLabel, statuses } from '../data/market.js';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { formatAgo, formatCount } from '../lib/format.js';
import NotFoundPage from './NotFoundPage.jsx';

const safetyTips = [
  '차대번호와 등록증의 번호가 같은지 확인하세요',
  '압류·저당이 없는지 이륜차 사용신고 이력을 확인하세요',
  '시승 전에 보험 가입 여부를 꼭 확인하세요',
  '선입금 요구나 외부 결제 링크는 주의하세요',
];

export default function ListingDetailPage() {
  const { id } = useParams();
  const detail = useAsync(() => fetchListing(id), [id]);
  const listing = detail.data;
  const [status, setStatus] = useState(null); // 상태 바꾼 뒤 값

  useEffect(() => {
    if (listing) increaseListingView(listing.id);
    setStatus(null);
  }, [listing]);

  if (detail.loading && !listing) {
    return (
      <div className="container listing-page">
        <div className="card listing-page__skeleton" aria-busy="true" />
      </div>
    );
  }
  if (detail.error) {
    return (
      <div className="container listing-page">
        <div className="card board-empty">매물을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>
      </div>
    );
  }
  if (!listing) return <NotFoundPage />;

  const current = { ...listing, status: status ?? listing.status };
  return <ListingDetail key={listing.id} listing={current} onStatus={setStatus} />;
}

function ListingDetail({ listing, onStatus }) {
  const l = listing;
  const { user, isAdmin } = useAuth();
  const isMine = Boolean(user) && l.sellerId === user.id;
  const canManage = isMine || isAdmin;
  const en = findBrand(l.brand)?.en ?? l.brand;
  const paragraphs = l.description.split(/\n{2,}|\r\n\r\n/).filter((t) => t.trim());

  const specs = [
    ['연식', l.modelYear ? `${l.modelYear}년식` : '-'],
    ['주행거리', l.mileageKm != null ? formatKm(l.mileageKm, { short: false }) : '-'],
    ['배기량', l.cc ? `${formatCount(l.cc)}cc` : '-'],
    ['필요 면허', licenseOf(l.cc) || '-'],
    ['장르', genreLabel(l.genre) || '-'],
    ['사고 이력', accidentLabel(l.accident) || '미입력'],
  ];

  return (
    <div className="container listing-page">
      <nav className="breadcrumb" aria-label="현재 위치">
        <Link to="/market">중고 매물</Link>
        <span aria-hidden="true">›</span>
        <Link to={`/market?brand=${encodeURIComponent(l.brand)}`}>{l.brand}</Link>
        <span aria-hidden="true">›</span>
        <span>{l.model}</span>
      </nav>

      <div className="listing-layout">
        <div className="listing-main">
          <Gallery listing={l} />

          <section className="card listing-section">
            <h2 className="listing-section__title">차량 정보</h2>
            <dl className="listing-specs">
              {specs.map(([label, value]) => (
                <div key={label} className="listing-spec">
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {l.tuning && (
              <div className="listing-tuning">
                <span className="listing-tuning__label">튜닝 내역</span>
                <p>{l.tuning}</p>
              </div>
            )}
          </section>

          <section className="card listing-section">
            <h2 className="listing-section__title">판매자 설명</h2>
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
              <span className="listing-card__brand">
                <BrandName brand={l.brand} en={en} />
                <span aria-hidden="true">·</span>
                {genreLabel(l.genre) || '기타'}
              </span>
              {l.status !== 'selling' && <span className={`listing-status listing-status--${l.status} listing-status--inline`}>{statusLabel(l.status)}</span>}
            </div>
            <h1 className="listing-summary__title">{l.title}</h1>
            <p className="listing-summary__price">{formatPrice(l.price)}</p>
            <p className="listing-summary__meta">
              <Icon name="pin" size={15} strokeWidth={2} /> {l.region}
              <span className="dot" aria-hidden="true">·</span>
              {formatAgo(l.createdAt)}
            </p>

            {l.status === 'sold' && <p className="form-alert form-alert--warn">판매가 완료된 매물이에요.</p>}

            {canManage ? (
              <OwnerActions listing={l} onStatus={onStatus} canEdit={isMine} />
            ) : (
              <BuyerActions listing={l} />
            )}
          </section>

          <SellerCard listing={l} />

          <section className="card listing-safety">
            <h2 className="listing-safety__title">
              <Icon name="shield" size={18} strokeWidth={2} /> 안전거래 체크리스트
            </h2>
            <ul>
              {safetyTips.map((t) => (
                <li key={t}>
                  <Icon name="check" size={16} strokeWidth={2.2} />
                  {t}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <SimilarListings listing={l} />

      <div className="post-page__footer">
        <Link to="/market" className="btn btn--outline btn--pill">목록으로</Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// 사진 갤러리
// ---------------------------------------------------------------------
function Gallery({ listing }) {
  const [index, setIndex] = useState(0);
  const count = listing.imageUrls.length;
  const go = (n) => setIndex((n + count) % count);

  return (
    <section className="card listing-gallery" aria-label="매물 사진">
      <div
        className="listing-gallery__main"
        tabIndex={count > 1 ? 0 : undefined}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') go(index - 1);
          if (e.key === 'ArrowRight') go(index + 1);
        }}
      >
        <ListingPhoto listing={listing} index={index} width={480} />
        {count > 1 && (
          <>
            <button type="button" className="listing-gallery__arrow listing-gallery__arrow--prev" aria-label="이전 사진" onClick={() => go(index - 1)}>
              <Icon name="chevron" size={22} strokeWidth={2} className="rot-90" />
            </button>
            <button type="button" className="listing-gallery__arrow listing-gallery__arrow--next" aria-label="다음 사진" onClick={() => go(index + 1)}>
              <Icon name="chevron" size={22} strokeWidth={2} className="rot--90" />
            </button>
            <span className="listing-gallery__count">{index + 1} / {count}</span>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="listing-gallery__thumbs">
          {listing.imageUrls.map((src, i) => (
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
// 구매자: 연락처 보기 · 찜 · 공유
// ---------------------------------------------------------------------
const isUrl = (text) => /^https?:\/\//i.test(text);
const isPhone = (text) => /^[\d\s()+-]{8,}$/.test(text);

function BuyerActions({ listing }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [likeCount, setLikeCount] = useState(listing.likes);
  const onCount = useCallback((_, diff) => setLikeCount((n) => Math.max(0, n + diff)), []);
  const likes = useListingLikes([listing.id], onCount);
  const liked = likes.isLiked(listing.id);
  const [contact, setContact] = useState(null); // null: 아직 안 봄
  const [contactError, setContactError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const closeShare = useCallback(() => setShareOpen(false), []);

  async function onContact() {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setContactError('');
    try {
      setContact(await fetchContact(listing.id));
    } catch (err) {
      console.error(err);
      setContactError('연락처를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  const description = [listing.modelYear && `${listing.modelYear}년식`, listing.mileageKm != null && formatKm(listing.mileageKm), listing.region]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="listing-actions">
      {contact === null ? (
        <button type="button" className="btn btn--gold listing-actions__main" onClick={onContact} disabled={listing.status === 'sold'}>
          <Icon name="bubble" size={18} strokeWidth={2} />
          {user ? '판매자 연락처 보기' : '로그인하고 연락처 보기'}
        </button>
      ) : (
        <div className="listing-contact" role="status">
          <span className="listing-contact__label">판매자 연락처</span>
          {!contact ? (
            <span className="muted">{isSupabaseConfigured ? '등록된 연락처가 없어요.' : '예시 매물이라 연락처가 없어요.'}</span>
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

      <div className="listing-actions__row">
        <button
          type="button"
          className={`btn btn--outline listing-like-btn ${liked ? 'is-on' : ''}`}
          aria-pressed={liked}
          onClick={() => likes.toggle(listing)}
        >
          <Icon name="heart" size={18} strokeWidth={2} /> 찜 {formatCount(likeCount)}
        </button>
        <button type="button" className="btn btn--outline" onClick={() => setShareOpen(true)} aria-haspopup="dialog">
          <Icon name="share" size={18} strokeWidth={1.8} /> 공유
        </button>
      </div>
      <p className="listing-actions__stats">조회 {formatCount(listing.views)}</p>

      <ShareModal
        open={shareOpen}
        onClose={closeShare}
        url={`${window.location.origin}/market/${listing.id}`}
        title={`${listing.title} · ${formatPrice(listing.price)}`}
        description={description}
        imageUrl={listing.imageUrls[0]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// 판매자: 상태 변경 · 수정 · 삭제
// ---------------------------------------------------------------------
// 사진·연락처는 판매자 본인만 저장할 수 있어서 관리자는 상태 변경·삭제만
function OwnerActions({ listing, onStatus, canEdit }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function changeStatus(next) {
    if (next === listing.status || busy) return;
    setBusy(true);
    setError('');
    try {
      await setListingStatus(listing.id, next);
      onStatus(next);
    } catch (err) {
      console.error(err);
      setError('상태를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!window.confirm('이 매물을 삭제할까요? 사진도 함께 삭제되고 되돌릴 수 없어요.')) return;
    setBusy(true);
    try {
      await deleteListing(listing);
      navigate('/market', { replace: true });
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
        {statuses.map((s) => (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={listing.status === s.key}
            className={`write-chip ${listing.status === s.key ? 'is-active' : ''}`}
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
          <Link to={`/market/${listing.id}/edit`} className="btn btn--outline">
            <Icon name="pen" size={16} strokeWidth={2} /> 수정
          </Link>
        )}
        <button type="button" className="btn btn--outline my-btn-danger" onClick={onDelete} disabled={busy}>
          <Icon name="trash" size={16} strokeWidth={2} /> 삭제
        </button>
      </div>
      <p className="listing-actions__stats">조회 {formatCount(listing.views)} · 찜 {formatCount(listing.likes)}</p>
    </div>
  );
}

function SellerCard({ listing }) {
  const stats = useAsync(() => fetchSellerStats(listing.sellerId), [listing.sellerId]);
  const s = stats.data;
  return (
    <section className="card listing-seller">
      <Avatar src={listing.sellerAvatar} size={44} />
      <div className="listing-seller__info">
        <strong>{listing.seller}</strong>
        <span className="muted-2">
          {s && s.total > 0 ? `올린 매물 ${formatCount(s.total)} · 판매완료 ${formatCount(s.sold)}` : '판매자'}
        </span>
      </div>
    </section>
  );
}

function SimilarListings({ listing }) {
  const similar = useAsync(() => fetchSimilarListings(listing), [listing.id]);
  const items = similar.data ?? [];
  const likes = useListingLikes(items.map((l) => l.id));
  if (!items.length) return null;

  return (
    <section className="listing-similar">
      <div className="section__head">
        <h2 className="explore-level__title">비슷한 매물</h2>
        <Link to={listing.genre ? `/market?genre=${listing.genre}` : '/market'} className="section__more">더 보기</Link>
      </div>
      <div className="listing-grid">
        {items.map((l) => (
          <ListingCard key={l.id} listing={l} liked={likes.isLiked(l.id)} onLike={likes.toggle} />
        ))}
      </div>
    </section>
  );
}
