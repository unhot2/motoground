// 용품(바이크 용품 거래) 데이터 함수
// Supabase가 설정되어 있으면 DB에서, 아니면 예시 데이터에서 같은 모양으로 돌려줍니다.
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { removeImages, uploadImages } from '../lib/storageImages.js';
import { dummyGoods } from '../data/goods.js';

export const PAGE_SIZE = 12;
export const GOODS_PHOTO_MAX = 10;
export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 3000;
export const CONTACT_MAX = 200;
export const SEARCH_MAX = 50;
const BUCKET = 'goods-images';

const GOODS_FIELDS =
  'id, seller_id, category, title, brand, size, condition, price, region, status, view_count, like_count, created_at, images:goods_images(path, sort_order)';
// ↑ goods 와 profiles 는 판매자(seller_id)·찜(goods_likes) 두 경로로 이어져 있어서 판매자 쪽을 명시
const SELLER = 'seller:profiles!goods_seller_id_fkey(nickname, avatar_url)';

// goods_images.path(저장소 안 경로) ↔ 공개 주소
const marker = `/object/public/${BUCKET}/`;
const toPath = (url) => (url.includes(marker) ? decodeURIComponent(url.split(marker)[1]) : url);
// 더미 매물처럼 사이트 안 정적 파일(/dummy/...)이나 외부 주소면 그대로 사용
const toUrl = (path) =>
  /^(https?:)?\//.test(path) ? path : supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

