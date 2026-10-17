import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Field } from '../components/AuthCard.jsx';
import PhotoPicker, { toPhotoItems } from '../components/PhotoPicker.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAsync from '../hooks/useAsync.js';
import {
  CONTACT_MAX,
  DESCRIPTION_MAX,
  GOODS_PHOTO_MAX,
  TITLE_MAX,
  createGoods,
  fetchGoods,
  fetchGoodsContact,
  updateGoods,
} from '../api/goods.js';
import { formatPrice, goodsCategories, goodsConditions } from '../data/goods.js';
import { joinRegion, sidoList, splitRegion } from '../data/regions.js';
import { GoodsHead } from './GoodsPage.jsx';

// /goods/new 등록, /goods/:id/edit 수정 — 1단계 간단 폼 (모델 카탈로그가 없어 2단계가 불필요)
export default function GoodsFormPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const loaded = useAsync(
    async () => (id ? Promise.all([fetchGoods(id), fetchGoodsContact(id)]) : null),
    [id]
  );
  const title = id ? '용품 수정' : '용품 등록';

  if (id && loaded.loading) {
    return (
      <>
        <GoodsHead title={title} />
        <div className="container market-page"><div className="card garage-form my-loading" aria-busy="true" /></div>
      </>
    );
  }
  const [goods, contact] = loaded.data ?? [];
  if (id && (loaded.error || !goods || goods.sellerId !== user.id)) {
    return (
      <>
        <GoodsHead title={title} />
        <div className="container market-page">
          <div className="card board-empty">수정할 수 없는 용품이에요. <Link to="/goods">용품 목록으로</Link></div>
        </div>
      </>
    );
  }
  return <GoodsForm key={id ?? 'new'} goods={goods ?? null} contact={contact ?? ''} />;
}

