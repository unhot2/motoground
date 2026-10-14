import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import MobileTabBar from './MobileTabBar.jsx';

// 페이지 이동 시 맨 위로, '/#market' 같은 해시 링크는 해당 섹션으로 스크롤
function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      const timer = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
      return () => clearTimeout(timer);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
}

export default function Layout() {
  return (
    <div className="app">
      <ScrollManager />
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <MobileTabBar />
    </div>
  );
}
