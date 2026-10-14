// 중고매물 데이터 함수
// Supabase가 설정되어 있으면 DB에서, 아니면 예시 데이터에서 같은 모양으로 돌려줍니다.
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { removeImages, uploadImages } from '../lib/storageImages.js';
import { ccRanges, dummyListings, kmRanges, priceRanges } from '../data/market.js';

export const PAGE_SIZE = 12;
export const LISTING_PHOTO_MAX = 10;
export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 3000;
export const TUNING_MAX = 200;
export const CONTACT_MAX = 200;
export const SEARCH_MAX = 50;
const BUCKET = 'listing-images';

const LISTING_FIELDS =
  'id, seller_id, title, brand, model, genre, model_year, mileage_km, displacement_cc, price, region, status, accident, view_count, like_count, created_at, images:listing_images(path, sort_order)';
// ↑ listings 와 profiles 는 판매자(seller_id)·찜(listing_likes) 두 경로로 이어져 있어서 판매자 쪽을 명시
const SELLER = 'seller:profiles!listings_seller_id_fkey(nickname, avatar_url)';

// listing_images.path(저장소 안 경로) ↔ 공개 주소
const marker = `/object/public/${BUCKET}/`;
const toPath = (url) => (url.includes(marker) ? decodeURIComponent(url.split(marker)[1]) : url);
const toUrl = (path) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

