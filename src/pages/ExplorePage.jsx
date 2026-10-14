import { Link, useSearchParams } from 'react-router-dom';
import BikeArt from '../components/BikeArt.jsx';
import { BrandName } from '../components/BrandLogo.jsx';
import Icon from '../components/Icon.jsx';
import { findBrand, findModel } from '../data/bikeCatalog.js';
import { PRICE_BASIS, findRideType, levels, rideTypes } from '../data/explore.js';
import { formatPrice } from '../data/market.js';

// 125cc 이하는 원동기 면허, 초과는 2종 소형 면허
const licenseOf = (cc) => (cc <= 125 ? '원동기' : '2종 소형');

export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const type = findRideType(params.get('type')) ?? rideTypes[0];

  const select = (slug) => setParams({ type: slug }, { replace: true, preventScrollReset: true });

  return (
    <>
      <section className="page-head">
        <div className="container page-head__inner">
          <span className="eyebrow">
            <span className="checker checker--short" aria-hidden="true" />
            <span>MODEL EXPLORE</span>
          </span>
          <h1 className="page-head__title">나에게 맞는 바이크 찾기</h1>
          <p className="muted">어떤 라이딩을 좋아하세요? 성향을 고르면 딱 맞는 기종을 추천해 드려요</p>
        </div>
      </section>

      <div className="container explore">
        <div className="explore-types" role="radiogroup" aria-label="라이딩 성향">
          {rideTypes.map((t) => (
            <button
              key={t.slug}
              type="button"
              role="radio"
              aria-checked={t.slug === type.slug}
              className={`card explore-type${t.slug === type.slug ? ' is-active' : ''}`}
              onClick={() => select(t.slug)}
            >
              <span className="explore-type__en">{t.en}</span>
              <strong className="explore-type__title">{t.title}</strong>
              <span className="explore-type__tagline">{t.tagline}</span>
              <BikeArt genre={t.genre} width={120} className="explore-type__art" />
            </button>
          ))}
        </div>

        <section className="card explore-intro" aria-live="polite">
          <div className="explore-intro__copy">
            <span className="label-en">{type.en} RIDER</span>
            <h2 className="explore-intro__title">
              {type.tagline.replace('바이크', '')}
              <span className="text-gold">바이크</span>
            </h2>
            <p className="muted">{type.desc}</p>
            <div className="explore-intro__chips">
              {type.keywords.map((k) => (
                <span key={k} className="chip chip--solid">#{k}</span>
              ))}
            </div>
          </div>
          <div className="explore-intro__who">
            <strong>이런 분께 추천해요</strong>
            <ul>
              {type.forWho.map((w) => (
                <li key={w}>
                  <Icon name="check" size={18} strokeWidth={2.2} />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {levels.map((lv) => (
          <section key={lv.key} className="explore-level">
            <div className="explore-level__head">
              <h3 className="explore-level__title">{lv.label}</h3>
              <span className="muted-2">{lv.desc}</span>
            </div>
            <div className="explore-grid">
              {type.models[lv.key].map(([brand, name, note, price]) => (
                <ModelCard key={`${brand}/${name}`} brand={brand} name={name} note={note} price={price} />
              ))}
            </div>
          </section>
        ))}

        <p className="explore-note muted-2">
          가격은 {PRICE_BASIS} 기준 국내 공식 수입사 권장소비자가(VAT 포함)예요. 트림 · 프로모션에 따라 달라질 수 있고,
          '국내 가격 미정'은 2026년식 국내 가격이 공개되지 않은 모델이에요. 구매 전 판매점에서 확인해 주세요.
        </p>
      </div>
    </>
  );
}

function ModelCard({ brand, name, note, price }) {
  const model = findModel(brand, name);
  const en = findBrand(brand)?.en ?? brand;

  return (
    <article className="card explore-model">
      <div className="explore-model__photo">
        {model?.image ? (
          <BikeArt image={model.image} width={280} className="explore-model__img" />
        ) : (
          <BikeArt genre={model?.genre} width={150} className="explore-model__art" />
        )}
      </div>
      <div className="explore-model__body">
        <span className="explore-model__brand">
          <BrandName brand={brand} en={en} />
        </span>
        <strong className="explore-model__name">{name}</strong>
        <span className="explore-model__note">{note}</span>
        {model && (
          <span className="explore-model__spec">
            <span className="explore-model__cc">{model.cc.toLocaleString()}cc</span>
            <span className="explore-model__license">{licenseOf(model.cc)}</span>
          </span>
        )}
        <span className="explore-model__price">
          {price ? (
            <>
              <span className="explore-model__year">{price.year}년식</span>
              <strong>{formatPrice(price.won)}</strong>
            </>
          ) : (
            <span className="explore-model__year">국내 가격 미정</span>
          )}
        </span>
      </div>
    </article>
  );
}
