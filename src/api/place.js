// 플레이스 데이터 함수
// Supabase가 설정되어 있으면 DB에서, 아니면 예시 데이터에서 같은 모양으로 돌려줍니다.
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { removeImages, uploadImages } from '../lib/storageImages.js';
import { dummyPlaces } from '../data/place.js';

export const PLACE_PHOTO_MAX = 10;
export const NAME_MAX = 60;
export const DESCRIPTION_MAX = 2000;
export const HOURS_MAX = 200;
export const REVIEW_MAX = 500;
export const SEARCH_MAX = 50;
const LIST_MAX = 300; // 지도에 한 번에 올릴 최대 장소 수
const BUCKET = 'place-images';

const PLACE_FIELDS =
  'id, category, name, address, region, lat, lng, phone, hours, tags, image_urls, kakao_place_id, is_published, review_count, rating_sum, like_count, created_at';

// DB 행 → 화면에서 쓰는 모양
const toPlace = (row) => ({
  id: row.id,
  category: row.category,
  name: row.name,
  address: row.address,
  region: row.region,
  lat: row.lat,
  lng: row.lng,
  phone: row.phone ?? '',
  hours: row.hours ?? '',
  description: row.description ?? '',
  tags: row.tags ?? [],
  imageUrls: row.image_urls ?? [],
  kakaoPlaceId: row.kakao_place_id,
  isPublished: row.is_published,
  reviewCount: row.review_count,
  ratingSum: row.rating_sum,
  likes: row.like_count,
  createdAt: row.created_at,
});

const toReview = (row) => ({
  id: row.id,
  authorId: row.author_id,
  author: row.author?.nickname ?? '탈퇴한 회원',
  avatarUrl: row.author?.avatar_url ?? null,
  rating: row.rating,
  content: row.content,
  createdAt: row.created_at,
});

const delay = (v) => new Promise((resolve) => setTimeout(() => resolve(v), 120));
const requireDb = () => {
  if (!isSupabaseConfigured) throw new Error('Supabase 설정이 없어 저장할 수 없어요.');
  return supabase;
};
// LIKE 검색에서 % _ \ 를 글자 그대로 찾도록
const likeEscape = (text) => text.replace(/[\\%_]/g, '\\$&');
const quoteFilter = (text) => `"${text.replace(/["\\]/g, '\\$&')}"`;

// ---------------------------------------------------------------------
// 목록 (지도에 같이 찍기 때문에 페이지 없이 한 번에)
// ---------------------------------------------------------------------
export async function fetchPlaces({ category = '', sido = '', q = '' } = {}) {
  const keyword = q.trim().slice(0, SEARCH_MAX);

  if (!isSupabaseConfigured) {
    const k = keyword.toLowerCase();
    return delay(
      dummyPlaces.filter(
        (p) =>
          (!category || p.category === category) &&
          (!sido || p.region === sido) &&
          (!k || p.name.toLowerCase().includes(k) || p.address.toLowerCase().includes(k))
      )
    );
  }

  let query = supabase.from('places').select(PLACE_FIELDS);
  if (category) query = query.eq('category', category);
  if (sido) query = query.eq('region', sido);
  if (keyword) {
    const pattern = quoteFilter(`%${likeEscape(keyword)}%`);
    query = query.or(`name.ilike.${pattern},address.ilike.${pattern}`);
  }
  const { data, error } = await query.order('created_at', { ascending: false }).limit(LIST_MAX);
  if (error) throw error;
  return data.map(toPlace);
}

export async function fetchPlace(id) {
  const placeId = Number(id);
  if (!Number.isInteger(placeId)) return null;
  if (!isSupabaseConfigured) return delay(dummyPlaces.find((p) => p.id === placeId) ?? null);

  const { data, error } = await supabase
    .from('places')
    .select(`${PLACE_FIELDS}, description`)
    .eq('id', placeId)
    .maybeSingle();
  if (error) throw error;
  return data ? toPlace(data) : null;
}

// 주변 장소: 좌표 기준 약 ±10km 안에서 (거리 정렬은 화면에서)
export async function fetchNearbyPlaces(place) {
  if (place.lat == null) return [];
  const box = { lat: 0.09, lng: 0.12 };
  if (!isSupabaseConfigured) {
    return delay(
      dummyPlaces.filter(
        (p) => p.id !== place.id && Math.abs(p.lat - place.lat) < box.lat && Math.abs(p.lng - place.lng) < box.lng
      )
    );
  }
  const { data, error } = await supabase
    .from('places')
    .select(PLACE_FIELDS)
    .neq('id', place.id)
    .gte('lat', place.lat - box.lat)
    .lte('lat', place.lat + box.lat)
    .gte('lng', place.lng - box.lng)
    .lte('lng', place.lng + box.lng)
    .limit(30);
  if (error) throw error;
  return data.map(toPlace);
}

// ---------------------------------------------------------------------
// 후기
// ---------------------------------------------------------------------
export async function fetchPlaceReviews(placeId) {
  if (!isSupabaseConfigured) return delay([]);
  const { data, error } = await supabase
    .from('place_reviews')
    .select('id, author_id, rating, content, created_at, author:profiles(nickname, avatar_url)')
    .eq('place_id', Number(placeId))
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toReview);
}

export async function createPlaceReview({ placeId, authorId, rating, content }) {
  const { error } = await requireDb()
    .from('place_reviews')
    .insert({ place_id: Number(placeId), author_id: authorId, rating, content: content.trim() });
  if (error?.code === '23505') throw new Error('이미 이 장소에 후기를 남겼어요.');
  if (error) throw error;
}

export async function deletePlaceReview(reviewId) {
  const { error } = await requireDb().from('place_reviews').delete().eq('id', reviewId);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// 찜
// ---------------------------------------------------------------------
export async function fetchMyPlaceLike(placeId, userId) {
  if (!isSupabaseConfigured || !userId) return false;
  const { count, error } = await supabase
    .from('place_likes')
    .select('place_id', { count: 'exact', head: true })
    .eq('place_id', Number(placeId))
    .eq('user_id', userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function setPlaceLike({ placeId, userId, liked }) {
  const table = requireDb().from('place_likes');
  const { error } = liked
    ? await table.insert({ place_id: Number(placeId), user_id: userId })
    : await table.delete().eq('place_id', Number(placeId)).eq('user_id', userId);
  if (error && error.code !== '23505') throw error;
}

// ---------------------------------------------------------------------
// 운영자: 등록 · 수정 · 삭제
// ---------------------------------------------------------------------
export const uploadPlaceImages = (userId, files) => uploadImages(BUCKET, userId, files);
export const removePlaceImages = (urls) => removeImages(BUCKET, urls);

const placeRow = (f) => ({
  category: f.category,
  name: f.name.trim(),
  address: f.address.trim(),
  region: f.region,
  lat: f.lat ?? null,
  lng: f.lng ?? null,
  phone: f.phone.trim() || null,
  hours: f.hours.trim() || null,
  description: f.description.trim(),
  tags: f.tags,
  image_urls: f.imageUrls,
  kakao_place_id: f.kakaoPlaceId || null,
  is_published: f.isPublished,
});

export async function createPlace(userId, form) {
  const { data, error } = await requireDb()
    .from('places')
    .insert({ ...placeRow(form), created_by: userId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updatePlace(placeId, form) {
  const { error } = await requireDb().from('places').update(placeRow(form)).eq('id', placeId);
  if (error) throw error;
}

export async function deletePlace(place) {
  const { error } = await requireDb().from('places').delete().eq('id', place.id);
  if (error) throw error;
  await removePlaceImages(place.imageUrls);
}
