import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import useAsync from '../hooks/useAsync.js';
import { fetchListingCount } from '../api/market.js';
import { formatCount } from '../lib/format.js';

export default function MarketCards() {
  const count = useAsync(() => fetchListingCount(), []);

  return (
    <section id="market" className="container section">
      <div className="market">
        <Link to="/market" className="card market__card">
          <div className="market__top">
            <span className="label-en">USED BIKES</span>
            <span className="market__title">중고 매물</span>
            <span className="muted">전국 모든 매물을 한눈에</span>
          </div>
          <div className="market__bottom">
            <span className="market__count">{count.data != null ? `${formatCount(count.data)}대` : ' '}</span>
            <span className="round-arrow"><Icon name="arrow" size={20} strokeWidth={2} /></span>
          </div>
        </Link>
      </div>
    </section>
  );
}
