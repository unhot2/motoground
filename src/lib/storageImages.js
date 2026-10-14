// 사진 업로드 공통 (글쓰기 · 내 차고)
// 내 폴더({회원id}/...)에 올리고 공개 주소를 돌려줍니다.
import { supabase, isSupabaseConfigured } from './supabase.js';

const IMAGE_MAX_SIDE = 1920; // 긴 변 기준으로 줄여서 저장

// 큰 사진은 줄여서 저장 (GIF 는 움직임 유지를 위해 그대로)
async function shrinkImage(file) {
  if (file.type === 'image/gif') return { blob: file, ext: 'gif', type: file.type };
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const toBlob = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, 0.86));
  const webp = await toBlob('image/webp');
  if (webp?.type === 'image/webp') return { blob: webp, ext: 'webp', type: 'image/webp' };
  return { blob: await toBlob('image/jpeg'), ext: 'jpg', type: 'image/jpeg' };
}

// 사진 여러 장 업로드 → 공개 주소 목록 (순서 유지)
export async function uploadImages(bucket, userId, files) {
  if (!isSupabaseConfigured) throw new Error('Supabase 설정이 없어 사진을 올릴 수 없어요.');
  const storage = supabase.storage.from(bucket);
  const urls = [];
  for (const file of files) {
    const { blob, ext, type } = await shrinkImage(file);
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await storage.upload(path, blob, { contentType: type, upsert: false });
    if (error) {
      await removeImages(bucket, urls); // 중간에 실패하면 이번에 올린 것 정리
      throw error;
    }
    urls.push(storage.getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

// 공개 주소 → 저장소 경로로 바꿔서 삭제 (내 폴더 것만 지워짐)
export async function removeImages(bucket, urls) {
  const marker = `/object/public/${bucket}/`;
  const paths = urls
    .map((u) => (u.includes(marker) ? decodeURIComponent(u.split(marker)[1]) : null))
    .filter(Boolean);
  if (!paths.length || !isSupabaseConfigured) return;
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) console.warn('사진 파일 정리 실패', error);
}
