import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const AuthContext = createContext(null);

const PROFILE_FIELDS = 'id, nickname, avatar_url, bike_model, region, role, created_at';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [isRecovery, setIsRecovery] = useState(false); // 비밀번호 재설정 링크로 들어온 상태

  // 세션 불러오기 + 로그인 상태 변화 구독
  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      // 이 콜백 안에서는 다른 supabase 호출을 하지 않습니다 (공식 권장)
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true);
      if (event === 'SIGNED_OUT') setIsRecovery(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // 로그인한 회원의 프로필(닉네임 등)
  const userId = session?.user?.id;
  const loadProfile = useCallback(async () => {
    if (!supabase || !userId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', userId).maybeSingle();
    if (error) console.warn('프로필을 불러오지 못했어요', error);
    setProfile(data ?? null);
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ---- 동작 함수 ----
  const requireClient = () => {
    if (!supabase) throw new Error('Supabase 설정이 없어요. .env.local 을 확인해 주세요.');
    return supabase;
  };

  const isNicknameTaken = useCallback(async (nickname) => {
    const { data, error } = await requireClient()
      .from('profiles')
      .select('id')
      .eq('nickname', nickname)
      .limit(1);
    if (error) throw error;
    return data.length > 0;
  }, []);

  const signUp = useCallback(async ({ email, password, nickname }) => {
    const { data, error } = await requireClient().auth.signUp({
      email,
      password,
      options: {
        data: { nickname }, // DB 트리거가 이 값으로 프로필을 만듭니다
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    // 이메일 인증을 켠 상태에서 이미 가입된 이메일이면 오류 대신 빈 identities 가 옵니다
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('User already registered');
    }
    return { needsEmailConfirm: !data.session };
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const { error } = await requireClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await requireClient().auth.signOut();
    if (error) throw error;
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    const { error } = await requireClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password) => {
    const { error } = await requireClient().auth.updateUser({ password });
    if (error) throw error;
    setIsRecovery(false);
  }, []);

  const value = useMemo(
    () => ({
      isConfigured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      profile,
      nickname: profile?.nickname ?? session?.user?.user_metadata?.nickname ?? '',
      isAdmin: profile?.role === 'admin',
      isRecovery,
      isNicknameTaken,
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      updatePassword,
      reloadProfile: loadProfile,
    }),
    [loading, session, profile, isRecovery, isNicknameTaken, signUp, signIn, signOut, sendPasswordReset, updatePassword, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 는 AuthProvider 안에서만 쓸 수 있어요.');
  return ctx;
}
