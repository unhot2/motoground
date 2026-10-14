import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard, { Field } from '../components/AuthCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { authErrorMessage } from '../lib/authErrors.js';

// 메일의 재설정 링크를 누르면 이 화면으로 들어옵니다 (그 순간 임시 로그인 상태)
export default function ResetPasswordPage() {
  const { user, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <AuthCard title="새 비밀번호 설정" subtitle="확인하는 중…" />;

  if (!user) {
    return (
      <AuthCard title="링크를 확인해 주세요" subtitle="재설정 링크가 만료됐거나 잘못됐어요.">
        <div className="auth__done">
          <Link to="/forgot-password" className="btn btn--gold btn--pill">재설정 메일 다시 받기</Link>
        </div>
      </AuthCard>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('8자 이상, 영문과 숫자를 함께 넣어주세요.');
      return;
    }
    if (password !== password2) {
      setError('비밀번호가 서로 달라요.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="새 비밀번호 설정" subtitle="앞으로 사용할 비밀번호를 입력해 주세요">
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {error && <p className="form-alert" role="alert">{error}</p>}
        <Field id="rp-pw" label="새 비밀번호" hint="8자 이상, 영문과 숫자 포함">
          <input id="rp-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field id="rp-pw2" label="새 비밀번호 확인">
          <input id="rp-pw2" type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
        </Field>
        <button type="submit" className="btn btn--gold auth__submit" disabled={busy}>
          {busy ? '저장하는 중…' : '비밀번호 변경'}
        </button>
      </form>
    </AuthCard>
  );
}
