import Icon from './Icon.jsx';

export default function MarketCards() {
  return (
    <section id="market" className="container section">
      <div className="market">
        <a href="#used" className="card market__card">
          <div className="market__top">
            <span className="label-en">USED BIKES</span>
            <span className="market__title">중고 매물</span>
            <span className="muted">전국 모든 매물을 한눈에</span>
          </div>
          <div className="market__bottom">
            <span className="market__count">+[매물 수]대</span>
            <span className="round-arrow"><Icon name="arrow" size={20} strokeWidth={2} /></span>
          </div>
        </a>

        <a href="#new" className="card market__card">
          <div className="market__top">
            <span className="label-en">NEW BIKES</span>
            <span className="market__title">신차</span>
            <span className="muted">브랜드별 신차 모델과 가격을 비교해보세요</span>
          </div>
          <div className="market__bottom">
            <span className="market__chips">
              <span className="chip chip--solid">찜한 바이크</span>
              <span className="chip chip--solid">알림 설정 매물</span>
            </span>
            <span className="round-arrow"><Icon name="arrow" size={20} strokeWidth={2} /></span>
          </div>
        </a>
      </div>
    </section>
  );
}
