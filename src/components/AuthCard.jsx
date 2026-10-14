import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// 로그인·회원가입 화면 공통 틀
export default function AuthCard({ title, subtitle, children, footer }) {
  const { isConfigured } = useAuth();

  return (
    <section className="auth">
      <div className="auth__card card">
        <Link to="/" className="auth__brand" aria-label="모토그라운드 홈">
          <img src="/logo.png" alt="" className="auth__logo" />
        </Link>
        <h1 className="auth__title">{title}</h1>
        {subtitle && <p className="auth__subtitle">{subtitle}</p>}

        {!isConfigured && (
          <p className="form-alert form-alert--warn" role="status">
            Supabase 설정(.env.local)이 없어서 지금은 가입·로그인을 할 수 없어요.
          </p>
        )}

        {children}
      </div>
      {footer && <div className="auth__footer">{footer}</div>}
    </section>
  );
}

// 라벨 + 입력칸 + 안내/오류 문구
export function Field({ id, label, hint, error, children, action }) {
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <div className="field__top">
        <label htmlFor={id} className="field__label">{label}</label>
        {action}
      </div>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="field__msg field__msg--error" role="alert">{error}</p>
      ) : (
        hint && <p id={`${id}-msg`} className="field__msg">{hint}</p>
      )}
    </div>
  );
}