function GoodsForm({ goods, contact }) {
  const isEdit = Boolean(goods);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const region = splitRegion(goods?.region ?? profile?.region);

  const [form, setForm] = useState({
    category: goods?.category ?? '',
    title: goods?.title ?? '',
    brand: goods?.brand ?? '',
    size: goods?.size ?? '',
    condition: goods?.condition ?? '',
    priceMan: goods ? goods.price / 10000 : '',
    sido: region.sido,
    regionDetail: region.detail,
    description: goods?.description ?? '',
    contact,
  });
  const [images, setImages] = useState(() => toPhotoItems(goods?.imageUrls));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const setValue = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };
  const set = (key) => (e) => setValue(key, e.target.value);

  const price = form.priceMan === '' ? null : Math.round(Number(form.priceMan) * 10000);

  function validate() {
    const found = {};
    if (!form.category) found.category = '카테고리를 골라주세요.';
    if (!images.length) found.images = '사진을 1장 이상 올려주세요.';
    if (!form.title.trim()) found.title = '제목을 입력해 주세요.';
    if (price == null || Number.isNaN(price) || price < 0) found.priceMan = '가격을 입력해 주세요.';
    else if (price > 2_000_000_000) found.priceMan = '가격을 확인해 주세요.';
    if (!form.condition) found.condition = '상태를 골라주세요.';
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
    try {
      const payload = { ...form, price, region: joinRegion(form.sido, form.regionDetail) };
      if (isEdit) {
        await updateGoods(goods.id, payload);
        navigate(`/goods/${goods.id}`, { replace: true });
      } else {
        // 새로 고른 사진만 createGoods 에 넘기면 안에서 올려줌
        const newFiles = images.filter((img) => img.file).map((img) => img.file);
        const goodsId = await createGoods(payload, newFiles);
        navigate(`/goods/${goodsId}`, { replace: true });
      }
    } catch (err) {
      console.error(err);
      setFormError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  }

  const title = isEdit ? '용품 수정' : '용품 등록';

  return (
    <>
      <GoodsHead title={title} />
      <div className="container market-page">
        <form className="card garage-form" onSubmit={onSubmit} noValidate>
          {formError && <p className="form-alert" role="alert">{formError}</p>}

          <fieldset className="write-field" data-error={Boolean(errors.category)}>
            <legend className="write-label"><span>카테고리</span></legend>
            <div className="write-boards" role="radiogroup" aria-label="카테고리">
              {goodsCategories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={form.category === c.key}
                  className={`write-chip ${form.category === c.key ? 'is-active' : ''}`}
                  onClick={() => setValue('category', c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {errors.category && <p className="field__msg field__msg--error" role="alert">{errors.category}</p>}
          </fieldset>

          <div className="write-field" data-error={Boolean(errors.images)}>
            <div className="write-label">
              <span>사진</span>
              <span className="write-label__sub">
                {isEdit ? '사진 변경은 아직 지원되지 않아요' : `첫 번째 사진이 목록에 보여요 · 최대 ${GOODS_PHOTO_MAX}장`}
              </span>
            </div>
            <PhotoPicker
              images={images}
              onChange={(next) => {
                setImages(next);
                if (errors.images) setErrors((er) => ({ ...er, images: undefined }));
              }}
              max={GOODS_PHOTO_MAX}
              label="용품 사진"
            />
            {errors.images && <p className="field__msg field__msg--error" role="alert">{errors.images}</p>}
          </div>

          <Field id="g-title" label="제목" error={errors.title}>
            <input id="g-title" value={form.title} onChange={set('title')} maxLength={TITLE_MAX} placeholder="예: 아라이 헬멧 판매합니다" />
          </Field>

          <div className="garage-form__grid garage-form__grid--2">
            <Field id="g-brand" label="브랜드 (선택)">
              <input id="g-brand" value={form.brand} onChange={set('brand')} maxLength={40} placeholder="예: 아라이, 알파인스타즈" />
            </Field>
            <Field id="g-size" label="사이즈 (선택)">
              <input id="g-size" value={form.size} onChange={set('size')} maxLength={20} placeholder="예: L, 42, 95" />
            </Field>
          </div>

          <div className="garage-form__grid garage-form__grid--2">
            <Field id="g-price" label="가격 (만원)" error={errors.priceMan} hint={price ? formatPrice(price) : '0을 입력하면 무료 나눔으로 표시돼요'}>
              <input id="g-price" type="number" inputMode="decimal" min={0} step="any" value={form.priceMan} onChange={set('priceMan')} placeholder="15" aria-describedby="g-price-msg" />
            </Field>
            <div className={`field ${errors.condition ? 'field--error' : ''}`}>
              <div className="field__top">
                <label htmlFor="g-condition" className="field__label">상태</label>
              </div>
              <select id="g-condition" className="my-select" value={form.condition} onChange={set('condition')} aria-invalid={Boolean(errors.condition)}>
                <option value="">선택</option>
                {goodsConditions.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              {errors.condition && <p className="field__msg field__msg--error" role="alert">{errors.condition}</p>}
            </div>
          </div>

          <div className={`field ${errors.sido ? 'field--error' : ''}`}>
            <div className="field__top">
              <label htmlFor="g-sido" className="field__label">거래 지역</label>
            </div>
            <div className="my-region">
              <select id="g-sido" className="my-select" value={form.sido} onChange={set('sido')} aria-invalid={Boolean(errors.sido)}>
                <option value="">시·도</option>
                {sidoList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                id="g-region"
                value={form.regionDetail}
                onChange={set('regionDetail')}
                maxLength={30}
                placeholder="시·군·구 (예: 마포구)"
                aria-label="상세 지역"
              />
            </div>
            {errors.sido && <p className="field__msg field__msg--error" role="alert">{errors.sido}</p>}
          </div>

          <div className="field">
            <div className="field__top">
              <label htmlFor="g-desc" className="field__label">설명 (선택)</label>
              <span className="write-label__sub">{form.description.length} / {DESCRIPTION_MAX}</span>
            </div>
            <textarea
              id="g-desc"
              className="garage-textarea"
              rows={8}
              value={form.description}
              onChange={set('description')}
              maxLength={DESCRIPTION_MAX}
              placeholder="사용 기간, 상태, 구성품, 거래 방법 등을 적어주세요."
            />
          </div>

          <Field id="g-contact" label="연락 방법" error={errors.contact} hint="카카오톡 오픈채팅 링크 또는 전화번호. 로그인한 회원에게만 보여요.">
            <input id="g-contact" value={form.contact} onChange={set('contact')} maxLength={CONTACT_MAX} placeholder="https://open.kakao.com/o/..." aria-describedby="g-contact-msg" />
          </Field>

          <div className="write-actions garage-form__actions">
            <button type="button" className="btn btn--outline" onClick={() => navigate(isEdit ? `/goods/${goods.id}` : '/goods')} disabled={busy}>
              취소
            </button>
            <button type="submit" className="btn btn--gold" disabled={busy}>
              {busy ? '저장하는 중…' : isEdit ? '수정 완료' : '용품 등록'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
