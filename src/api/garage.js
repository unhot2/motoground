// 내 차고 데이터 함수 — 로그인한 회원 본인 데이터만 다룹니다.
import { supabase } from '../lib/supabase.js';
import { removeImages, uploadImages } from '../lib/storageImages.js';

export const GARAGE_BUCKET = 'garage-images';
export const BIKE_PHOTO_MAX = 5;
export const RECEIPT_PHOTO_MAX = 3;

const db = () => {
  if (!supabase) throw new Error('Supabase 설정이 없어요. .env.local 을 확인해 주세요.');
  return supabase;
};

const toBike = (row) => ({
  id: row.id,
  nickname: row.nickname ?? '',
  brand: row.brand,
  model: row.model,
  modelYear: row.model_year,
  cc: row.displacement_cc,
  genre: row.genre,
  purchasedOn: row.purchased_on,
  purchaseKm: row.purchase_km,
  currentKm: row.current_km,
  imageUrls: row.image_urls ?? [],
  isMain: row.is_main,
  createdAt: row.created_at,
});

const toLog = (row) => ({
  id: row.id,
  bikeId: row.bike_id,
  category: row.category,
  items: row.items ?? [],
  performedOn: row.performed_on,
  odometerKm: row.odometer_km,
  cost: row.cost,
  shop: row.shop ?? '',
  memo: row.memo ?? '',
  imageUrls: row.image_urls ?? [],
});

const LOG_FIELDS = 'id, bike_id, category, items, performed_on, odometer_km, cost, shop, memo, image_urls';

// ---------------------------------------------------------------------
// 불러오기
// ---------------------------------------------------------------------
// 차고 목록: 내 바이크 + (상태 배지 계산용) 정비 기록·교체 주기
export async function fetchGarage(userId) {
  const [bikes, logs, intervals] = await Promise.all([
    db().from('bikes').select('*').eq('owner_id', userId).order('is_main', { ascending: false }).order('created_at'),
    db().from('bike_logs').select(LOG_FIELDS).eq('owner_id', userId).eq('category', 'maintenance'),
    db().from('bike_intervals').select('*'),
  ]);
  const error = bikes.error || logs.error || intervals.error;
  if (error) throw error;
  return { bikes: bikes.data.map(toBike), logs: logs.data.map(toLog), intervals: intervals.data };
}

// 바이크 상세: 바이크 + 전체 기록 + 교체 주기
export async function fetchBike(bikeId) {
  const id = Number(bikeId);
  if (!Number.isInteger(id)) return null;
  const [bike, logs, intervals] = await Promise.all([
    db().from('bikes').select('*').eq('id', id).maybeSingle(),
    db()
      .from('bike_logs')
      .select(LOG_FIELDS)
      .eq('bike_id', id)
      .order('performed_on', { ascending: false })
      .order('id', { ascending: false }),
    db().from('bike_intervals').select('*').eq('bike_id', id),
  ]);
  const error = bike.error || logs.error || intervals.error;
  if (error) throw error;
  if (!bike.data) return null;
  return { bike: toBike(bike.data), logs: logs.data.map(toLog), intervals: intervals.data };
}

// ---------------------------------------------------------------------
// 바이크 등록 · 수정 · 삭제
// ---------------------------------------------------------------------
const bikeRow = (f) => ({
  nickname: f.nickname?.trim() || null,
  brand: f.brand.trim(),
  model: f.model.trim(),
  model_year: f.modelYear || null,
  displacement_cc: f.cc || null,
  genre: f.genre || null,
  purchased_on: f.purchasedOn || null,
  purchase_km: f.purchaseKm ?? null,
  current_km: f.currentKm ?? 0,
  image_urls: f.imageUrls ?? [],
});

