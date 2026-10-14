import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthCard, { Field } from '../components/AuthCard.jsx';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { authErrorMessage } from '../lib/authErrors.js';

export default function ForgotPasswordPage() {
  const { isConfigured, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('가입한 이메일 주소를 정확히 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthCard title="메일을 보냈어요">
        <div className="auth__done">
          <span className="auth__done-icon" aria-hidden="true"><Icon name="mail" size={32} /></span>
          <p>
            가입된 이메일이라면 <strong className="text-gold">{email.trim()}</strong> 으로
            <br />
            비밀번호 재설정 링크가 도착해요.
          </p>
          <p className="muted auth__small">메일이 안 보이면 스팸함도 확인해 주세요.</p>
          <Link to="/login" className="btn btn--outline btn--pill">로그인 화면으로</Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="비밀번호 찾기"
      subtitle="가입한 이메일로 재설정 링크를 보내드려요"
      footer={<Link to="/login">로그인으로 돌아가기</Link>}
    >
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {error && <p className="form-alert" role="alert">{error}</p>}
        <Field id="fp-email" label="이메일">
          <input
            id="fp-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="rider@example.com"
          />
        </Field>
        <button type="submit" className="btn btn--gold auth__submit" disabled={busy || !isConfigured}>
          {busy ? '보내는 중…' : '재설정 링크 받기'}
        </button>
      </form>
    </AuthCard>
  );
}
