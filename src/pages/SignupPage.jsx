import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthCard, { Field } from '../components/AuthCard.jsx';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { authErrorMessage } from '../lib/authErrors.js';
import { safeNext } from './LoginPage.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICK_RE = /^[가-힣a-zA-Z0-9_]{2,20}$/;

function validate({ email, nickname, password, password2, agree }) {
  const errors = {};
  if (!EMAIL_RE.test(email.trim())) errors.email = '이메일 주소를 정확히 입력해 주세요.';
  if (!NICK_RE.test(nickname.trim())) errors.nickname = '2~20자의 한글, 영문, 숫자, _ 만 쓸 수 있어요.';
  if (password.length < 8) errors.password = '비밀번호는 8자 이상이어야 해요.';
  else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) errors.password = '영문과 숫자를 함께 넣어주세요.';
  if (password2 !== password) errors.password2 = '비밀번호가 서로 달라요.';
  if (!agree) errors.agree = '약관에 동의해야 가입할 수 있어요.';
  return errors;
}

export default function SignupPage() {
  const { user, loading, isConfigured, signUp, isNicknameTaken } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();

  const [form, setForm] = useState({ email: '', nickname: '', password: '', password2: '', agree: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState(''); // 인증 메일 보낸 주소

  if (!loading && user && !sentTo) return <Navigate to={safeNext(search)} replace />;

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      const nickname = form.nickname.trim();
      if (await isNicknameTaken(nickname)) {
        setErrors({ nickname: '이미 쓰고 있는 닉네임이에요.' });
        return;
      }
      const email = form.email.trim();
      const { needsEmailConfirm } = await signUp({ email, password: form.password, nickname });
      if (needsEmailConfirm) setSentTo(email);
      else navigate(safeNext(search), { replace: true });
    } catch (err) {
      setFormError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <AuthCard title="메일을 확인해 주세요">
        <div className="auth__done">
          <span className="auth__done-icon" aria-hidden="true"><Icon name="mail" size={32} /></span>
          <p>
            <strong className="text-gold">{sentTo}</strong> 으로 가입 인증 메일을 보냈어요.
            <br />
            메일의 링크를 누르면 가입이 완료돼요.
          </p>
          <p className="muted auth__small">메일이 안 보이면 스팸함도 확인해 주세요.</p>
          <Link to="/login" className="btn btn--outline btn--pill">로그인 화면으로</Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="회원가입"
      subtitle="라이더들과 함께 달릴 준비 되셨나요?"
      footer={
        <>
          이미 회원이신가요? <Link to={`/login${search}`}>로그인</Link>
        </>
      }
    >
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {formError && <p className="form-alert" role="alert">{formError}</p>}

        <Field id="su-email" label="이메일" error={errors.email}>
          <input
            id="su-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={form.email}
            onChange={set('email')}
            aria-invalid={Boolean(errors.email)}
            aria-describedby="su-email-msg"
            placeholder="rider@example.com"
          />
        </Field>

        <Field id="su-nick" label="닉네임" error={errors.nickname} hint="2~20자, 한글·영문·숫자·_">
          <input
            id="su-nick"
            type="text"
            autoComplete="nickname"
            value={form.nickname}
            onChange={set('nickname')}
            aria-invalid={Boolean(errors.nickname)}
            aria-describedby="su-nick-msg"
            maxLength={20}
          />
        </Field>

        <Field id="su-pw" label="비밀번호" error={errors.password} hint="8자 이상, 영문과 숫자 포함">
          <input
            id="su-pw"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            aria-invalid={Boolean(errors.password)}
            aria-describedby="su-pw-msg"
          />
        </Field>

        <Field id="su-pw2" label="비밀번호 확인" error={errors.password2}>
          <input
            id="su-pw2"
            type="password"
            autoComplete="new-password"
            value={form.password2}
            onChange={set('password2')}
            aria-invalid={Boolean(errors.password2)}
            aria-describedby="su-pw2-msg"
          />
        </Field>

        <div className={`check ${errors.agree ? 'check--error' : ''}`}>
          <input id="su-agree" type="checkbox" checked={form.agree} onChange={set('agree')} />
          <label htmlFor="su-agree">
            <a href="#terms">이용약관</a>과 <a href="#privacy">개인정보처리방침</a>에 동의합니다 (필수)
          </label>
        </div>
        {errors.agree && <p className="field__msg field__msg--error" role="alert">{errors.agree}</p>}

        <button type="submit" className="btn btn--gold auth__submit" disabled={busy || !isConfigured}>
          {busy ? '가입하는 중…' : '가입하기'}
        </button>
      </form>
    </AuthCard>
  );
}
