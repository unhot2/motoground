import Icon from './Icon.jsx';
import { popularKeywords } from '../data/menu.js';

export default function Hero() {
  return (
    <section id="top" className="hero">
      <div className="container hero__inner">
        <div className="hero__copy">
          <div className="eyebrow">
            <span className="checker checker--short" aria-hidden="true" />
            <span>BIKER COMMUNITY</span>
          </div>

          <h1 className="hero__title">
            달리는 모든 순간,
            <br />
            <span className="text-gold">모토그라운드</span>에서
          </h1>

          <p className="hero__lead">
            중고 매물부터 정비, 보험, 라이딩 코스와 커뮤니티까지.
            라이더에게 필요한 모든 것을 한 곳에서.
          </p>

          <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="hero-search" className="sr-only">바이크 검색</label>
            <input id="hero-search" type="search" placeholder="찾으시는 바이크를 검색해보세요" />
            <button type="submit" className="btn btn--gold search__btn">
              <Icon name="search" size={18} strokeWidth={2} />
              <span>검색</span>
            </button>
          </form>

          <div className="keywords">
            <span className="keywords__label">인기 검색</span>
            {popularKeywords.map((k) => (
              <a key={k} href="#search" className="chip">{k}</a>
            ))}
          </div>
        </div>

        <div className="hero__visual">
          <img src="/logo.png" alt="모토그라운드 로고 — 금색 방패 위 스포츠 바이크" />
        </div>
      </div>
    </section>
  );
}
