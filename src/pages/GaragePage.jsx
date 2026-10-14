import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAsync from '../hooks/useAsync.js';
import { fetchGarage } from '../api/garage.js';
import { bikeStatus, bikeTitle, genreLabel, resolveIntervals } from '../data/garage.js';
import { formatCount } from '../lib/format.js';

export function GarageHead({ title = '내 차고', desc, action }) {
  return (
    <section className="page-head">
      <div className="container page-head__inner garage-head">
        <div>
          <span className="eyebrow">
            <span className="checker checker--short" aria-hidden="true" />
            <span>MY GARAGE</span>
          </span>
          <h1 className="page-head__title">{title}</h1>
          {desc && <p className="muted">{desc}</p>}
        </div>
        {action}
      </div>
    </section>
  );
}

export default function GaragePage() {
  const { user } = useAuth();
  const garage = useAsync(() => fetchGarage(user.id), [user.id]);
  const bikes = garage.data?.bikes ?? [];

  return (
    <>
      <GarageHead
        desc="소모품 교체 시기와 유지비를 한눈에 관리해요"
        action={
          bikes.length > 0 && (
            <Link to="/garage/new" className="btn btn--gold garage-head__btn">
              <Icon name="plus" size={18} strokeWidth={2} /> 바이크 등록
            </Link>
          )
        }
      />

      <div className="container garage">
        {garage.loading && !garage.data && (
          <div className="garage-grid">
            {[0, 1].map((i) => <div key={i} className="card bike-card bike-card--skeleton" aria-hidden="true" />)}
          </div>
        )}

        {garage.error && <div className="card board-empty">차고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</div>}

        {garage.data && bikes.length === 0 && (
          <div className="card garage-empty">
            <span className="garage-empty__icon" aria-hidden="true"><Icon name="garage" size={36} /></span>
            <h2>첫 바이크를 등록해 보세요</h2>
            <p className="muted">
              정비 기록을 남기면 엔진오일, 체인, 타이어 같은 소모품의
              <br />
              교체 시기를 알아서 계산해 드려요.
            </p>
            <Link to="/garage/new" className="btn btn--gold btn--pill">
              <Icon name="plus" size={18} strokeWidth={2} /> 바이크 등록
            </Link>
          </div>
        )}

        {bikes.length > 0 && (
          <div className="garage-grid">
            {bikes.map((bike) => (
              <BikeCard
                key={bike.id}
                bike={bike}
                logs={garage.data.logs.filter((l) => l.bikeId === bike.id)}
                intervals={garage.data.intervals.filter((i) => i.bike_id === bike.id)}
              />
            ))}
            <Link to="/garage/new" className="card bike-card bike-card--add">
              <Icon name="bike" size={30} />
              <span>바이크 추가</span>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

function BikeCard({ bike, logs, intervals }) {
  const status = bikeStatus(resolveIntervals(intervals), logs, bike.currentKm);
  const bad = status.filter((s) => s.level === 'bad').length;
  const soon = status.filter((s) => s.level === 'soon').length;
  const recorded = status.some((s) => s.level !== 'none');
  const spec = [`${bike.brand} ${bike.model}`, bike.modelYear, genreLabel(bike.genre)].filter(Boolean).join(' · ');

  return (
    <Link to={`/garage/${bike.id}`} className="card bike-card">
      <div className="bike-card__photo">
        {bike.imageUrls[0] ? (
          <img src={bike.imageUrls[0]} alt="" loading="lazy" />
        ) : (
          <Icon name="bike" size={40} strokeWidth={1.2} />
        )}
        {bike.isMain && <span className="bike-card__main">대표</span>}
      </div>
      <div className="bike-card__body">
        <strong className="bike-card__name">{bikeTitle(bike)}</strong>
        <span className="bike-card__spec">{spec}</span>
        <span className="bike-card__km">
          <b>{formatCount(bike.currentKm)}</b> km
        </span>
        <span className="bike-card__badges">
          {bad > 0 && <span className="lv lv--bad">교체 필요 {bad}</span>}
          {soon > 0 && <span className="lv lv--soon">곧 교체 {soon}</span>}
          {bad === 0 && soon === 0 && recorded && <span className="lv lv--ok">모두 정상</span>}
          {!recorded && <span className="lv lv--none">정비 기록을 남겨보세요</span>}
        </span>
      </div>
    </Link>
  );
}
