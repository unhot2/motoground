import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field } from '../components/AuthCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { deleteMyAccount, verifyPassword } from '../api/profile.js';
import { authErrorMessage } from '../lib/authErrors.js';

const errorText = (err) => (err instanceof Error && /[가-힣]/.test(err.message) ? err.message : authErrorMessage(err));

export default function MyAccountPage() {
  return (
    <>
      <PasswordPanel />
      <SessionPanel />
      <DeletePanel />
    </>
  );
}

// ---------------------------------------------------------------------
// 비밀번호 변경
// ---------------------------------------------------------------------
function PasswordPanel() {
  const { user, updatePassword } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', next2: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setDone(false);
  };

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setDone(false);
    const { current, next, next2 } = form;
    if (!current) return setError('현재 비밀번호를 입력해 주세요.');
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) {
      return setError('새 비밀번호는 8자 이상, 영문과 숫자를 함께 넣어주세요.');
    }
    if (next !== next2) return setError('새 비밀번호가 서로 달라요.');
    if (next === current) return setError('이전과 다른 비밀번호를 입력해 주세요.');

    setBusy(true);
    try {
      await verifyPassword(user.email, current);
      await updatePassword(next);
      setForm({ current: '', next: '', next2: '' });
      setDone(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card my-panel" aria-labelledby="pw-title">
      <h2 id="pw-title" className="my-panel__title">비밀번호 변경</h2>
      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {error && <p className="form-alert" role="alert">{error}</p>}
        {done && <p className="form-alert form-alert--warn" role="status">비밀번호를 바꿨어요.</p>}

        {/* 비밀번호 관리자가 계정을 알아보도록 */}
        <input type="email" autoComplete="username" value={user.email ?? ''} readOnly hidden />

        <Field id="ac-pw" label="현재 비밀번호">
          <input id="ac-pw" type="password" autoComplete="current-password" value={form.current} onChange={set('current')} />
        </Field>
        <Field id="ac-pw-new" label="새 비밀번호" hint="8자 이상, 영문과 숫자 포함">
          <input
            id="ac-pw-new"
            type="password"
            autoComplete="new-password"
            value={form.next}
            onChange={set('next')}
            aria-describedby="ac-pw-new-msg"
          />
        </Field>
        <Field id="ac-pw-new2" label="새 비밀번호 확인">
          <input id="ac-pw-new2" type="password" autoComplete="new-password" value={form.next2} onChange={set('next2')} />
        </Field>

        <div className="my-actions">
          <button type="submit" className="btn btn--gold" disabled={busy}>
            {busy ? '바꾸는 중…' : '비밀번호 변경'}
          </button>
        </div>
      </form>
    </section>
  );
}

// ---------------------------------------------------------------------
// 로그아웃
// ---------------------------------------------------------------------
function SessionPanel() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  async function onSignOut() {
    try {
      await signOut();
    } finally {
      navigate('/');
    }
  }

  return (
    <section className="card my-panel my-panel--row" aria-labelledby="session-title">
      <div>
        <h2 id="session-title" className="my-panel__title">로그아웃</h2>
        <p className="muted my-panel__desc">이 기기에서 로그아웃해요.</p>
      </div>
      <button type="button" className="btn btn--outline btn--pill" onClick={onSignOut}>로그아웃</button>
    </section>
  );
}

// ---------------------------------------------------------------------
// 회원 탈퇴 (안내 확인 → 닉네임 입력 2단계)
// ---------------------------------------------------------------------
function DeletePanel() {
  const { user, nickname } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canDelete = agree && typed.trim() === nickname && !busy;

  async function onDelete(e) {
    e.preventDefault();
    if (!canDelete) return;
    setError('');
    setBusy(true);
    try {
      await deleteMyAccount(user.id);
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        /delete_my_account|function .* does not exist|PGRST202/i.test(`${err?.code} ${err?.message}`)
          ? '탈퇴 기능이 아직 준비되지 않았어요. 관리자에게 문의해 주세요.'
          : errorText(err)
      );
      setBusy(false);
    }
  }

  return (
    <section className="card my-panel my-panel--danger" aria-labelledby="delete-title">
      <div className="my-panel--row">
        <div>
          <h2 id="delete-title" className="my-panel__title">회원 탈퇴</h2>
          <p className="muted my-panel__desc">탈퇴하면 계정을 되돌릴 수 없어요.</p>
        </div>
        {!open && (
          <button type="button" className="btn btn--outline btn--pill my-btn-danger" onClick={() => setOpen(true)}>
            탈퇴하기
          </button>
        )}
      </div>

      {open && (
        <form className="auth__form" onSubmit={onDelete} noValidate>
          <ul className="my-warn">
            <li>프로필, 프로필 사진, 추천·찜 기록, 등록한 매물이 모두 삭제돼요.</li>
            <li>작성한 글과 댓글은 지워지지 않고 <strong>탈퇴한 회원</strong>의 글로 남아요. 지우고 싶다면 먼저 직접 삭제해 주세요.</li>
            <li>같은 이메일로 다시 가입할 수 있지만, 이전 기록은 복구되지 않아요.</li>
          </ul>

          <div className="check">
            <input id="del-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <label htmlFor="del-agree">위 내용을 확인했어요.</label>
          </div>

          <Field id="del-nick" label={`확인을 위해 닉네임 "${nickname}" 을 입력해 주세요`}>
            <input id="del-nick" type="text" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
          </Field>

          {error && <p className="form-alert" role="alert">{error}</p>}

          <div className="my-actions">
            <button
              type="button"
              className="btn btn--outline"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setAgree(false);
                setTyped('');
                setError('');
              }}
            >
              취소
            </button>
            <button type="submit" className="btn my-btn-danger--solid" disabled={!canDelete}>
              {busy ? '탈퇴하는 중…' : '탈퇴하기'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
