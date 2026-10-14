import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Field } from '../components/AuthCard.jsx';
import BikeArt from '../components/BikeArt.jsx';
import Icon from '../components/Icon.jsx';
import ModelPicker from '../components/ModelPicker.jsx';
import PhotoPicker, { resolvePhotoUrls, toPhotoItems } from '../components/PhotoPicker.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAsync from '../hooks/useAsync.js';
import {
  BIKE_PHOTO_MAX,
  createBike,
  deleteBike,
  fetchBike,
  fetchGarage,
  removeGarageImages,
  updateBike,
  uploadGarageImages,
} from '../api/garage.js';
import { bikeTitle, genreLabel, genres } from '../data/garage.js';
import { findModel } from '../data/bikeCatalog.js';
import { GarageHead } from './GaragePage.jsx';

// /garage/new 등록, /garage/:id/edit 수정
export default function BikeFormPage() {
  const { id } = useParams();
  const { user } = useAuth();
  // 새로 등록할 때는 첫 바이크인지 알아야 대표로 자동 지정
  const loaded = useAsync(() => (id ? fetchBike(id) : fetchGarage(user.id)), [id, user.id]);

  const title = id ? '바이크 수정' : '바이크 등록';
  if (loaded.loading) {
    return (
      <>
        <GarageHead title={title} />
        <div className="container garage"><div className="card garage-form my-loading" aria-busy="true" /></div>
      </>
    );
  }
  if (loaded.error || (id && !loaded.data)) {
    return (
      <>
        <GarageHead title={title} />
        <div className="container garage">
          <div className="card board-empty">바이크를 찾을 수 없어요. <Link to="/garage">내 차고로</Link></div>
        </div>
      </>
    );
  }
  return id ? (
    <BikeForm key={id} bike={loaded.data.bike} logs={loaded.data.logs} />
  ) : (
    <BikeForm key="new" isFirst={loaded.data.bikes.length === 0} />
  );
}

const numberOrNull = (v) => (v === '' || v == null ? null : Number(v));

