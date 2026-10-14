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
  CONTACT_MAX,
  DESCRIPTION_MAX,
  LISTING_PHOTO_MAX,
  TITLE_MAX,
  TUNING_MAX,
  createListing,
  fetchContact,
  fetchListing,
  removeListingImages,
  updateListing,
  uploadListingImages,
} from '../api/market.js';
import { findModel } from '../data/bikeCatalog.js';
import { genreLabel, genres } from '../data/garage.js';
import { accidents, formatPrice } from '../data/market.js';
import { joinRegion, sidoList, splitRegion } from '../data/regions.js';
import { MarketHead } from './MarketPage.jsx';

// /market/new 등록, /market/:id/edit 수정
export default function ListingFormPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const loaded = useAsync(
    async () => (id ? Promise.all([fetchListing(id), fetchContact(id)]) : null),
    [id]
  );
  const title = id ? '매물 수정' : '내 바이크 팔기';

  if (id && loaded.loading) {
    return (
      <>
        <MarketHead title={title} />
        <div className="container market-page"><div className="card garage-form my-loading" aria-busy="true" /></div>
      </>
    );
  }
  const [listing, contact] = loaded.data ?? [];
  if (id && (loaded.error || !listing || listing.sellerId !== user.id)) {
    return (
      <>
        <MarketHead title={title} />
        <div className="container market-page">
          <div className="card board-empty">수정할 수 없는 매물이에요. <Link to="/market">매물 목록으로</Link></div>
        </div>
      </>
    );
  }
  return <ListingForm key={id ?? 'new'} listing={listing ?? null} contact={contact ?? ''} />;
}

const numberOrNull = (v) => (v === '' || v == null ? null : Number(v));

