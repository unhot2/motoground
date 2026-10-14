import { NavLink, Outlet } from 'react-router-dom';

const myNav = [
  { label: '내 활동', to: '/my', end: true },
  { label: '프로필 수정', to: '/my/edit' },
  { label: '계정 관리', to: '/my/account' },
];

// 내 정보 화면 공통 틀 (페이지 헤더 + 하위 메뉴)
export default function MyLayout() {
  return (
    <>
      <section className="page-head">
        <div className="container page-head__inner">
          <span className="eyebrow">
            <span className="checker checker--short" aria-hidden="true" />
            <span>MY PAGE</span>
          </span>
          <h1 className="page-head__title">내 정보</h1>
        </div>
      </section>

      <div className="container my">
        <nav className="my-nav" aria-label="내 정보 메뉴">
          {myNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `my-nav__item ${isActive ? 'is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="my__body">
          <Outlet />
        </div>
      </div>
    </>
  );
}