// 대표 바이크를 바꾸면 프로필의 '내 바이크' 도 같이 바꿈
async function setMainBike(userId, bikeId, label) {
  const { error: clearError } = await db()
    .from('bikes')
    .update({ is_main: false })
    .eq('owner_id', userId)
    .eq('is_main', true)
    .neq('id', bikeId);
  if (clearError) throw clearError;
  const { error } = await db().from('bikes').update({ is_main: true }).eq('id', bikeId);
  if (error) throw error;
  const { error: profileError } = await db().from('profiles').update({ bike_model: label }).eq('id', userId);
  if (profileError) console.warn('프로필 내 바이크 갱신 실패', profileError);
}

export async function createBike(userId, form, { makeMain = false } = {}) {
  const { data, error } = await db()
    .from('bikes')
    .insert({ ...bikeRow(form), owner_id: userId })
    .select('id')
    .single();
  if (error) throw error;
  if (makeMain) await setMainBike(userId, data.id, `${form.brand.trim()} ${form.model.trim()}`);
  return data.id;
}

export async function updateBike(userId, bikeId, form, { makeMain = false } = {}) {
  const { error } = await db().from('bikes').update(bikeRow(form)).eq('id', bikeId);
  if (error) throw error;
  if (makeMain) await setMainBike(userId, bikeId, `${form.brand.trim()} ${form.model.trim()}`);
}

export async function updateMileage(bikeId, km) {
  const { error } = await db().from('bikes').update({ current_km: km }).eq('id', bikeId);
  if (error) throw error;
}

export async function deleteBike(bike, logs = []) {
  const { error } = await db().from('bikes').delete().eq('id', bike.id);
  if (error) throw error;
  await removeImages(GARAGE_BUCKET, [...bike.imageUrls, ...logs.flatMap((l) => l.imageUrls)]);
}

export const uploadGarageImages = (userId, files) => uploadImages(GARAGE_BUCKET, userId, files);
export const removeGarageImages = (urls) => removeImages(GARAGE_BUCKET, urls);

// ---------------------------------------------------------------------
// 기록
// ---------------------------------------------------------------------
const logRow = (f) => ({
  category: f.category,
  items: f.category === 'maintenance' ? f.items : [],
  performed_on: f.performedOn,
  odometer_km: f.odometerKm ?? null,
  cost: f.cost ?? 0,
  shop: f.shop?.trim() || null,
  memo: f.memo?.trim() || null,
  image_urls: f.imageUrls ?? [],
});

export async function createLog(userId, bikeId, form) {
  const { error } = await db()
    .from('bike_logs')
    .insert({ ...logRow(form), bike_id: bikeId, owner_id: userId });
  if (error) throw error;
}

export async function updateLog(logId, form) {
  const { error } = await db().from('bike_logs').update(logRow(form)).eq('id', logId);
  if (error) throw error;
}

export async function deleteLog(log) {
  const { error } = await db().from('bike_logs').delete().eq('id', log.id);
  if (error) throw error;
  await removeImages(GARAGE_BUCKET, log.imageUrls);
}

// ---------------------------------------------------------------------
// 교체 주기 (기본값과 같으면 저장하지 않고 지움, 숨긴 항목은 주기를 비워서 저장)
// ---------------------------------------------------------------------
export async function saveIntervals(bikeId, items) {
  const isDefault = (i) => i.on && i.km === i.defaultKm && i.months === i.defaultMonths;
  const reset = items.filter(isDefault).map((i) => i.key);
  const keep = items.filter((i) => !isDefault(i));

  if (reset.length) {
    const { error } = await db().from('bike_intervals').delete().eq('bike_id', bikeId).in('item_key', reset);
    if (error) throw error;
  }
  if (keep.length) {
    const { error } = await db()
      .from('bike_intervals')
      .upsert(
        keep.map((i) => ({
          bike_id: bikeId,
          item_key: i.key,
          interval_km: (i.on && i.km) || null,
          interval_months: (i.on && i.months) || null,
        }))
      );
    if (error) throw error;
  }
}
