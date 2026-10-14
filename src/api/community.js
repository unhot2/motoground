// 커뮤니티 데이터 함수
// Supabase가 설정되어 있으면 DB에서, 아니면 예시 데이터에서 같은 모양으로 돌려줍니다.
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { dummyPosts, dummyComments } from '../data/community.js';

export const PAGE_SIZE = 10;

const SORT_COLUMNS = {
  latest: 'created_at',
  views: 'view_count',
  comments: 'comment_count',
  likes: 'like_count',
};
const SORT_KEYS = { latest: 'createdAt', views: 'views', comments: 'comments', likes: 'likes' };

const POST_FIELDS =
  'id, board_slug, title, is_pinned, view_count, comment_count, like_count, created_at, author:profiles!posts_author_id_fkey(nickname)';
// ↑ posts 와 profiles 는 작성자(author_id)·추천(post_likes) 두 경로로 이어져 있어서 작성자 쪽을 명시

// DB 행 → 화면에서 쓰는 모양
const toPost = (row) => ({
  id: row.id,
  board: row.board_slug,
  title: row.title,
  content: row.content ?? '',
  imageUrls: row.image_urls ?? [],
  author: row.author?.nickname ?? '알 수 없음',
  createdAt: row.created_at,
  views: row.view_count,
  comments: row.comment_count,
  likes: row.like_count,
  pinned: row.is_pinned,
});

const toComment = (row) => ({
  id: row.id,
  parentId: row.parent_id,
  authorId: row.author_id ?? null,
  author: row.author?.nickname ?? '탈퇴한 회원',
  avatarUrl: row.author?.avatar_url ?? null,
  createdAt: row.created_at,
  text: row.content,
  likes: row.like_count,
});

// 답글을 부모 댓글 바로 아래로 정렬
function threadComments(list) {
  const roots = list.filter((c) => !c.parentId);
  const out = [];
  roots.forEach((r) => {
    out.push({ ...r, reply: false });
    list
      .filter((c) => c.parentId === r.id)
      .forEach((c) => out.push({ ...c, reply: true }));
  });
  return out;
}

const delay = (v) => new Promise((resolve) => setTimeout(() => resolve(v), 120));
const byDesc = (key) => (a, b) =>
  key === 'createdAt' ? b.createdAt.localeCompare(a.createdAt) : b[key] - a[key];

// ---------------------------------------------------------------------
// 게시글 목록 (공지 제외, 공지 게시판은 공지 포함)
// ---------------------------------------------------------------------
export async function fetchPosts({ board = 'all', sort = 'latest', page = 1 }) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  if (!isSupabaseConfigured) {
    const list = dummyPosts
      .filter((p) => (board === 'notice' ? p.board === 'notice' : !p.pinned))
      .filter((p) => board === 'all' || p.board === board)
      .sort(byDesc(SORT_KEYS[sort]));
    return delay({ items: list.slice(from, to + 1), total: list.length });
  }

  let q = supabase.from('posts').select(POST_FIELDS, { count: 'exact' });
  if (board !== 'all') q = q.eq('board_slug', board);
  if (board !== 'notice') q = q.eq('is_pinned', false);
  q = q.order(SORT_COLUMNS[sort], { ascending: false }).order('id', { ascending: false }).range(from, to);

  const { data, error, count } = await q;
  if (error) throw error;
  return { items: data.map(toPost), total: count ?? 0 };
}

