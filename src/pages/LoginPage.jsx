import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthCard, { Field } from '../components/AuthCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { authErrorMessage } from '../lib/authErrors.js';

// 로그인 후 돌아갈 주소 (?next=/community 처럼 전달). 외부 주소는 무시
export function safeNext(search) {
  const next = new URLSearchParams(search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export default function LoginPage() {
  const { user, loading, isConfigured, signIn } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const next = safeNext(search);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={next} replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      await signIn({ email: email.trim(), password });
      navigate(next, { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="로그인"
      subtitle="모토그라운드에 오신 걸 환영해요"
      footer={
        <>
          아직 회원이 아니신가요?{' '}
          <Link to={`/signup${search}`}>회원가입</Link>
        </>
      }
    >
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {error && <p className="form-alert" role="alert">{error}</p>}

        <Field id="login-email" label="이메일">
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rider@example.com"
          />
        </Field>

        <Field
          id="login-password"
          label="비밀번호"
          action={<Link to="/forgot-password" className="field__link">비밀번호 찾기</Link>}
        >
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <button type="submit" className="btn btn--gold auth__submit" disabled={busy || !isConfigured}>
          {busy ? '로그인 중…' : '로그인'}
        </button>
      </form>
    </AuthCard>
  );
}
