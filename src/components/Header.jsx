import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import Avatar from './Avatar.jsx';
import { mainNav, isActivePath } from '../data/menu.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Header() {
  const [open, setOpen] = useState(false); // 모바일 메뉴
  const [userMenu, setUserMenu] = useState(false); // 닉네임 드롭다운
  const { pathname, hash, search } = useLocation();
  const navigate = useNavigate();
  const { user, profile, nickname, loading, signOut } = useAuth();
  const userMenuRef = useRef(null);

  // 페이지가 바뀌면 메뉴 닫기
  useEffect(() => {
    setOpen(false);
    setUserMenu(false);
  }, [pathname, hash]);

  // 드롭다운 바깥 클릭 / Esc 로 닫기
  useEffect(() => {
    if (!userMenu) return undefined;
    const onDown = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenu(false);
    };
    const onKey = (e) => e.key === 'Escape' && setUserMenu(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenu]);

  // 로그인 후 지금 보던 화면으로 돌아오도록
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname);
  const loginTo = isAuthPage ? '/login' : `/login?next=${encodeURIComponent(pathname + search)}`;

  async function handleSignOut() {
    setUserMenu(false);
    setOpen(false);
    try {
      await signOut();
    } finally {
      navigate('/');
    }
  }

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__brand" aria-label="모토그라운드 홈">
          <img src="/logo.png" alt="" className="header__logo" />
          <span className="brand-word">MOTOGROUND</span>
        </Link>

        <nav className={`header__nav ${open ? 'is-open' : ''}`} aria-label="주 메뉴">
          {mainNav.map((item) => {
            const active = isActivePath(item.match, pathname, hash);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={active ? 'is-active' : ''}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}

          {/* 모바일 메뉴 안의 계정 영역 */}
          <div className="header__nav-account">
            {user ? (
              <>
                <Link to="/my" className="header__nav-nick">
                  <Avatar src={profile?.avatar_url} size={28} /> {nickname || '회원'} 님
                </Link>
                <button type="button" className="header__nav-logout" onClick={handleSignOut}>로그아웃</button>
              </>
            ) : (
              <>
                <Link to={loginTo}>로그인</Link>
                <Link to="/signup">회원가입</Link>
              </>
            )}
          </div>
        </nav>

        <div className="header__actions">
          <button type="button" className="icon-btn" aria-label="알림">
            <Icon name="bell" size={20} strokeWidth={1.7} />
          </button>

          {!loading && !user && (
            <Link to={loginTo} className="btn btn--gold btn--pill header__login">로그인</Link>
          )}

          {user && (
            <div className="user-menu" ref={userMenuRef}>
              <button
                type="button"
                className="user-menu__btn"
                aria-haspopup="menu"
                aria-expanded={userMenu}
                onClick={() => setUserMenu((v) => !v)}
              >
                <Avatar src={profile?.avatar_url} size={32} className="user-menu__avatar" />
                <span className="user-menu__name">{nickname || '회원'}</span>
                <Icon name="chevron" size={16} strokeWidth={2} className="user-menu__chev" />
              </button>
              {userMenu && (
                <div className="user-menu__list" role="menu">
                  <span className="user-menu__email">{user.email}</span>
                  <Link to="/my" role="menuitem" onClick={() => setUserMenu(false)}>내 정보</Link>
                  <a href="#garage" role="menuitem" onClick={() => setUserMenu(false)}>내 차고</a>
                  <button type="button" role="menuitem" onClick={handleSignOut}>로그아웃</button>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="icon-btn header__menu-btn"
            aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'menu'} size={20} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}
