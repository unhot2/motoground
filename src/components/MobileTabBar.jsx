import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import { mobileTabs, isActivePath } from '../data/menu.js';

// 768px 이하에서만 보이는 하단 탭바
export default function MobileTabBar() {
  const { pathname, hash } = useLocation();

  return (
    <nav className="tabbar" aria-label="하단 메뉴">
      {mobileTabs.map((t) => {
        const active = isActivePath(t.match, pathname, hash);
        return (
          <Link
            key={t.label}
            to={t.to}
            className={`tabbar__item ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon name={t.icon} size={22} strokeWidth={1.7} />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
