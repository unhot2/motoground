import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Field } from '../components/AuthCard.jsx';
import Icon from '../components/Icon.jsx';
import PhotoPicker, { resolvePhotoUrls, toPhotoItems } from '../components/PhotoPicker.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAsync from '../hooks/useAsync.js';
import {
  DESCRIPTION_MAX,
  HOURS_MAX,
  NAME_MAX,
  PLACE_PHOTO_MAX,
  createPlace,
  fetchPlace,
  removePlaceImages,
  updatePlace,
  uploadPlaceImages,
} from '../api/place.js';
import { placeCategories, placeTags } from '../data/place.js';
import { sidoList } from '../data/regions.js';
import { isKakaoMapConfigured, searchKakaoPlaces, sidoFromAddress } from '../lib/kakaoMap.js';
import { PlaceHead } from './PlacePage.jsx';

// /place/new 등록, /place/:id/edit 수정 — 운영자만
export default function PlaceFormPage() {
  const { id } = useParams();
  const { isAdmin, profile } = useAuth();
  const loaded = useAsync(async () => (id ? fetchPlace(id) : null), [id]);
  const title = id ? '장소 수정' : '장소 등록';

  // 프로필(권한)을 아직 불러오는 중
  if (!profile || (id && loaded.loading)) {
    return (
      <>
        <PlaceHead title={title} />
        <div className="container place-page"><div className="card garage-form my-loading" aria-busy="true" /></div>
      </>
    );
  }
  if (!isAdmin || (id && (loaded.error || !loaded.data))) {
    return (
      <>
        <PlaceHead title={title} />
        <div className="container place-page">
          <div className="card board-empty">
            {isAdmin ? '장소를 찾을 수 없어요.' : '장소 등록은 운영자만 할 수 있어요.'} <Link to="/place">플레이스로</Link>
          </div>
        </div>
      </>
    );
  }
  return <PlaceForm key={id ?? 'new'} place={loaded.data ?? null} />;
}

const numberOrNull = (v) => (v === '' || v == null ? null : Number(v));

