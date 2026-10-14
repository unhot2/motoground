// 내 정보(마이페이지) 데이터 함수 — 로그인한 회원 전용이라 Supabase 가 있어야 동작합니다.
import { supabase } from '../lib/supabase.js';

export const MY_PAGE_SIZE = 10;
const AVATAR_BUCKET = 'avatars';
const AVATAR_SIZE = 400; // 정사각형으로 잘라 저장하는 크기(px)

const client = () => {
  if (!supabase) throw new Error('Supabase 설정이 없어요. .env.local 을 확인해 주세요.');
  return supabase;
};

const range = (page) => {
  const from = (page - 1) * MY_PAGE_SIZE;
  return [from, from + MY_PAGE_SIZE - 1];
};

// ---------------------------------------------------------------------
// 활동 요약: 작성글 수, 댓글 수, 받은 추천 수
// ---------------------------------------------------------------------
export async function fetchMyStats(userId) {
  const db = client();
  const [posts, comments, likes] = await Promise.all([
    db.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', userId),
    db.from('comments').select('id', { count: 'exact', head: true }).eq('author_id', userId),
    db.from('posts').select('like_count').eq('author_id', userId).gt('like_count', 0),
  ]);
  const error = posts.error || comments.error || likes.error;
  if (error) throw error;
  return {
    posts: posts.count ?? 0,
    comments: comments.count ?? 0,
    likes: likes.data.reduce((sum, p) => sum + p.like_count, 0),
  };
}

// ---------------------------------------------------------------------
// 내 활동 목록 (탭)
// ---------------------------------------------------------------------
const toPostItem = (row) => ({
  id: row.id,
  board: row.board_slug,
  title: row.title,
  author: row.author?.nickname ?? '탈퇴한 회원',
  createdAt: row.created_at,
  views: row.view_count,
  comments: row.comment_count,
  likes: row.like_count,
});

const POST_ITEM_FIELDS =
  'id, board_slug, title, view_count, comment_count, like_count, created_at, author:profiles!posts_author_id_fkey(nickname)';

export async function fetchMyPosts(userId, page = 1) {
  const [from, to] = range(page);
  const { data, error, count } = await client()
    .from('posts')
    .select(POST_ITEM_FIELDS, { count: 'exact' })
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { items: data.map(toPostItem), total: count ?? 0 };
}

export async function fetchMyComments(userId, page = 1) {
  const [from, to] = range(page);
  const { data, error, count } = await client()
    .from('comments')
    .select('id, content, created_at, post:posts!comments_post_id_fkey(id, title, board_slug)', { count: 'exact' })
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return {
    items: data.map((row) => ({
      id: row.id,
      text: row.content,
      createdAt: row.created_at,
      postId: row.post?.id ?? null,
      postTitle: row.post?.title ?? '삭제된 글',
      board: row.post?.board_slug ?? '',
    })),
    total: count ?? 0,
  };
}

export async function fetchMyLikedPosts(userId, page = 1) {
  const [from, to] = range(page);
  const { data, error, count } = await client()
    .from('post_likes')
    .select(`created_at, post:posts!post_likes_post_id_fkey(${POST_ITEM_FIELDS})`, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { items: data.filter((row) => row.post).map((row) => toPostItem(row.post)), total: count ?? 0 };
}

// ---------------------------------------------------------------------
// 프로필 수정
// ---------------------------------------------------------------------
export async function updateMyProfile(userId, fields) {
  const { error } = await client().from('profiles').update(fields).eq('id', userId);
  if (error) {
    if (error.code === '23505') throw new Error('이미 쓰고 있는 닉네임이에요.');
    throw error;
  }
}

// 고른 사진을 가운데 기준 정사각형으로 잘라 줄입니다 (저장소 한도 1MB)
async function resizeToSquare(file) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  canvas
    .getContext('2d')
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close?.();

  const toBlob = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, 0.88));
  const webp = await toBlob('image/webp');
  if (webp?.type === 'image/webp') return { blob: webp, ext: 'webp', type: 'image/webp' };
  return { blob: await toBlob('image/jpeg'), ext: 'jpg', type: 'image/jpeg' }; // webp 미지원 브라우저
}

// 내 폴더({회원id}/)의 기존 프로필 사진을 모두 지움
async function removeMyAvatarFiles(userId, keep) {
  const storage = client().storage.from(AVATAR_BUCKET);
  const { data, error } = await storage.list(userId);
  if (error) throw error;
  const paths = data.map((f) => `${userId}/${f.name}`).filter((p) => p !== keep);
  if (paths.length) {
    const { error: removeError } = await storage.remove(paths);
    if (removeError) throw removeError;
  }
}

export async function uploadAvatar(userId, file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
    throw new Error('JPG, PNG, WEBP 사진만 올릴 수 있어요.');
  }
  const { blob, ext, type } = await resizeToSquare(file);
  // 파일 이름을 매번 바꿔서 브라우저에 남은 예전 사진(캐시)이 보이지 않게 함
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const storage = client().storage.from(AVATAR_BUCKET);

  const { error } = await storage.upload(path, blob, { contentType: type, upsert: false });
  if (error) throw error;

  const { data } = storage.getPublicUrl(path);
  await updateMyProfile(userId, { avatar_url: data.publicUrl });
  await removeMyAvatarFiles(userId, path).catch((err) => console.warn('예전 프로필 사진 정리 실패', err));
  return data.publicUrl;
}

export async function removeAvatar(userId) {
  await updateMyProfile(userId, { avatar_url: null });
  await removeMyAvatarFiles(userId).catch((err) => console.warn('프로필 사진 파일 삭제 실패', err));
}

// ---------------------------------------------------------------------
// 계정
// ---------------------------------------------------------------------
// 비밀번호 변경 전 현재 비밀번호 확인 (같은 계정으로 다시 로그인해 봄)
export async function verifyPassword(email, password) {
  const { error } = await client().auth.signInWithPassword({ email, password });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) throw new Error('현재 비밀번호가 맞지 않아요.');
    throw error;
  }
}

export async function deleteMyAccount(userId) {
  const { error } = await client().rpc('delete_my_account');
  if (error) throw error;
  // 계정이 지워져도 지금 로그인 토큰은 잠시 유효해서 내 폴더의 사진을 정리할 수 있음
  await removeMyAvatarFiles(userId).catch((err) => console.warn('프로필 사진 파일 삭제 실패', err));
  await client().auth.signOut({ scope: 'local' });
}
