import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { services } from '../data/menu.js';

export default function ServiceGrid() {
  return (
    <section id="services" className="container section">
      <div className="section__head">
        <h2 className="section__title">찾는 서비스가 있나요?</h2>
        <a href="#all" className="section__more">전체 서비스 보기 →</a>
      </div>

      <div className="service-grid">
        {services.map((s) => {
          const className = `service ${s.mobile ? '' : 'service--desktop-only'}`;
          const inner = (
            <>
              <span className="service__icon">
                <Icon name={s.icon} size={28} />
              </span>
              <span className="service__label">{s.label}</span>
            </>
          );
          // 연결된 페이지가 있으면 라우터 링크, 없으면 자리표시 링크
          return s.to ? (
            <Link key={s.label} to={s.to} className={className}>{inner}</Link>
          ) : (
            <a key={s.label} href="#service" className={className}>{inner}</a>
          );
        })}
      </div>
    </section>
  );
}