function BikeForm({ bike = null, logs = [], isFirst = false }) {
  const isEdit = Boolean(bike);
  const { user, reloadProfile } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    brand: bike?.brand ?? '',
    model: bike?.model ?? '',
    nickname: bike?.nickname ?? '',
    modelYear: bike?.modelYear ?? '',
    cc: bike?.cc ?? '',
    genre: bike?.genre ?? '',
    purchasedOn: bike?.purchasedOn ?? '',
    purchaseKm: bike?.purchaseKm ?? '',
    currentKm: bike?.currentKm ?? '',
    isMain: bike?.isMain ?? isFirst,
  });
  const [images, setImages] = useState(() => toPhotoItems(bike?.imageUrls));
  // 새 등록은 모델 고르기부터, 수정은 상세 정보부터
  const [step, setStep] = useState(isEdit ? 'detail' : 'model');
  // 목록에서 고른 모델이 아니면 제조사·모델명을 직접 입력
  const [direct, setDirect] = useState(isEdit && !findModel(bike.brand, bike.model));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  function pickModel({ brand, model }) {
    setForm((f) => ({ ...f, brand, model: model.name, genre: model.genre, cc: model.cc }));
    setDirect(false);
    setErrors({});
    setStep('detail');
  }

  function goDirect(brand) {
    setForm((f) => ({ ...f, brand: direct ? f.brand : brand, model: direct ? f.model : '' }));
    setDirect(true);
    setStep('detail');
  }

  function validate() {
    const found = {};
    const year = numberOrNull(form.modelYear);
    if (!form.brand.trim()) found.brand = '제조사를 입력해 주세요.';
    if (!form.model.trim()) found.model = '모델명을 입력해 주세요.';
    if (year != null && (year < 1950 || year > new Date().getFullYear() + 1)) found.modelYear = '연식을 확인해 주세요.';
    if (form.currentKm === '' || Number(form.currentKm) < 0) found.currentKm = '현재 주행거리를 입력해 주세요.';
    if (form.purchaseKm !== '' && Number(form.purchaseKm) > Number(form.currentKm)) {
      found.purchaseKm = '구매 시 주행거리가 현재보다 커요.';
    }
    return found;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    let uploaded = [];
    try {
      const photos = await resolvePhotoUrls(images, (files) => uploadGarageImages(user.id, files));
      uploaded = photos.uploaded;
      const payload = {
        ...form,
        modelYear: numberOrNull(form.modelYear),
        cc: numberOrNull(form.cc),
        purchaseKm: numberOrNull(form.purchaseKm),
        currentKm: Number(form.currentKm),
        imageUrls: photos.urls,
      };
      const makeMain = form.isMain && !bike?.isMain;
      let bikeId = bike?.id;
      if (isEdit) {
        await updateBike(user.id, bike.id, payload, { makeMain });
        await removeGarageImages(bike.imageUrls.filter((u) => !photos.urls.includes(u)));
      } else {
        bikeId = await createBike(user.id, payload, { makeMain });
      }
      if (makeMain) reloadProfile();
      navigate(`/garage/${bikeId}`, { replace: true });
    } catch (err) {
      console.error(err);
      await removeGarageImages(uploaded);
      setFormError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!window.confirm(`'${bikeTitle(bike)}'을(를) 삭제할까요?\n정비·비용 기록도 모두 삭제되고 되돌릴 수 없어요.`)) return;
    setBusy(true);
    try {
      await deleteBike(bike, logs);
      navigate('/garage', { replace: true });
    } catch (err) {
      console.error(err);
      setFormError('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  }

  const title = isEdit ? '바이크 수정' : '바이크 등록';
  const steps = (
    <ol className="garage-steps" aria-label="등록 단계">
      <li className={step === 'model' ? 'is-current' : ''} aria-current={step === 'model' ? 'step' : undefined}>
        <span>1</span> 모델 선택
      </li>
      <li className={step === 'detail' ? 'is-current' : ''} aria-current={step === 'detail' ? 'step' : undefined}>
        <span>2</span> 상세 정보
      </li>
    </ol>
  );

  if (step === 'model') {
    return (
      <>
        <GarageHead title={title} action={steps} />
        <div className="container garage">
          <div className="card garage-form">
            <ModelPicker
              initialBrand={form.brand}
              initialModel={form.model}
              onNext={pickModel}
              onDirect={goDirect}
            />
            <div className="garage-form__back">
              <button type="button" className="my-link-btn" onClick={() => (isEdit ? setStep('detail') : navigate('/garage'))}>
                {isEdit ? '모델 변경 취소' : '취소하고 내 차고로'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <GarageHead title={title} action={steps} />
      <div className="container garage">
        <form className="card garage-form" onSubmit={onSubmit} noValidate>
          {formError && <p className="form-alert" role="alert">{formError}</p>}

          {/* 고른 모델 (직접 입력이면 입력칸) */}
          {direct ? (
            <div className="garage-form__direct">
              <div className="garage-form__grid garage-form__grid--2">
                <Field id="b-brand" label="제조사" error={errors.brand}>
                  <input id="b-brand" value={form.brand} onChange={set('brand')} maxLength={30} placeholder="예: 대림, SYM" />
                </Field>
                <Field id="b-model" label="모델명" error={errors.model}>
                  <input id="b-model" value={form.model} onChange={set('model')} maxLength={40} placeholder="예: VJF250" />
                </Field>
              </div>
              <button type="button" className="my-link-btn" onClick={() => setStep('model')}>목록에서 고르기</button>
            </div>
          ) : (
            <div className="model-picked model-picked--summary">
              <span className="model-picked__art"><BikeArt genre={form.genre} width={72} /></span>
              <div className="model-picked__info">
                <span className="model-picked__label">선택한 모델</span>
                <strong>{form.brand} {form.model}</strong>
                <span className="model-picked__spec">
                  {[form.cc && `${Number(form.cc).toLocaleString('ko-KR')}cc`, genreLabel(form.genre)].filter(Boolean).join(' · ')}
                </span>
              </div>
              <button type="button" className="btn btn--outline btn--pill my-btn-sm" onClick={() => setStep('model')}>
                <Icon name="bike" size={16} /> 모델 변경
              </button>
            </div>
          )}

          <div className="write-field">
            <div className="write-label">
              <span>사진</span>
              <span className="write-label__sub">첫 번째 사진이 차고 카드에 보여요</span>
            </div>
            <PhotoPicker images={images} onChange={setImages} max={BIKE_PHOTO_MAX} label="바이크 사진" />
          </div>

          <div className="garage-form__grid">
            <Field id="b-nick" label="별명 (선택)" hint="차고에서 이 이름으로 보여요">
              <input id="b-nick" value={form.nickname} onChange={set('nickname')} maxLength={20} placeholder="검둥이" aria-describedby="b-nick-msg" />
            </Field>
            <div className="field">
              <div className="field__top">
                <label htmlFor="b-genre" className="field__label">장르 (선택)</label>
              </div>
              <select id="b-genre" className="my-select" value={form.genre} onChange={set('genre')}>
                <option value="">선택 안 함</option>
                {genres.map((g) => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>
            </div>
            <Field id="b-year" label="연식 (선택)" error={errors.modelYear}>
              <input id="b-year" type="number" inputMode="numeric" value={form.modelYear} onChange={set('modelYear')} placeholder="2021" />
            </Field>
            <Field id="b-cc" label="배기량 cc (선택)">
              <input id="b-cc" type="number" inputMode="numeric" min={1} value={form.cc} onChange={set('cc')} placeholder="689" />
            </Field>
            <Field id="b-km" label="현재 주행거리 km" error={errors.currentKm}>
              <input id="b-km" type="number" inputMode="numeric" min={0} value={form.currentKm} onChange={set('currentKm')} placeholder="18420" />
            </Field>
            <Field id="b-date" label="구매일 (선택)">
              <input id="b-date" type="date" value={form.purchasedOn} onChange={set('purchasedOn')} max={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field id="b-pkm" label="구매 시 주행거리 km (선택)" error={errors.purchaseKm}>
              <input id="b-pkm" type="number" inputMode="numeric" min={0} value={form.purchaseKm} onChange={set('purchaseKm')} placeholder="9200" />
            </Field>
          </div>

          <div className="check">
            <input id="b-main" type="checkbox" checked={form.isMain} onChange={set('isMain')} disabled={bike?.isMain} />
            <label htmlFor="b-main">
              대표 바이크로 지정 <span className="muted">(프로필의 '내 바이크'에 표시돼요)</span>
            </label>
          </div>

          <div className="write-actions garage-form__actions">
            {isEdit && (
              <button type="button" className="btn btn--outline my-btn-danger garage-form__delete" onClick={onDelete} disabled={busy}>
                삭제
              </button>
            )}
            <button type="button" className="btn btn--outline" onClick={() => navigate(isEdit ? `/garage/${bike.id}` : '/garage')} disabled={busy}>
              취소
            </button>
            <button type="submit" className="btn btn--gold" disabled={busy}>
              {busy ? '저장하는 중…' : isEdit ? '수정 완료' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
