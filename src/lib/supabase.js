import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
// Supabase Connect 화면의 이름(PUBLISHABLE_KEY)과 짧은 이름(KEY), 예전 이름(ANON_KEY) 모두 지원
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

// .env.local 에 값이 있을 때만 Supabase에 연결합니다.
// 값이 없으면 null → 화면은 예시(더미) 데이터로 동작합니다.
export const supabase = url && key ? createClient(url, key) : null;

export const isSupabaseConfigured = Boolean(supabase);

if (import.meta.env.DEV) {
  console.info(
    isSupabaseConfigured
      ? '[motoground] Supabase에 연결했습니다.'
      : '[motoground] Supabase 설정이 없어 예시 데이터로 표시합니다. (.env.example 참고)'
  );
}
