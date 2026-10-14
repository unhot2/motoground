import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// 로그인한 회원만 볼 수 있는 화면. 아니면 로그인 후 이 주소로 돌아오게 보냄
export default function RequireAuth() {
  const { user, loading } = useAuth();
  const { pathname, search } = useLocation();

  if (loading) return <div className="container my-loading" aria-busy="true" />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
  return <Outlet />;
}