function ListingForm({ listing, contact }) {
  const isEdit = Boolean(listing);
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const region = splitRegion(listing?.region ?? profile?.region);

  const [form, setForm] = useState({
    brand: listing?.brand ?? '',
    model: listing?.model ?? '',
    genre: listing?.genre ?? '',
    cc: listing?.cc ?? '',
    title: listing?.title ?? '',
    priceMan: listing ? listing.price / 10000 : '',
    modelYear: listing?.modelYear ?? '',
    mileageKm: listing?.mileageKm ?? '',
    sido: region.sido,
    regionDetail: region.detail,
    accident: listing?.accident ?? '',
    tuning: listing?.tuning ?? '',
    description: listing?.description ?? '',
    contact,
  });
  const [images, setImages] = useState(() => toPhotoItems(listing?.imageUrls));
  const [step, setStep] = useState(isEdit ? 'detail' : 'model');
  const [direct, setDirect] = useState(isEdit && !findModel(listing.brand, listing.model));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const setValue = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };
  const set = (key) => (e) => setValue(key, e.target.value);

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

  const price = form.priceMan === '' ? null : Math.round(Number(form.priceMan) * 10000);

  function validate() {
    const found = {};
    const year = numberOrNull(form.modelYear);
    if (!form.brand.trim()) found.brand = '제조사를 입력해 주세요.';
    if (!form.model.trim()) found.model = '모델명을 입력해 주세요.';
    if (!images.length) found.images = '사진을 1장 이상 올려주세요.';
    if (!form.title.trim()) found.title = '제목을 입력해 주세요.';
    if (price == null || Number.isNaN(price) || price < 0) found.priceMan = '가격을 입력해 주세요.';
    else if (price > 2_000_000_000) found.priceMan = '가격을 확인해 주세요.';
    if (year != null && (year < 1950 || year > new Date().getFullYear() + 1)) found.modelYear = '연식을 확인해 주세요.';
    if (form.mileageKm === '' || Number(form.mileageKm) < 0) found.mileageKm = '주행거리를 입력해 주세요.';
    if (!form.sido) found.sido = '거래 지역을 골라주세요.';
    if (!form.contact.trim()) found.contact = '연락받을 방법을 입력해 주세요.';
    return found;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      // 오류 표시가 그려진 뒤 첫 번째 오류 칸으로 이동
      requestAnimationFrame(() =>
        document.querySelector('.field--error, [data-error="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      );
      return;
    }

    setBusy(true);
    let uploaded = [];
    try {
      const photos = await resolvePhotoUrls(images, (files) => uploadListingImages(user.id, files));
      uploaded = photos.uploaded;
      const payload = {
        ...form,
        price,
        modelYear: numberOrNull(form.modelYear),
        mileageKm: Number(form.mileageKm),
        cc: numberOrNull(form.cc),
        region: joinRegion(form.sido, form.regionDetail),
        imageUrls: photos.urls,
      };
      let listingId = listing?.id;
      if (isEdit) {
        await updateListing(listing.id, payload);
        await removeListingImages(listing.imageUrls.filter((u) => !photos.urls.includes(u)));
      } else {
        listingId = await createListing(user.id, payload);
      }
      navigate(`/market/${listingId}`, { replace: true });
    } catch (err) {
      console.error(err);
      await removeListingImages(uploaded);
      setFormError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  }

  const title = isEdit ? '매물 수정' : '내 바이크 팔기';
  const steps = (
    <ol className="garage-steps" aria-label="등록 단계">
      <li className={step === 'model' ? 'is-current' : ''} aria-current={step === 'model' ? 'step' : undefined}>
        <span>1</span> 모델 선택
      </li>
      <li className={step === 'detail' ? 'is-current' : ''} aria-current={step === 'detail' ? 'step' : undefined}>
        <span>2</span> 매물 정보
      </li>
    </ol>
  );

  if (step === 'model') {
    return (
      <>
        <MarketHead title={title} action={steps} />
        <div className="container market-page">
          <div className="card garage-form">
            <ModelPicker initialBrand={form.brand} initialModel={form.model} onNext={pickModel} onDirect={goDirect} />
            <div className="garage-form__back">
              <button type="button" className="my-link-btn" onClick={() => (isEdit ? setStep('detail') : navigate('/market'))}>
                {isEdit ? '모델 변경 취소' : '취소하고 매물 목록으로'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MarketHead title={title} action={steps} />
      <div className="container market-page">
        <form className="card garage-form" onSubmit={onSubmit} noValidate>
          {formError && <p className="form-alert" role="alert">{formError}</p>}

          {direct ? (
            <div className="garage-form__direct">
              <div className="garage-form__grid garage-form__grid--2">
                <Field id="l-brand" label="제조사" error={errors.brand}>
                  <input id="l-brand" value={form.brand} onChange={set('brand')} maxLength={30} placeholder="예: 대림, SYM" />
                </Field>
                <Field id="l-model" label="모델명" error={errors.model}>
                  <input id="l-model" value={form.model} onChange={set('model')} maxLength={40} placeholder="예: VJF250" />
                </Field>
              </div>
              <button type="button" className="my-link-btn" onClick={() => setStep('model')}>목록에서 고르기</button>
            </div>
          ) : (
            <div className="model-picked model-picked--summary">
              <span className="model-picked__art"><BikeArt genre={form.genre} image={findModel(form.brand, form.model)?.image} width={72} /></span>
              <div className="model-picked__info">
                <span className="model-picked__label">판매할 모델</span>
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

          <div className="write-field" data-error={Boolean(errors.images)}>
            <div className="write-label">
              <span>사진</span>
              <span className="write-label__sub">첫 번째 사진이 목록에 보여요 · 최대 {LISTING_PHOTO_MAX}장</span>
            </div>
            <PhotoPicker
              images={images}
              onChange={(next) => {
                setImages(next);
                if (errors.images) setErrors((er) => ({ ...er, images: undefined }));
              }}
              max={LISTING_PHOTO_MAX}
              label="매물 사진"
            />
            {errors.images && <p className="field__msg field__msg--error" role="alert">{errors.images}</p>}
          </div>

          <Field id="l-title" label="제목" error={errors.title}>
            <input id="l-title" value={form.title} onChange={set('title')} maxLength={TITLE_MAX} placeholder={`${form.brand} ${form.model} 판매합니다`.trim()} />
          </Field>

          <div className="garage-form__grid">
            <Field id="l-price" label="가격 (만원)" error={errors.priceMan} hint={price ? formatPrice(price) : '0을 입력하면 무료 나눔으로 표시돼요'}>
              <input id="l-price" type="number" inputMode="decimal" min={0} step="any" value={form.priceMan} onChange={set('priceMan')} placeholder="720" aria-describedby="l-price-msg" />
            </Field>
            <Field id="l-km" label="주행거리 km" error={errors.mileageKm}>
              <input id="l-km" type="number" inputMode="numeric" min={0} value={form.mileageKm} onChange={set('mileageKm')} placeholder="12400" />
            </Field>
            <Field id="l-year" label="연식 (선택)" error={errors.modelYear}>
              <input id="l-year" type="number" inputMode="numeric" value={form.modelYear} onChange={set('modelYear')} placeholder="2021" />
            </Field>
            <Field id="l-cc" label="배기량 cc (선택)">
              <input id="l-cc" type="number" inputMode="numeric" min={1} value={form.cc} onChange={set('cc')} placeholder="689" />
            </Field>
            <div className="field">
              <div className="field__top">
                <label htmlFor="l-genre" className="field__label">장르 (선택)</label>
              </div>
              <select id="l-genre" className="my-select" value={form.genre} onChange={set('genre')}>
                <option value="">선택 안 함</option>
                {genres.map((g) => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={`field ${errors.sido ? 'field--error' : ''}`}>
            <div className="field__top">
              <label htmlFor="l-sido" className="field__label">거래 지역</label>
            </div>
            <div className="my-region">
              <select id="l-sido" className="my-select" value={form.sido} onChange={set('sido')} aria-invalid={Boolean(errors.sido)}>
                <option value="">시·도</option>
                {sidoList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                id="l-region"
                value={form.regionDetail}
                onChange={set('regionDetail')}
                maxLength={30}
                placeholder="시·군·구 (예: 마포구)"
                aria-label="상세 지역"
              />
            </div>
            {errors.sido && <p className="field__msg field__msg--error" role="alert">{errors.sido}</p>}
          </div>

          <fieldset className="write-field">
            <legend className="write-label">
              <span>사고 이력</span>
              <span className="write-label__sub">선택</span>
            </legend>
            <div className="write-boards" role="radiogroup" aria-label="사고 이력">
              {[{ key: '', label: '선택 안 함' }, ...accidents].map((a) => (
                <button
                  key={a.key || 'none-set'}
                  type="button"
                  role="radio"
                  aria-checked={form.accident === a.key}
                  className={`write-chip ${form.accident === a.key ? 'is-active' : ''}`}
                  onClick={() => setValue('accident', a.key)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </fieldset>

          <Field id="l-tuning" label="튜닝 내역 (선택)">
            <input id="l-tuning" value={form.tuning} onChange={set('tuning')} maxLength={TUNING_MAX} placeholder="예: 아크라포빅 슬립온, 프레임 슬라이더" />
          </Field>

          <div className="field">
            <div className="field__top">
              <label htmlFor="l-desc" className="field__label">설명 (선택)</label>
              <span className="write-label__sub">{form.description.length} / {DESCRIPTION_MAX}</span>
            </div>
            <textarea
              id="l-desc"
              className="garage-textarea"
              rows={8}
              value={form.description}
              onChange={set('description')}
              maxLength={DESCRIPTION_MAX}
              placeholder="정비 이력, 소모품 교체 시기, 판매 이유, 거래 방법 등을 적어주세요."
            />
          </div>

          <Field id="l-contact" label="연락 방법" error={errors.contact} hint="카카오톡 오픈채팅 링크 또는 전화번호. 로그인한 회원에게만 보여요.">
            <input id="l-contact" value={form.contact} onChange={set('contact')} maxLength={CONTACT_MAX} placeholder="https://open.kakao.com/o/..." aria-describedby="l-contact-msg" />
          </Field>

          <div className="write-actions garage-form__actions">
            <button type="button" className="btn btn--outline" onClick={() => navigate(isEdit ? `/market/${listing.id}` : '/market')} disabled={busy}>
              취소
            </button>
            <button type="submit" className="btn btn--gold" disabled={busy}>
              {busy ? '저장하는 중…' : isEdit ? '수정 완료' : '매물 등록'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
