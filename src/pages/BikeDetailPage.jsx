import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import BikeArt from '../components/BikeArt.jsx';
import Icon from '../components/Icon.jsx';
import Modal from '../components/Modal.jsx';
import PhotoPicker, { resolvePhotoUrls, toPhotoItems } from '../components/PhotoPicker.jsx';
import { Field } from '../components/AuthCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAsync from '../hooks/useAsync.js';
import {
  RECEIPT_PHOTO_MAX,
  createLog,
  deleteLog,
  fetchBike,
  removeGarageImages,
  saveIntervals,
  updateLog,
  updateMileage,
  uploadGarageImages,
} from '../api/garage.js';
import {
  bikeStatus,
  bikeTitle,
  categories,
  categoryLabel,
  defaultItems,
  genreLabel,
  itemLabel,
  levelText,
  resolveIntervals,
} from '../data/garage.js';
import { findModel } from '../data/bikeCatalog.js';
import { formatCount, formatDate } from '../lib/format.js';
import { GarageHead } from './GaragePage.jsx';

const tabs = [
  { key: 'overview', label: '개요' },
  { key: 'logs', label: '정비 기록' },
  { key: 'costs', label: '비용' },
];

const won = (n) => `${formatCount(n)}원`;
const todayText = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function BikeDetailPage() {
  const { id } = useParams();
  const detail = useAsync(() => fetchBike(id), [id]);
  const [params, setParams] = useSearchParams();
  const tab = tabs.find((t) => t.key === params.get('tab'))?.key ?? 'overview';

  // 모달: { type: 'log', log?, items? } | { type: 'mileage' } | { type: 'intervals' }
  const [modal, setModal] = useState(null);
  const close = () => setModal(null);

  if (detail.loading && !detail.data) {
    return (
      <>
        <GarageHead />
        <div className="container garage"><div className="card garage-form my-loading" aria-busy="true" /></div>
      </>
    );
  }
  if (detail.error || !detail.data) {
    return (
      <>
        <GarageHead />
        <div className="container garage">
          <div className="card board-empty">
            바이크를 찾을 수 없어요. 삭제됐거나 내 바이크가 아니에요. <Link to="/garage">내 차고로</Link>
          </div>
        </div>
      </>
    );
  }

  const { bike, logs } = detail.data;
  const intervals = resolveIntervals(detail.data.intervals);
  const status = bikeStatus(intervals, logs, bike.currentKm);
  const spec = [`${bike.brand} ${bike.model}`, bike.modelYear, bike.cc && `${formatCount(bike.cc)}cc`, genreLabel(bike.genre)]
    .filter(Boolean)
    .join(' · ');
  // 기종 일러스트 우선, 없으면 올린 사진 → 장르 실루엣
  const modelImage = findModel(bike.brand, bike.model)?.image;
  const bought = [bike.purchasedOn && `구매 ${formatDate(bike.purchasedOn)}`, bike.purchaseKm != null && `구매 시 ${formatCount(bike.purchaseKm)}km`]
    .filter(Boolean)
    .join(' · ');
  const openLog = (extra = {}) => setModal({ type: 'log', ...extra });

  return (
    <>
      <GarageHead title={bikeTitle(bike)} />
      <div className="container garage garage--detail">
        <nav className="breadcrumb" aria-label="현재 위치">
          <Link to="/garage">내 차고</Link>
          <span aria-hidden="true">›</span>
          <span>{bikeTitle(bike)}</span>
        </nav>

        {/* 바이크 정보 */}
        <section className="card bike-hero">
          <div className="bike-hero__photo">
            {modelImage ? (
              <BikeArt image={modelImage} width={360} className="bike-hero__model" />
            ) : bike.imageUrls[0] ? (
              <img src={bike.imageUrls[0]} alt="" />
            ) : (
              <BikeArt genre={bike.genre} width={180} className="bike-hero__model" />
            )}
          </div>
          <div className="bike-hero__info">
            <h2 className="bike-hero__name">
              {bikeTitle(bike)}
              {bike.isMain && <span className="bike-card__main bike-card__main--inline">대표</span>}
            </h2>
            <p className="bike-hero__spec">{spec}</p>
            {bought && <p className="bike-hero__sub">{bought}</p>}
            <Link to={`/garage/${bike.id}/edit`} className="my-link-btn bike-hero__edit">바이크 정보 수정</Link>
          </div>
          <div className="bike-hero__km">
            <span className="bike-hero__km-label">현재 주행거리</span>
            <strong>{formatCount(bike.currentKm)} km</strong>
            <button type="button" className="btn btn--outline btn--pill my-btn-sm" onClick={() => setModal({ type: 'mileage' })}>
              주행거리 업데이트
            </button>
          </div>
        </section>

        {/* 탭 */}
        <div className="garage-tabs">
          <div className="sort-tabs" role="tablist" aria-label="바이크 정보">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={`sort-tab ${tab === t.key ? 'is-active' : ''}`}
                onClick={() => setParams(t.key === 'overview' ? {} : { tab: t.key }, { replace: true })}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--gold garage-add-btn" onClick={() => openLog()}>
            <Icon name="plus" size={18} strokeWidth={2} /> 기록 추가
          </button>
        </div>

        {tab === 'overview' && (
          <Overview
            logs={logs}
            status={status}
            onOpenIntervals={() => setModal({ type: 'intervals' })}
            onShowLogs={() => setParams({ tab: 'logs' }, { replace: true })}
            onEditLog={(log) => openLog({ log })}
          />
        )}
        {tab === 'logs' && <LogsTab logs={logs} onEdit={(log) => openLog({ log })} onChanged={detail.reload} />}
        {tab === 'costs' && <CostsTab logs={logs} />}
      </div>

      <Modal open={modal?.type === 'log'} onClose={close} title={modal?.log ? '기록 수정' : '기록 추가'} className="garage-modal" closeOnBackdrop={false}>
        <LogForm
          bike={bike}
          log={modal?.log}
          presetItems={modal?.items}
          onDone={() => {
            close();
            detail.reload();
          }}
          onCancel={close}
        />
      </Modal>
      <Modal open={modal?.type === 'mileage'} onClose={close} title="주행거리 업데이트">
        <MileageForm
          bike={bike}
          onDone={() => {
            close();
            detail.reload();
          }}
        />
      </Modal>
      <Modal open={modal?.type === 'intervals'} onClose={close} title="소모품 교체 주기" className="garage-modal" closeOnBackdrop={false}>
        <IntervalForm
          bikeId={bike.id}
          intervals={intervals}
          onDone={() => {
            close();
            detail.reload();
          }}
          onCancel={close}
        />
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------
// 개요: 소모품 상태판 + 올해 유지비 + 최근 정비
// ---------------------------------------------------------------------
function Overview({ logs, status, onOpenIntervals, onShowLogs, onEditLog }) {
  const year = new Date().getFullYear();
  const yearLogs = logs.filter((l) => l.performedOn.startsWith(String(year)));
  const recent = logs.filter((l) => l.category === 'maintenance').slice(0, 3);

  return (
    <div className="garage-overview">
      <section className="card garage-box" aria-labelledby="status-title">
        <div className="garage-box__head">
          <h3 id="status-title">소모품 상태</h3>
          <button type="button" className="my-link-btn" onClick={onOpenIntervals}>
            <Icon name="sliders" size={16} /> 주기 설정
          </button>
        </div>
        {status.length === 0 && <p className="garage-box__empty">보이는 소모품이 없어요. 주기 설정에서 켜주세요.</p>}
        <ul className="parts">
          {status.map((s) => (
            <li key={s.key} className="part">
              <div className="part__top">
                <span className="part__name">{s.label}</span>
                <span className={`lv lv--${s.level}`}>{levelText[s.level]}</span>
              </div>
              <div className="part__bar" aria-hidden="true">
                <i className={`part__fill part__fill--${s.level}`} style={{ width: `${Math.min(100, Math.round(s.ratio * 100))}%` }} />
              </div>
              <div className="part__meta">
                <span>{s.text}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="garage-overview__side">
        <section className="card garage-box" aria-labelledby="cost-title">
          <div className="garage-box__head">
            <h3 id="cost-title">{year}년 유지비</h3>
          </div>
          <strong className="garage-total">{won(yearLogs.reduce((sum, l) => sum + l.cost, 0))}</strong>
          <MonthBars logs={yearLogs} compact />
          <CategoryShare logs={yearLogs} />
        </section>

        <section className="card garage-box" aria-labelledby="recent-title">
          <div className="garage-box__head">
            <h3 id="recent-title">최근 정비</h3>
            {recent.length > 0 && <button type="button" className="my-link-btn" onClick={onShowLogs}>전체 보기</button>}
          </div>
          {recent.length === 0 && <p className="garage-box__empty">아직 정비 기록이 없어요.</p>}
          <ul className="recent">
            {recent.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => onEditLog(l)}>
                  <span className="recent__title">{l.items.map(itemLabel).join(', ') || categoryLabel(l.category)}</span>
                  <span className="recent__meta">
                    {formatDate(l.performedOn)}
                    {l.odometerKm != null && ` · ${formatCount(l.odometerKm)}km`}
                    {l.shop && ` · ${l.shop}`}
                    {l.cost > 0 && ` · ${won(l.cost)}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

// 월별 막대 (이번 달 강조)
function MonthBars({ logs, compact = false, year = new Date().getFullYear() }) {
  const sums = Array.from({ length: 12 }, (_, m) =>
    logs.filter((l) => Number(l.performedOn.slice(5, 7)) === m + 1).reduce((s, l) => s + l.cost, 0)
  );
  const max = Math.max(...sums, 1);
  const now = new Date();
  const thisMonth = now.getFullYear() === year ? now.getMonth() : -1;
  return (
    <div className={`month-bars ${compact ? 'month-bars--compact' : ''}`} role="img" aria-label={`${year}년 월별 유지비`}>
      {sums.map((v, m) => (
        <div key={m} className="month-bars__col" title={`${m + 1}월 ${won(v)}`}>
          {!compact && v > 0 && <span className="month-bars__val">{v >= 10000 ? `${Math.round(v / 10000)}만` : formatCount(v)}</span>}
          <i className={m === thisMonth ? 'is-now' : ''} style={{ height: `${Math.max(v ? 6 : 2, (v / max) * 100)}%` }} />
          <span className="month-bars__label">{m + 1}</span>
        </div>
      ))}
    </div>
  );
}

// 분류별 비율
function CategoryShare({ logs }) {
  const total = logs.reduce((s, l) => s + l.cost, 0);
  if (!total) return <p className="garage-box__empty">올해 기록된 비용이 없어요.</p>;
  const rows = categories
    .map((c) => ({ ...c, sum: logs.filter((l) => l.category === c.key).reduce((s, l) => s + l.cost, 0) }))
    .filter((c) => c.sum > 0);
  return (
    <>
      <div className="share-bar" aria-hidden="true">
        {rows.map((c) => <i key={c.key} style={{ width: `${(c.sum / total) * 100}%`, background: c.color }} />)}
      </div>
      <p className="share-legend">
        {rows.map((c) => (
          <span key={c.key}>
            <i style={{ background: c.color }} aria-hidden="true" /> {c.label} {Math.round((c.sum / total) * 100)}%
          </span>
        ))}
      </p>
    </>
  );
}

// ---------------------------------------------------------------------
// 정비 기록 탭
// ---------------------------------------------------------------------
function LogsTab({ logs, onEdit, onChanged }) {
  const [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);
  const list = filter === 'all' ? logs : logs.filter((l) => l.category === filter);

  async function onDelete(log) {
    if (!window.confirm('이 기록을 삭제할까요?')) return;
    setDeleting(log.id);
    try {
      await deleteLog(log);
      onChanged();
    } catch (err) {
      console.error(err);
      window.alert('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="card garage-box" aria-label="정비 기록">
      <div className="write-boards garage-filter" role="radiogroup" aria-label="분류">
        {[{ key: 'all', label: '전체' }, ...categories].map((c) => (
          <button
            key={c.key}
            type="button"
            role="radio"
            aria-checked={filter === c.key}
            className={`write-chip ${filter === c.key ? 'is-active' : ''}`}
            onClick={() => setFilter(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {list.length === 0 && <p className="garage-box__empty garage-box__empty--center">기록이 없어요. 오른쪽 위 ‘기록 추가’로 남겨보세요.</p>}

      <ul className="logs">
        {list.map((l) => (
          <li key={l.id} className="log">
            <div className="log__date">
              <strong>{formatDate(l.performedOn).slice(5)}</strong>
              <span>{l.performedOn.slice(0, 4)}</span>
            </div>
            <div className="log__body">
              <div className="log__title">
                <span className={`log__cat log__cat--${l.category}`}>{categoryLabel(l.category)}</span>
                {l.items.length > 0 && <span>{l.items.map(itemLabel).join(', ')}</span>}
              </div>
              <div className="log__meta">
                {l.odometerKm != null && <span>{formatCount(l.odometerKm)}km</span>}
                {l.shop && <span>{l.shop}</span>}
              </div>
              {l.memo && <p className="log__memo">{l.memo}</p>}
              {l.imageUrls.length > 0 && (
                <div className="log__photos">
                  {l.imageUrls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt="영수증 사진" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="log__side">
              <strong className="log__cost">{won(l.cost)}</strong>
              <div className="log__actions">
                <button type="button" onClick={() => onEdit(l)}>수정</button>
                <button type="button" onClick={() => onDelete(l)} disabled={deleting === l.id}>
                  {deleting === l.id ? '삭제 중…' : '삭제'}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------
// 비용 탭
// ---------------------------------------------------------------------
function CostsTab({ logs }) {
  const thisYear = new Date().getFullYear();
  const years = [...new Set([thisYear, ...logs.map((l) => Number(l.performedOn.slice(0, 4)))])].sort((a, b) => b - a);
  const [year, setYear] = useState(thisYear);
  const yearLogs = logs.filter((l) => l.performedOn.startsWith(String(year)));
  const total = yearLogs.reduce((s, l) => s + l.cost, 0);
  const allTotal = logs.reduce((s, l) => s + l.cost, 0);
  const monthsWithCost = new Set(yearLogs.filter((l) => l.cost > 0).map((l) => l.performedOn.slice(5, 7))).size;

  return (
    <div className="garage-costs">
      <div className="garage-costs__stats">
        <div className="card garage-stat">
          <label htmlFor="cost-year" className="garage-stat__label">연도</label>
          <select id="cost-year" className="my-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
        </div>
        <div className="card garage-stat">
          <span className="garage-stat__label">{year}년 합계</span>
          <strong>{won(total)}</strong>
        </div>
        <div className="card garage-stat">
          <span className="garage-stat__label">월 평균 (지출한 달 기준)</span>
          <strong>{won(monthsWithCost ? Math.round(total / monthsWithCost) : 0)}</strong>
        </div>
        <div className="card garage-stat">
          <span className="garage-stat__label">전체 누적</span>
          <strong>{won(allTotal)}</strong>
        </div>
      </div>

      <section className="card garage-box">
        <div className="garage-box__head"><h3>월별 유지비</h3></div>
        <MonthBars logs={yearLogs} year={year} />
      </section>

      <section className="card garage-box">
        <div className="garage-box__head"><h3>분류별</h3></div>
        <ul className="cat-rows">
          {categories.map((c) => {
            const sum = yearLogs.filter((l) => l.category === c.key).reduce((s, l) => s + l.cost, 0);
            const count = yearLogs.filter((l) => l.category === c.key).length;
            return (
              <li key={c.key}>
                <span className="cat-rows__name"><i style={{ background: c.color }} aria-hidden="true" /> {c.label}</span>
                <span className="cat-rows__bar" aria-hidden="true">
                  <i style={{ width: total ? `${(sum / total) * 100}%` : 0, background: c.color }} />
                </span>
                <span className="cat-rows__sum">{won(sum)} <span className="muted">· {count}건</span></span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------
// 기록 추가·수정
// ---------------------------------------------------------------------
function LogForm({ bike, log, presetItems, onDone, onCancel }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    category: log?.category ?? 'maintenance',
    items: log?.items ?? presetItems ?? [],
    performedOn: log?.performedOn ?? todayText(),
    odometerKm: log?.odometerKm ?? (log ? '' : bike.currentKm),
    cost: log?.cost ?? '',
    shop: log?.shop ?? '',
    memo: log?.memo ?? '',
  });
  const [custom, setCustom] = useState('');
  const [images, setImages] = useState(() => toPhotoItems(log?.imageUrls));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleItem = (key) => {
    setForm((f) => ({ ...f, items: f.items.includes(key) ? f.items.filter((k) => k !== key) : [...f.items, key] }));
    setError('');
  };
  const customItems = form.items.filter((k) => !defaultItems.some((d) => d.key === k));

  function addCustom() {
    const name = custom.trim();
    if (!name) return;
    if (!form.items.includes(name)) setForm((f) => ({ ...f, items: [...f.items, name] }));
    setCustom('');
    setError('');
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.category === 'maintenance' && form.items.length === 0) return setError('정비한 항목을 하나 이상 골라주세요.');
    if (!form.performedOn) return setError('날짜를 입력해 주세요.');
    if (form.cost !== '' && Number(form.cost) < 0) return setError('비용을 확인해 주세요.');

    setBusy(true);
    let uploaded = [];
    try {
      const photos = await resolvePhotoUrls(images, (files) => uploadGarageImages(user.id, files));
      uploaded = photos.uploaded;
      const odometer = form.odometerKm === '' ? null : Number(form.odometerKm);
      const payload = { ...form, odometerKm: odometer, cost: Number(form.cost || 0), imageUrls: photos.urls };
      if (log) {
        await updateLog(log.id, payload);
        await removeGarageImages(log.imageUrls.filter((u) => !photos.urls.includes(u)));
      } else {
        await createLog(user.id, bike.id, payload);
      }
      // 기록한 주행거리가 더 크면 현재 주행거리도 올림
      if (odometer != null && odometer > bike.currentKm) await updateMileage(bike.id, odometer);
      onDone();
    } catch (err) {
      console.error(err);
      await removeGarageImages(uploaded);
      setError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  }

  return (
    <form className="garage-modal__form" onSubmit={onSubmit} noValidate>
      <div className="write-field">
        <span className="write-label">분류</span>
        <div className="write-boards" role="radiogroup" aria-label="분류">
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={form.category === c.key}
              className={`write-chip ${form.category === c.key ? 'is-active' : ''}`}
              onClick={() => setForm((f) => ({ ...f, category: c.key }))}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {form.category === 'maintenance' && (
        <div className="write-field">
          <span className="write-label">
            정비 항목 <span className="write-label__sub">여러 개 고를 수 있어요</span>
          </span>
          <div className="write-boards item-chips">
            {defaultItems.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={form.items.includes(item.key)}
                className={`write-chip ${form.items.includes(item.key) ? 'is-active' : ''}`}
                onClick={() => toggleItem(item.key)}
              >
                {item.label}
              </button>
            ))}
            {customItems.map((name) => (
              <button key={name} type="button" aria-pressed="true" className="write-chip is-active" onClick={() => toggleItem(name)}>
                {name} ✕
              </button>
            ))}
          </div>
          <div className="item-custom">
            <input
              type="text"
              aria-label="직접 입력할 항목"
              placeholder="직접 입력 (예: 클러치 케이블)"
              value={custom}
              maxLength={20}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
            <button type="button" className="btn btn--outline my-btn-sm" onClick={addCustom}>추가</button>
          </div>
        </div>
      )}

      <div className="garage-modal__grid">
        <Field id="lg-date" label="날짜">
          <input id="lg-date" type="date" value={form.performedOn} onChange={set('performedOn')} max={todayText()} />
        </Field>
        <Field id="lg-km" label="주행거리 km">
          <input id="lg-km" type="number" inputMode="numeric" min={0} value={form.odometerKm} onChange={set('odometerKm')} />
        </Field>
        <Field id="lg-cost" label="비용 (원)">
          <input id="lg-cost" type="number" inputMode="numeric" min={0} step={100} value={form.cost} onChange={set('cost')} placeholder="0" />
        </Field>
        <Field id="lg-shop" label="정비한 곳">
          <input id="lg-shop" type="text" value={form.shop} onChange={set('shop')} maxLength={40} placeholder="직접 / 센터 이름" />
        </Field>
      </div>

      <div className="field">
        <div className="field__top"><label htmlFor="lg-memo" className="field__label">메모</label></div>
        <textarea id="lg-memo" className="garage-textarea" rows={3} maxLength={500} value={form.memo} onChange={set('memo')} placeholder="오일 종류, 특이사항 등" />
      </div>

      <div className="write-field">
        <span className="write-label">영수증 사진</span>
        <PhotoPicker images={images} onChange={setImages} max={RECEIPT_PHOTO_MAX} showMain={false} label="영수증 사진" />
      </div>

      {error && <p className="form-alert" role="alert">{error}</p>}

      <div className="my-actions">
        <button type="button" className="btn btn--outline" onClick={onCancel} disabled={busy}>취소</button>
        <button type="submit" className="btn btn--gold" disabled={busy}>{busy ? '저장하는 중…' : '저장'}</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------
// 주행거리 업데이트
// ---------------------------------------------------------------------
function MileageForm({ bike, onDone }) {
  const [km, setKm] = useState(String(bike.currentKm));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const value = Number(km);
    if (km === '' || !Number.isInteger(value) || value < 0) return setError('주행거리를 숫자로 입력해 주세요.');
    if (value < bike.currentKm && !window.confirm('지금보다 작은 값이에요. 그래도 바꿀까요?')) return;
    setBusy(true);
    try {
      await updateMileage(bike.id, value);
      onDone();
    } catch (err) {
      console.error(err);
      setError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  }

  return (
    <form className="garage-modal__form" onSubmit={onSubmit} noValidate>
      <Field id="mi-km" label="계기판 주행거리 (km)" error={error} hint={`지금 기록: ${formatCount(bike.currentKm)}km`}>
        <input
          id="mi-km"
          type="number"
          inputMode="numeric"
          min={0}
          value={km}
          onChange={(e) => {
            setKm(e.target.value);
            setError('');
          }}
          aria-describedby="mi-km-msg"
        />
      </Field>
      <div className="my-actions">
        <button type="submit" className="btn btn--gold" disabled={busy}>{busy ? '저장하는 중…' : '저장'}</button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------
// 소모품 교체 주기 + 소모품 상태에 보일지 말지
// ---------------------------------------------------------------------
function IntervalForm({ bikeId, intervals, onDone, onCancel }) {
  const [rows, setRows] = useState(() =>
    intervals.map((i) => {
      const base = defaultItems.find((d) => d.key === i.key);
      return {
        key: i.key,
        label: i.label,
        km: i.km ?? '',
        months: i.months ?? '',
        defaultKm: base.km,
        defaultMonths: base.months,
        on: Boolean(i.km || i.months),
      };
    })
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (key, field, value) => setRows((list) => list.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  // 다시 켤 때 주기가 비어 있으면 기본값으로 채움
  const toggle = (key) =>
    setRows((list) =>
      list.map((r) => {
        if (r.key !== key) return r;
        if (r.on) return { ...r, on: false };
        const empty = r.km === '' && r.months === '';
        return { ...r, on: true, ...(empty ? { km: r.defaultKm ?? '', months: r.defaultMonths ?? '' } : {}) };
      })
    );
  const resetAll = () => setRows((list) => list.map((r) => ({ ...r, on: true, km: r.defaultKm ?? '', months: r.defaultMonths ?? '' })));

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const items = rows.map((r) => ({
      ...r,
      km: r.km === '' ? null : Number(r.km),
      months: r.months === '' ? null : Number(r.months),
    }));
    const on = items.filter((r) => r.on);
    if (on.some((r) => (r.km != null && r.km <= 0) || (r.months != null && r.months <= 0))) {
      return setError('주기는 0보다 큰 숫자로 입력해 주세요.');
    }
    const empty = on.find((r) => r.km == null && r.months == null);
    if (empty) return setError(`'${empty.label}'의 km나 개월 중 하나는 입력하거나 숨겨주세요.`);
    setBusy(true);
    try {
      await saveIntervals(bikeId, items);
      onDone();
    } catch (err) {
      console.error(err);
      setError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  }

  return (
    <form className="garage-modal__form" onSubmit={onSubmit} noValidate>
      <p className="muted garage-modal__desc">
        먼저 오는 쪽을 기준으로 계산해요. 숨긴 소모품은 소모품 상태에 보이지 않아요.
      </p>
      <div className="intervals">
        <div className="intervals__head" aria-hidden="true">
          <span>항목</span>
          <span>km</span>
          <span>개월</span>
          <span>표시</span>
        </div>
        {rows.map((r) => (
          <div key={r.key} className={`intervals__row ${r.on ? '' : 'is-off'}`}>
            <span className="intervals__name">{r.label}</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              aria-label={`${r.label} 교체 주기 km`}
              value={r.on ? r.km : ''}
              placeholder="-"
              disabled={!r.on}
              onChange={(e) => change(r.key, 'km', e.target.value)}
            />
            <input
              type="number"
              inputMode="numeric"
              min={1}
              aria-label={`${r.label} 교체 주기 개월`}
              value={r.on ? r.months : ''}
              placeholder="-"
              disabled={!r.on}
              onChange={(e) => change(r.key, 'months', e.target.value)}
            />
            <button
              type="button"
              className={`intervals__toggle ${r.on ? 'is-on' : ''}`}
              aria-pressed={r.on}
              aria-label={`${r.label} 소모품 상태에 보이기`}
              onClick={() => toggle(r.key)}
            >
              {r.on ? '보임' : '숨김'}
            </button>
          </div>
        ))}
      </div>
      {error && <p className="form-alert" role="alert">{error}</p>}
      <div className="my-actions">
        <button type="button" className="btn btn--outline" onClick={resetAll} disabled={busy}>기본값으로</button>
        <button type="button" className="btn btn--outline" onClick={onCancel} disabled={busy}>취소</button>
        <button type="submit" className="btn btn--gold" disabled={busy}>{busy ? '저장하는 중…' : '저장'}</button>
      </div>
    </form>
  );
}