// DB 행 → 화면에서 쓰는 모양
const toGoods = (row) => ({
  id: row.id,
  sellerId: row.seller_id,
  seller: row.seller?.nickname ?? '탈퇴한 회원',
  sellerAvatar: row.seller?.avatar_url ?? null,
  category: row.category,
  title: row.title,
  brand: row.brand,
  size: row.size,
  condition: row.condition,
  price: row.price,
  region: row.region,
  description: row.description ?? '',
  status: row.status,
  views: row.view_count,
  likes: row.like_count,
  imageUrls: [...(row.images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((img) => toUrl(img.path)),
  createdAt: row.created_at,
});

const delay = (v) => new Promise((resolve) => setTimeout(() => resolve(v), 120));
const requireDb = () => {
  if (!isSupabaseConfigured) throw new Error('Supabase 설정이 없어 용품을 저장할 수 없어요.');
  return supabase;
};

// LIKE 검색에서 % _ \ 를 글자 그대로 찾도록
const likeEscape = (text) => text.replace(/[\\%_]/g, '\\$&');
// or() 필터 안에서는 값 전체를 따옴표로 감싸야 쉼표·괄호가 안전함
const quoteFilter = (text) => `"${text.replace(/["\\]/g, '\\$&')}"`;

// ---------------------------------------------------------------------
// 목록
// filters: { category, condition, region, q, sort, page, pageSize }
// ---------------------------------------------------------------------
const SORTS = {
  latest: { column: 'created_at', ascending: false },
  price: { column: 'price', ascending: true },
  likes: { column: 'like_count', ascending: false },
};
const DUMMY_SORT_KEYS = { created_at: 'createdAt', price: 'price', like_count: 'likes' };

function matchesDummy(g, f) {
  const q = f.q?.toLowerCase();
  return (
    (!q || [g.title, g.brand].some((t) => t.toLowerCase().includes(q))) &&
    (!f.category || g.category === f.category) &&
    (!f.condition || g.condition === f.condition) &&
    (!f.region || g.region.startsWith(f.region))
  );
}

export async function fetchGoodsList(filters = {}) {
  const { category = '', condition = '', region = '', sort = 'latest', page = 1, pageSize = PAGE_SIZE } = filters;
  const q = filters.q?.trim().slice(0, SEARCH_MAX) ?? '';
  const order = SORTS[sort] ?? SORTS.latest;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (!isSupabaseConfigured) {
    const key = DUMMY_SORT_KEYS[order.column];
    const list = dummyGoods
      .filter((g) => matchesDummy(g, { category, condition, region, q }))
      .sort((a, b) => {
        const diff = key === 'createdAt' ? a[key].localeCompare(b[key]) : a[key] - b[key];
        return (order.ascending ? diff : -diff) || b.id - a.id;
      });
    return delay({ items: list.slice(from, to + 1), total: list.length });
  }

  let query = supabase.from('goods').select(`${GOODS_FIELDS}, ${SELLER}`, { count: 'exact' });
  if (category) query = query.eq('category', category);
  if (condition) query = query.eq('condition', condition);
  if (region) query = query.like('region', `${likeEscape(region)}%`);
  if (q) {
    const pattern = quoteFilter(`%${likeEscape(q)}%`);
    query = query.or(`title.ilike.${pattern},brand.ilike.${pattern}`);
  }

  const { data, error, count } = await query
    .order(order.column, { ascending: order.ascending, nullsFirst: false })
    .order('id', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { items: data.map(toGoods), total: count ?? 0 };
}

// ---------------------------------------------------------------------
// 상세
// ---------------------------------------------------------------------
export async function fetchGoods(id) {
  const goodsId = Number(id);
  if (!Number.isInteger(goodsId)) return null;

  if (!isSupabaseConfigured) return delay(dummyGoods.find((g) => g.id === goodsId) ?? null);

  const { data, error } = await supabase
    .from('goods')
    .select(`${GOODS_FIELDS}, description, ${SELLER}`)
    .eq('id', goodsId)
    .maybeSingle();
  if (error) throw error;
  return data ? toGoods(data) : null;
}

// 비슷한 용품: 같은 분류 (판매완료 제외)
export async function fetchSimilarGoods(id, category, limit = 4) {
  const goodsId = Number(id);

  if (!isSupabaseConfigured) {
    return delay(
      dummyGoods.filter((g) => g.id !== goodsId && g.category === category && g.status !== 'sold').slice(0, limit)
    );
  }

  const { data, error } = await supabase
    .from('goods')
    .select(`${GOODS_FIELDS}, ${SELLER}`)
    .neq('id', goodsId)
    .eq('category', category)
    .neq('status', 'sold')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(toGoods);
}

// 연락처 (로그인 회원만 읽을 수 있음, RLS로 제한)
export async function fetchGoodsContact(id) {
  if (!isSupabaseConfigured) return '';
  const { data, error } = await supabase
    .from('goods_contacts')
    .select('contact')
    .eq('goods_id', Number(id))
    .maybeSingle();
  if (error) throw error;
  return data?.contact ?? '';
}

// 조회수 +1 (같은 브라우저 세션에서는 용품마다 한 번만)
const viewed = new Set();
export async function increaseGoodsView(id) {
  const key = `mg-goods-viewed-${id}`;
  if (viewed.has(key)) return;
  viewed.add(key);
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    /* 저장소를 못 쓰는 환경이면 무시 */
  }
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.rpc('increment_goods_view', { p_goods_id: Number(id) });
  if (error) console.warn('조회수 갱신 실패', error);
}

// ---------------------------------------------------------------------
// 찜
// ---------------------------------------------------------------------
async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

export async function setGoodsLike(id, liked) {
  const db = requireDb();
  const userId = await currentUserId();
  if (!userId) throw new Error('로그인이 필요해요.');
  const table = db.from('goods_likes');
  const { error } = liked
    ? await table.insert({ goods_id: Number(id), user_id: userId })
    : await table.delete().eq('goods_id', Number(id)).eq('user_id', userId);
  // 이미 찜한 상태(중복)는 성공으로 봄
  if (error && error.code !== '23505') throw error;
}

// ---------------------------------------------------------------------
// 등록 · 수정 · 상태 변경 · 삭제
// ---------------------------------------------------------------------
const goodsRow = (f) => ({
  category: f.category,
  title: f.title.trim(),
  brand: f.brand.trim(),
  size: f.size.trim(),
  condition: f.condition,
  price: f.price,
  region: f.region,
  description: f.description.trim(),
});

async function saveImages(goodsId, urls) {
  const db = requireDb();
  const { error: clearError } = await db.from('goods_images').delete().eq('goods_id', goodsId);
  if (clearError) throw clearError;
  if (!urls.length) return;
  const { error } = await db
    .from('goods_images')
    .insert(urls.map((url, i) => ({ goods_id: goodsId, path: toPath(url), sort_order: i })));
  if (error) throw error;
}

async function saveContact(goodsId, contact) {
  const { error } = await requireDb()
    .from('goods_contacts')
    .upsert({ goods_id: goodsId, contact: contact.trim() });
  if (error) throw error;
}

export async function createGoods(payload, images) {
  const db = requireDb();
  const userId = await currentUserId();
  if (!userId) throw new Error('로그인이 필요해요.');

  const { data, error } = await db
    .from('goods')
    .insert({ ...goodsRow(payload), seller_id: userId })
    .select('id')
    .single();
  if (error) throw error;
  try {
    const imageUrls = images?.length ? await uploadImages(BUCKET, userId, images) : [];
    await saveImages(data.id, imageUrls);
    await saveContact(data.id, payload.contact);
  } catch (err) {
    // 사진·연락처 저장에 실패하면 반쪽짜리 매물이 남지 않게 지움
    await db.from('goods').delete().eq('id', data.id);
    throw err;
  }
  return data.id;
}

export async function updateGoods(id, payload) {
  const { error } = await requireDb().from('goods').update(goodsRow(payload)).eq('id', id);
  if (error) throw error;
  await saveContact(id, payload.contact);
}

export async function setGoodsStatus(id, status) {
  const { error } = await requireDb().from('goods').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteGoods(id) {
  const db = requireDb();
  const { data, error: fetchError } = await db
    .from('goods')
    .select('images:goods_images(path)')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  const { error } = await db.from('goods').delete().eq('id', id);
  if (error) throw error;
  const imageUrls = (data?.images ?? []).map((img) => toUrl(img.path));
  if (imageUrls.length) await removeImages(BUCKET, imageUrls);
}