// DB 행 → 화면에서 쓰는 모양
const toListing = (row) => ({
  id: row.id,
  sellerId: row.seller_id,
  seller: row.seller?.nickname ?? '탈퇴한 회원',
  sellerAvatar: row.seller?.avatar_url ?? null,
  title: row.title,
  brand: row.brand,
  model: row.model,
  genre: row.genre,
  modelYear: row.model_year,
  mileageKm: row.mileage_km,
  cc: row.displacement_cc,
  price: row.price,
  region: row.region,
  description: row.description ?? '',
  accident: row.accident,
  tuning: row.tuning ?? '',
  status: row.status,
  views: row.view_count,
  likes: row.like_count,
  imageUrls: [...(row.images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((img) => toUrl(img.path)),
  createdAt: row.created_at,
});

const delay = (v) => new Promise((resolve) => setTimeout(() => resolve(v), 120));
const requireDb = () => {
  if (!isSupabaseConfigured) throw new Error('Supabase 설정이 없어 매물을 저장할 수 없어요.');
  return supabase;
};

// LIKE 검색에서 % _ \ 를 글자 그대로 찾도록
const likeEscape = (text) => text.replace(/[\\%_]/g, '\\$&');
// or() 필터 안에서는 값 전체를 따옴표로 감싸야 쉼표·괄호가 안전함
const quoteFilter = (text) => `"${text.replace(/["\\]/g, '\\$&')}"`;

// ---------------------------------------------------------------------
// 목록
// filters: { q, genre, brand, sido, price, cc, year, km, sold, sort, page }
//   price/cc/km 은 data/market.js 의 범위 key, year 는 'n년식 이후' 의 n
// ---------------------------------------------------------------------
const SORTS = {
  latest: { column: 'created_at', ascending: false },
  price: { column: 'price', ascending: true },
  mileage: { column: 'mileage_km', ascending: true },
  year: { column: 'model_year', ascending: false },
  likes: { column: 'like_count', ascending: false },
};
const DUMMY_SORT_KEYS = { created_at: 'createdAt', price: 'price', mileage_km: 'mileageKm', model_year: 'modelYear', like_count: 'likes' };

const findRange = (list, key) => list.find((r) => r.key === key) ?? null;

function matchesDummy(l, f) {
  const inRange = (value, range) =>
    !range || (value != null && (range.min == null || value >= range.min) && (range.max == null || value <= range.max));
  const q = f.q?.toLowerCase();
  return (
    (f.sold || l.status !== 'sold') &&
    (!q || [l.title, l.brand, l.model].some((t) => t.toLowerCase().includes(q))) &&
    (!f.genre || l.genre === f.genre) &&
    (!f.brand || l.brand === f.brand) &&
    (!f.sido || l.region.startsWith(f.sido)) &&
    inRange(l.price, findRange(priceRanges, f.price)) &&
    inRange(l.cc, findRange(ccRanges, f.cc)) &&
    inRange(l.mileageKm, findRange(kmRanges, f.km)) &&
    (!f.year || (l.modelYear ?? 0) >= Number(f.year))
  );
}

export async function fetchListings(filters) {
  const { sort = 'latest', page = 1 } = filters;
  const q = filters.q?.trim().slice(0, SEARCH_MAX) ?? '';
  const order = SORTS[sort] ?? SORTS.latest;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  if (!isSupabaseConfigured) {
    const key = DUMMY_SORT_KEYS[order.column];
    const list = dummyListings
      .filter((l) => matchesDummy(l, { ...filters, q }))
      .sort((a, b) => {
        if (a[key] == null) return 1;
        if (b[key] == null) return -1;
        const diff = key === 'createdAt' ? a[key].localeCompare(b[key]) : a[key] - b[key];
        return (order.ascending ? diff : -diff) || b.id - a.id;
      });
    return delay({ items: list.slice(from, to + 1), total: list.length });
  }

  let query = supabase.from('listings').select(`${LISTING_FIELDS}, ${SELLER}`, { count: 'exact' });
  if (!filters.sold) query = query.neq('status', 'sold');
  if (q) {
    const pattern = quoteFilter(`%${likeEscape(q)}%`);
    query = query.or(`title.ilike.${pattern},brand.ilike.${pattern},model.ilike.${pattern}`);
  }
  if (filters.genre) query = query.eq('genre', filters.genre);
  if (filters.brand) query = query.eq('brand', filters.brand);
  if (filters.sido) query = query.like('region', `${likeEscape(filters.sido)}%`);
  if (filters.year) query = query.gte('model_year', Number(filters.year));

  const ranges = [
    ['price', findRange(priceRanges, filters.price)],
    ['displacement_cc', findRange(ccRanges, filters.cc)],
    ['mileage_km', findRange(kmRanges, filters.km)],
  ];
  ranges.forEach(([column, range]) => {
    if (range?.min != null) query = query.gte(column, range.min);
    if (range?.max != null) query = query.lte(column, range.max);
  });

  const { data, error, count } = await query
    .order(order.column, { ascending: order.ascending, nullsFirst: false })
    .order('id', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { items: data.map(toListing), total: count ?? 0 };
}

// 홈 카드용: 판매중·예약중 매물 수
export async function fetchListingCount() {
  if (!isSupabaseConfigured) return delay(dummyListings.filter((l) => l.status !== 'sold').length);
  const { count, error } = await supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'sold');
  if (error) throw error;
  return count ?? 0;
}

// ---------------------------------------------------------------------
// 상세
// ---------------------------------------------------------------------
export async function fetchListing(id) {
  const listingId = Number(id);
  if (!Number.isInteger(listingId)) return null;

  if (!isSupabaseConfigured) return delay(dummyListings.find((l) => l.id === listingId) ?? null);

  const { data, error } = await supabase
    .from('listings')
    .select(`${LISTING_FIELDS}, description, tuning, ${SELLER}`)
    .eq('id', listingId)
    .maybeSingle();
  if (error) throw error;
  return data ? toListing(data) : null;
}

// 비슷한 매물: 같은 모델 → 모자라면 같은 장르로 채움 (판매완료 제외)
export async function fetchSimilarListings(listing, limit = 4) {
  if (!isSupabaseConfigured) {
    const others = dummyListings.filter((l) => l.id !== listing.id && l.status !== 'sold');
    const same = others.filter((l) => l.brand === listing.brand && l.model === listing.model);
    const genre = others.filter((l) => l.genre === listing.genre && !same.includes(l));
    return delay([...same, ...genre].slice(0, limit));
  }

  const base = () =>
    supabase
      .from('listings')
      .select(`${LISTING_FIELDS}, ${SELLER}`)
      .neq('id', listing.id)
      .neq('status', 'sold')
      .order('created_at', { ascending: false })
      .limit(limit);
  const same = await base().eq('brand', listing.brand).eq('model', listing.model);
  if (same.error) throw same.error;
  let rows = same.data;
  if (rows.length < limit && listing.genre) {
    const genre = await base().eq('genre', listing.genre);
    if (genre.error) throw genre.error;
    const ids = new Set(rows.map((r) => r.id));
    rows = [...rows, ...genre.data.filter((r) => !ids.has(r.id))].slice(0, limit);
  }
  return rows.map(toListing);
}

// 판매자 활동: 올린 매물 수 · 판매완료 수
export async function fetchSellerStats(sellerId) {
  if (!isSupabaseConfigured || !sellerId) return { total: 0, sold: 0 };
  const count = (q) => q.then(({ count: n, error }) => {
    if (error) throw error;
    return n ?? 0;
  });
  const base = () => supabase.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', sellerId);
  const [total, sold] = await Promise.all([count(base()), count(base().eq('status', 'sold'))]);
  return { total, sold };
}

// 연락처 (로그인 회원만 읽을 수 있음)
export async function fetchContact(listingId) {
  if (!isSupabaseConfigured) return '';
  const { data, error } = await supabase
    .from('listing_contacts')
    .select('contact')
    .eq('listing_id', Number(listingId))
    .maybeSingle();
  if (error) throw error;
  return data?.contact ?? '';
}

// 조회수 +1 (같은 브라우저 세션에서는 매물마다 한 번만)
const viewed = new Set();
export async function increaseListingView(listingId) {
  const key = `mg-listing-viewed-${listingId}`;
  if (viewed.has(key)) return;
  viewed.add(key);
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    /* 저장소를 못 쓰는 환경이면 무시 */
  }
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.rpc('increment_listing_view', { p_listing_id: Number(listingId) });
  if (error) console.warn('조회수 갱신 실패', error);
}

// ---------------------------------------------------------------------
// 찜
// ---------------------------------------------------------------------
// 이 목록 중 내가 찜한 매물 id
export async function fetchMyListingLikes(listingIds, userId) {
  if (!isSupabaseConfigured || !userId || !listingIds.length) return new Set();
  const { data, error } = await supabase
    .from('listing_likes')
    .select('listing_id')
    .eq('user_id', userId)
    .in('listing_id', listingIds);
  if (error) throw error;
  return new Set(data.map((r) => r.listing_id));
}

export async function setListingLike({ listingId, userId, liked }) {
  const table = requireDb().from('listing_likes');
  const { error } = liked
    ? await table.insert({ listing_id: listingId, user_id: userId })
    : await table.delete().eq('listing_id', listingId).eq('user_id', userId);
  // 이미 찜한 상태(중복)는 성공으로 봄
  if (error && error.code !== '23505') throw error;
}

// ---------------------------------------------------------------------
// 등록 · 수정 · 상태 변경 · 삭제
// ---------------------------------------------------------------------
export const uploadListingImages = (userId, files) => uploadImages(BUCKET, userId, files);
export const removeListingImages = (urls) => removeImages(BUCKET, urls);

const listingRow = (f) => ({
  title: f.title.trim(),
  brand: f.brand.trim(),
  model: f.model.trim(),
  genre: f.genre || null,
  model_year: f.modelYear ?? null,
  mileage_km: f.mileageKm,
  displacement_cc: f.cc ?? null,
  price: f.price,
  region: f.region,
  description: f.description.trim(),
  accident: f.accident || null,
  tuning: f.tuning.trim() || null,
});

async function saveImages(listingId, urls) {
  const db = requireDb();
  const { error: clearError } = await db.from('listing_images').delete().eq('listing_id', listingId);
  if (clearError) throw clearError;
  if (!urls.length) return;
  const { error } = await db
    .from('listing_images')
    .insert(urls.map((url, i) => ({ listing_id: listingId, path: toPath(url), sort_order: i })));
  if (error) throw error;
}

async function saveContact(listingId, contact) {
  const { error } = await requireDb()
    .from('listing_contacts')
    .upsert({ listing_id: listingId, contact: contact.trim() });
  if (error) throw error;
}

export async function createListing(userId, form) {
  const { data, error } = await requireDb()
    .from('listings')
    .insert({ ...listingRow(form), seller_id: userId })
    .select('id')
    .single();
  if (error) throw error;
  try {
    await saveImages(data.id, form.imageUrls);
    await saveContact(data.id, form.contact);
  } catch (err) {
    // 사진·연락처 저장에 실패하면 반쪽짜리 매물이 남지 않게 지움
    await supabase.from('listings').delete().eq('id', data.id);
    throw err;
  }
  return data.id;
}

export async function updateListing(listingId, form) {
  const { error } = await requireDb().from('listings').update(listingRow(form)).eq('id', listingId);
  if (error) throw error;
  await saveImages(listingId, form.imageUrls);
  await saveContact(listingId, form.contact);
}

export async function setListingStatus(listingId, status) {
  const { error } = await requireDb().from('listings').update({ status }).eq('id', listingId);
  if (error) throw error;
}

export async function deleteListing(listing) {
  const { error } = await requireDb().from('listings').delete().eq('id', listing.id);
  if (error) throw error;
  await removeListingImages(listing.imageUrls);
}
