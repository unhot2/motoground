import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import { Field } from '../components/AuthCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { removeAvatar, updateMyProfile, uploadAvatar } from '../api/profile.js';
import { joinRegion, sidoList, splitRegion } from '../data/regions.js';
import { authErrorMessage } from '../lib/authErrors.js';

const NICK_RE = /^[가-힣a-zA-Z0-9_]{2,20}$/;
const MAX_PHOTO_MB = 10; // 원본 기준. 올릴 때 400px 로 줄여서 저장

const errorText = (err) => (err instanceof Error && /[가-힣]/.test(err.message) ? err.message : authErrorMessage(err));

export default function MyEditPage() {
  const { profile } = useAuth();
  // 프로필을 받아온 뒤에 입력칸 초기값을 채움
  if (!profile) return <div className="card my-panel my-loading" aria-busy="true" />;
  return <EditForm />;
}

function EditForm() {
  const { user, profile, isNicknameTaken, reloadProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const initialRegion = splitRegion(profile?.region);
  const [form, setForm] = useState({
    nickname: profile?.nickname ?? '',
    bike: profile?.bike_model ?? '',
    sido: initialRegion.sido,
    detail: initialRegion.detail,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  // ---- 프로필 사진 (고르면 바로 저장) ----
  async function onPickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일을 다시 골라도 동작하도록
    if (!file) return;
    setPhotoError('');
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`${MAX_PHOTO_MB}MB 이하 사진을 골라주세요.`);
      return;
    }
    setPhotoBusy(true);
    try {
      await uploadAvatar(user.id, file);
      await reloadProfile();
    } catch (err) {
      setPhotoError(errorText(err));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function onRemovePhoto() {
    setPhotoError('');
    setPhotoBusy(true);
    try {
      await removeAvatar(user.id);
      await reloadProfile();
    } catch (err) {
      setPhotoError(errorText(err));
    } finally {
      setPhotoBusy(false);
    }
  }

  // ---- 나머지 정보 ----
  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const nickname = form.nickname.trim();
    if (!NICK_RE.test(nickname)) {
      setErrors({ nickname: '2~20자의 한글, 영문, 숫자, _ 만 쓸 수 있어요.' });
      return;
    }

    setBusy(true);
    try {
      if (nickname !== profile?.nickname && (await isNicknameTaken(nickname))) {
        setErrors({ nickname: '이미 쓰고 있는 닉네임이에요.' });
        return;
      }
      await updateMyProfile(user.id, {
        nickname,
        bike_model: form.bike.trim() || null,
        region: joinRegion(form.sido, form.detail) || null,
      });
      await reloadProfile();
      navigate('/my', { replace: true });
    } catch (err) {
      const text = errorText(err);
      if (text.includes('닉네임')) setErrors({ nickname: text });
      else setFormError(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card my-panel">
      <h2 className="my-panel__title">프로필 수정</h2>

      {/* 프로필 사진 */}
      <div className="my-photo">
        <Avatar src={profile?.avatar_url} size={96} className="my-profile__avatar" />
        <div className="my-photo__side">
          <div className="my-photo__btns">
            <button
              type="button"
              className="btn btn--outline btn--pill my-btn-sm"
              disabled={photoBusy}
              onClick={() => fileRef.current?.click()}
            >
              {photoBusy ? '저장하는 중…' : '사진 변경'}
            </button>
            {profile?.avatar_url && (
              <button type="button" className="my-link-btn" disabled={photoBusy} onClick={onRemovePhoto}>
                삭제
              </button>
            )}
          </div>
          <p className="field__msg">JPG·PNG·WEBP, 정사각형으로 잘려서 저장돼요.</p>
          {photoError && <p className="field__msg field__msg--error" role="alert">{photoError}</p>}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-label="프로필 사진 선택"
            onChange={onPickPhoto}
          />
        </div>
      </div>

      <form className="auth__form" onSubmit={onSubmit} noValidate>
        {formError && <p className="form-alert" role="alert">{formError}</p>}

        <Field id="my-email" label="이메일" hint="이메일은 바꿀 수 없어요.">
          <input id="my-email" type="email" value={user.email ?? ''} disabled aria-describedby="my-email-msg" />
        </Field>

        <Field id="my-nick" label="닉네임" error={errors.nickname} hint="2~20자, 한글·영문·숫자·_">
          <input
            id="my-nick"
            type="text"
            autoComplete="nickname"
            value={form.nickname}
            onChange={set('nickname')}
            aria-invalid={Boolean(errors.nickname)}
            aria-describedby="my-nick-msg"
            maxLength={20}
          />
        </Field>

        <Field id="my-bike" label="내 바이크" hint="예: 야마하 MT-07, 혼다 CB650R (선택)">
          <input
            id="my-bike"
            type="text"
            value={form.bike}
            onChange={set('bike')}
            aria-describedby="my-bike-msg"
            maxLength={40}
          />
        </Field>

        <div className="field">
          <div className="field__top">
            <label htmlFor="my-sido" className="field__label">활동 지역</label>
          </div>
          <div className="my-region">
            <select id="my-sido" value={form.sido} onChange={set('sido')} className="my-select">
              <option value="">시·도 선택</option>
              {sidoList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              type="text"
              aria-label="시·군·구"
              placeholder="시·군·구 (예: 강남구)"
              value={form.detail}
              onChange={set('detail')}
              maxLength={20}
            />
          </div>
          <p className="field__msg">선택 사항이에요. 모임·번개 찾을 때 쓰여요.</p>
        </div>

        <div className="my-actions">
          <button type="button" className="btn btn--outline" onClick={() => navigate('/my')}>취소</button>
          <button type="submit" className="btn btn--gold" disabled={busy}>
            {busy ? '저장하는 중…' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
