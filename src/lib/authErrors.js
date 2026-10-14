// Supabase 인증 오류 → 한국어 안내 문구
const rules = [
  [/invalid login credentials/i, '이메일 또는 비밀번호가 맞지 않아요.'],
  [/email not confirmed/i, '이메일 인증이 아직 안 됐어요. 받은 메일함에서 인증 링크를 눌러주세요.'],
  [/user already registered|already been registered/i, '이미 가입된 이메일이에요. 로그인해 주세요.'],
  [/password should be at least|weak password|weak_password/i, '비밀번호가 너무 짧거나 쉬워요. 8자 이상으로 정해주세요.'],
  [/same.*password|different from the old/i, '이전과 다른 비밀번호를 입력해 주세요.'],
  [/rate limit|too many requests|over_email_send_rate_limit/i, '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'],
  [/for security purposes/i, '보안을 위해 잠시 후 다시 시도해 주세요.'],
  [/unable to validate email|invalid email|email address .* is invalid/i, '이메일 주소 형식을 확인해 주세요.'],
  [/database error saving new user/i, '가입 정보를 저장하지 못했어요. 이미 쓰는 닉네임일 수 있어요.'],
  [/signups not allowed|signup is disabled/i, '지금은 회원가입을 받을 수 없어요.'],
  [/auth session missing|session.*expired|invalid.*token|otp_expired/i, '링크가 만료됐거나 잘못됐어요. 다시 요청해 주세요.'],
  [/failed to fetch|network/i, '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'],
];

export function authErrorMessage(error) {
  const text = `${error?.code ?? ''} ${error?.message ?? error ?? ''}`;
  const hit = rules.find(([re]) => re.test(text));
  return hit ? hit[1] : '문제가 생겼어요. 잠시 후 다시 시도해 주세요.';
}