function PlaceForm({ place }) {
  const isEdit = Boolean(place);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    category: place?.category ?? '',
    name: place?.name ?? '',
    address: place?.address ?? '',
    region: place?.region ?? '',
    lat: place?.lat ?? '',
    lng: place?.lng ?? '',
    phone: place?.phone ?? '',
    hours: place?.hours ?? '',
    description: place?.description ?? '',
    tags: place?.tags ?? [],
    kakaoPlaceId: place?.kakaoPlaceId ?? '',
    isPublished: place?.isPublished ?? true,
  });
  const [images, setImages] = useState(() => toPhotoItems(place?.imageUrls));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const setValue = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };
  const set = (key) => (e) => setValue(key, e.target.value);
  const toggleTag = (key) =>
    setForm((f) => ({ ...f, tags: f.tags.includes(key) ? f.tags.filter((t) => t !== key) : [...f.tags, key] }));

  // 카카오 검색 결과를 고르면 이름·주소·좌표·전화를 채움
  function pick(r) {
    const sido = sidoFromAddress(r.address);
    setForm((f) => ({
      ...f,
      name: f.name || r.name,
      address: r.address,
      region: sidoList.includes(sido) ? sido : f.region,
      lat: r.lat,
      lng: r.lng,
      phone: r.phone || f.phone,
      kakaoPlaceId: r.id,
    }));
    setErrors({});
  }

  function validate() {
    const found = {};
    const lat = numberOrNull(form.lat);
    const lng = numberOrNull(form.lng);
    if (!form.category) found.category = '분류를 골라주세요.';
    if (!form.name.trim()) found.name = '장소 이름을 입력해 주세요.';
    if (!form.address.trim()) found.address = '주소를 입력해 주세요.';
    if (!form.region) found.region = '시·도를 골라주세요.';
    if ((lat == null) !== (lng == null)) found.lat = '위도와 경도를 함께 입력해 주세요.';
    else if (lat != null && (Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)) {
      found.lat = '좌표를 확인해 주세요.';
    }
    return found;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      requestAnimationFrame(() =>
        document.querySelector('.field--error, [data-error="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      );
      return;
    }

    setBusy(true);
    let uploaded = [];
    try {
      const photos = await resolvePhotoUrls(images, (files) => uploadPlaceImages(user.id, files));
      uploaded = photos.uploaded;
      const payload = { ...form, lat: numberOrNull(form.lat), lng: numberOrNull(form.lng), imageUrls: photos.urls };
      let placeId = place?.id;
      if (isEdit) {
        await updatePlace(place.id, payload);
        await removePlaceImages(place.imageUrls.filter((u) => !photos.urls.includes(u)));
      } else {
        placeId = await createPlace(user.id, payload);
      }
      navigate(`/place/${placeId}`, { replace: true });
    } catch (err) {
      console.error(err);
      await removePlaceImages(uploaded);
      setFormError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  }

  return (
    <>
      <PlaceHead title={isEdit ? '장소 수정' : '장소 등록'} desc="운영자만 볼 수 있는 화면이에요" />
      <div className="container place-page">
        <form className="card garage-form" onSubmit={onSubmit} noValidate>
          {formError && <p className="form-alert" role="alert">{formError}</p>}

          {isKakaoMapConfigured ? (
            <KakaoSearch onPick={pick} />
          ) : (
            <p className="form-alert form-alert--warn">
              카카오 지도 키가 없어서 장소 검색을 쓸 수 없어요. 주소와 좌표를 직접 입력해 주세요.
            </p>
          )}

          <fieldset className="write-field" data-error={Boolean(errors.category)}>
            <legend className="write-label"><span>분류</span></legend>
            <div className="write-boards" role="radiogroup" aria-label="분류">
              {placeCategories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={form.category === c.key}
                  className={`write-chip place-cat ${form.category === c.key ? 'is-active' : ''}`}
                  onClick={() => setValue('category', c.key)}
                >
                  <Icon name={c.icon} size={16} strokeWidth={2} /> {c.label}
                </button>
              ))}
            </div>
            {errors.category && <p className="field__msg field__msg--error" role="alert">{errors.category}</p>}
          </fieldset>

          <div className="garage-form__grid garage-form__grid--2">
            <Field id="pl-name" label="장소 이름" error={errors.name}>
              <input id="pl-name" value={form.name} onChange={set('name')} maxLength={NAME_MAX} placeholder="북악 라이더스 카페" />
            </Field>
            <Field id="pl-phone" label="전화 (선택)">
              <input id="pl-phone" value={form.phone} onChange={set('phone')} maxLength={30} placeholder="02-123-4567" />
            </Field>
          </div>

          <div className="place-form__addr">
            <div className={`field ${errors.region ? 'field--error' : ''}`}>
              <div className="field__top"><label htmlFor="pl-region" className="field__label">시·도</label></div>
              <select id="pl-region" className="my-select" value={form.region} onChange={set('region')} aria-invalid={Boolean(errors.region)}>
                <option value="">선택</option>
                {sidoList.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.region && <p className="field__msg field__msg--error" role="alert">{errors.region}</p>}
            </div>
            <Field id="pl-address" label="주소" error={errors.address}>
              <input id="pl-address" value={form.address} onChange={set('address')} maxLength={200} placeholder="서울 종로구 ..." />
            </Field>
          </div>

          <div className="garage-form__grid garage-form__grid--2">
            <Field id="pl-lat" label="위도 (선택)" error={errors.lat} hint="비워두면 지도에는 안 보이고 목록에만 보여요">
              <input id="pl-lat" type="number" inputMode="decimal" step="any" value={form.lat} onChange={set('lat')} placeholder="37.5935" aria-describedby="pl-lat-msg" />
            </Field>
            <Field id="pl-lng" label="경도 (선택)">
              <input id="pl-lng" type="number" inputMode="decimal" step="any" value={form.lng} onChange={set('lng')} placeholder="126.9805" />
            </Field>
          </div>

          <fieldset className="write-field">
            <legend className="write-label">
              <span>라이더 태그</span>
              <span className="write-label__sub">해당하는 것을 모두 골라주세요</span>
            </legend>
            <div className="write-boards">
              {placeTags.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={form.tags.includes(t.key)}
                  className={`write-chip ${form.tags.includes(t.key) ? 'is-active' : ''}`}
                  onClick={() => toggleTag(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="write-field">
            <div className="write-label">
              <span>사진</span>
              <span className="write-label__sub">첫 번째 사진이 목록에 보여요 · 최대 {PLACE_PHOTO_MAX}장</span>
            </div>
            <PhotoPicker images={images} onChange={setImages} max={PLACE_PHOTO_MAX} label="장소 사진" />
          </div>

          <div className="field">
            <div className="field__top">
              <label htmlFor="pl-hours" className="field__label">영업시간 (선택)</label>
            </div>
            <textarea id="pl-hours" className="garage-textarea" rows={2} value={form.hours} onChange={set('hours')} maxLength={HOURS_MAX} placeholder="매일 10:00 – 20:00 (월요일 휴무)" />
          </div>

          <div className="field">
            <div className="field__top">
              <label htmlFor="pl-desc" className="field__label">소개 (선택)</label>
              <span className="write-label__sub">{form.description.length} / {DESCRIPTION_MAX}</span>
            </div>
            <textarea
              id="pl-desc"
              className="garage-textarea"
              rows={6}
              value={form.description}
              onChange={set('description')}
              maxLength={DESCRIPTION_MAX}
              placeholder="바이크 주차 위치, 라이더에게 좋은 점, 주변 코스 등을 적어주세요."
            />
          </div>

          <div className="check">
            <input id="pl-pub" type="checkbox" checked={form.isPublished} onChange={(e) => setValue('isPublished', e.target.checked)} />
            <label htmlFor="pl-pub">
              공개 <span className="muted">(끄면 운영자만 볼 수 있어요)</span>
            </label>
          </div>

          <div className="write-actions garage-form__actions">
            <button type="button" className="btn btn--outline" onClick={() => navigate(isEdit ? `/place/${place.id}` : '/place')} disabled={busy}>
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

// 카카오 장소 검색 → 결과를 고르면 폼을 채움
function KakaoSearch({ onPick }) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState(null);
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSearch() {
    const k = keyword.trim();
    if (!k) return;
    setBusy(true);
    setError('');
    try {
      setResults(await searchKakaoPlaces(k));
    } catch (err) {
      console.error(err);
      setError('검색하지 못했어요. 카카오 지도 설정을 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="write-field place-kakao">
      <div className="write-label">
        <span>카카오맵에서 찾기</span>
        <span className="write-label__sub">고르면 이름 · 주소 · 좌표 · 전화가 채워져요</span>
      </div>
      {/* 바깥 폼과 겹치지 않게 form 대신 Enter 키로 검색 */}
      <div className="board-search place-search">
        <label htmlFor="pl-kakao" className="sr-only">카카오맵 장소 검색</label>
        <input
          id="pl-kakao"
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSearch();
            }
          }}
          placeholder="가게 이름이나 주소로 검색"
        />
        <button type="button" aria-label="검색" onClick={onSearch} disabled={busy}>
          <Icon name="search" size={18} strokeWidth={2} />
        </button>
      </div>
      {error && <p className="field__msg field__msg--error" role="alert">{error}</p>}
      {results && results.length === 0 && <p className="muted-2">검색 결과가 없어요.</p>}
      {results && results.length > 0 && (
        <ul className="place-kakao__results">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={`place-kakao__item ${picked === r.id ? 'is-active' : ''}`}
                onClick={() => {
                  setPicked(r.id);
                  onPick(r);
                }}
              >
                <strong>{r.name}</strong>
                <span>{r.address}</span>
                <span className="muted-2">{r.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