// 상단 고정 공지
export async function fetchNotices(limit = 2) {
  if (!isSupabaseConfigured) {
    return delay(dummyPosts.filter((p) => p.pinned).slice(0, limit));
  }
  const { data, error } = await supabase
    .from('posts')
    .select(POST_FIELDS)
    .eq('is_pinned', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(toPost);
}

// 주간 인기글: 최근 7일 글 중 조회수 순
export async function fetchWeeklyTop({ board = 'all', limit = 5 } = {}) {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  if (!isSupabaseConfigured) {
    return delay(
      dummyPosts
        .filter((p) => !p.pinned && p.createdAt >= since && (board === 'all' || p.board === board))
        .sort(byDesc('views'))
        .slice(0, limit)
    );
  }

  let q = supabase
    .from('posts')
    .select(POST_FIELDS)
    .eq('is_pinned', false)
    .gte('created_at', since);
  if (board !== 'all') q = q.eq('board_slug', board);
  const { data, error } = await q.order('view_count', { ascending: false }).limit(limit);
  if (error) throw error;
  return data.map(toPost);
}

// ---------------------------------------------------------------------
// 게시글 상세 + 이전/다음 글
// ---------------------------------------------------------------------
export async function fetchPost(id) {
  const postId = Number(id);
  if (!Number.isInteger(postId)) return null;

  if (!isSupabaseConfigured) {
    const post = dummyPosts.find((p) => p.id === postId) ?? null;
    if (!post) return delay(null);
    const normal = dummyPosts.filter((p) => !p.pinned && p.board === post.board);
    const prev = normal.filter((p) => p.id < postId).sort((a, b) => b.id - a.id)[0] ?? null;
    const next = normal.filter((p) => p.id > postId).sort((a, b) => a.id - b.id)[0] ?? null;
    return delay({ post, prev, next });
  }

  const { data, error } = await supabase
    .from('posts')
    .select(`${POST_FIELDS}, content, image_urls`)
    .eq('id', postId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const post = toPost(data);
  const base = () =>
    supabase.from('posts').select('id, title').eq('board_slug', post.board).eq('is_pinned', false);
  const [prevRes, nextRes] = await Promise.all([
    base().lt('id', postId).order('id', { ascending: false }).limit(1),
    base().gt('id', postId).order('id', { ascending: true }).limit(1),
  ]);

  return { post, prev: prevRes.data?.[0] ?? null, next: nextRes.data?.[0] ?? null };
}

export async function fetchComments(postId) {
  if (!isSupabaseConfigured) return delay(threadComments(dummyComments));

  const { data, error } = await supabase
    .from('comments')
    .select('id, parent_id, author_id, content, like_count, created_at, author:profiles!comments_author_id_fkey(nickname, avatar_url)')
    .eq('post_id', Number(postId))
    .order('created_at', { ascending: true });
  if (error) throw error;
  return threadComments(data.map(toComment));
}

// 댓글 등록 (parentId 가 있으면 답글)
export const COMMENT_MAX = 1000;

export async function createComment({ postId, authorId, content, parentId = null }) {
  if (!isSupabaseConfigured) throw new Error('Supabase 설정이 없어 댓글을 등록할 수 없어요.');
  const { error } = await supabase.from('comments').insert({
    post_id: Number(postId),
    author_id: authorId,
    parent_id: parentId,
    content,
  });
  if (error) throw error;
}

export async function deleteComment(commentId) {
  if (!isSupabaseConfigured) throw new Error('Supabase 설정이 없어 댓글을 삭제할 수 없어요.');
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}

// 내가 이 글을 추천했는지
export async function fetchMyPostLike(postId, userId) {
  if (!isSupabaseConfigured || !userId) return false;
  const { count, error } = await supabase
    .from('post_likes')
    .select('post_id', { count: 'exact', head: true })
    .eq('post_id', Number(postId))
    .eq('user_id', userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// 게시글 추천 / 추천 취소
export async function setPostLike({ postId, userId, liked }) {
  if (!isSupabaseConfigured) throw new Error('Supabase 설정이 없어 추천할 수 없어요.');
  const table = supabase.from('post_likes');
  const { error } = liked
    ? await table.insert({ post_id: Number(postId), user_id: userId })
    : await table.delete().eq('post_id', Number(postId)).eq('user_id', userId);
  // 이미 추천한 상태(중복)는 성공으로 봄
  if (error && error.code !== '23505') throw error;
}

// 조회수 +1 (같은 브라우저 세션에서는 글마다 한 번만)
const viewed = new Set();
export async function increaseView(postId) {
  const key = `mg-viewed-${postId}`;
  if (viewed.has(key)) return;
  viewed.add(key);
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    /* 저장소를 못 쓰는 환경이면 무시 */
  }
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.rpc('increment_post_view', { p_post_id: Number(postId) });
  if (error) console.warn('조회수 갱신 실패', error);
}
