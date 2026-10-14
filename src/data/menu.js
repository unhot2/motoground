// 사이트 메뉴/콘텐츠 데이터 (디자인 초안용 자리표시 포함)

// match: 현재 주소가 이 경로로 시작하면 메뉴를 활성 표시
export const mainNav = [
  { label: '홈', to: '/', match: '/' },
  { label: '커뮤니티', to: '/community', match: '/community' },
  { label: '중고매물', to: '/#market' },
  { label: '신차', to: '/#market' },
  { label: '모델 탐색', to: '/#features' },
  { label: '플레이스', to: '/#features' },
  { label: '용품', to: '/#services' },
  { label: '내 차고', to: '/garage', match: '/garage' },
];

export const isActivePath = (match, pathname, hash = '') => {
  if (!match) return false;
  if (match === '/') return pathname === '/' && !hash;
  return pathname.startsWith(match);
};

export const popularKeywords = ['레플리카', '네이키드', '투어러', '스쿠터', '입문용'];

export const services = [
  { label: '내차 골라줘', icon: 'bike', mobile: true },
  { label: '내 장르 찾기', icon: 'compass' },
  { label: '인증중고', icon: 'shield', mobile: true },
  { label: '내차팔기', icon: 'tag', mobile: true },
  { label: '최저가 보험', icon: 'umbrella', mobile: true },
  { label: '용품', icon: 'helmet', mobile: true },
  { label: '내 주변', icon: 'pin' },
  { label: '모델 탐색', icon: 'search', mobile: true },
  { label: '커뮤니티', icon: 'chat', to: '/community' },
  { label: '시세조회', icon: 'chart', mobile: true },
  { label: '매물알림', icon: 'bell', mobile: true },
  { label: '바이크관리', icon: 'wrench' },
  { label: '성향분석', icon: 'sliders' },
  { label: '불편신고', icon: 'alert' },
];

// 홈 '주간 인기 소식' 탭 (slug는 data/community.js의 boards와 동일)
export const homeBoardTabs = [
  { slug: 'all', name: '전체' },
  { slug: 'free', name: '자유게시판' },
  { slug: 'tour', name: '투어 후기' },
  { slug: 'qna', name: '정비 Q&A' },
  { slug: 'meetup', name: '모임·번개' },
];

export const features = [
  { title: '바이크 관리', desc: '유지비, 소모품 교체시기, 연비가 궁금하다면?', icon: 'wrench', to: '/garage' },
  { title: '모델 탐색', desc: '모델 제원, 가격, 유지비 비교를 한눈에', icon: 'search' },
  { title: '플레이스', desc: '내 주변 맛집, 모임, 라이딩 코스를 한눈에', icon: 'pin' },
  { title: '최저가 보험', desc: '보험료를 비교하고 가입까지 간편하게', icon: 'umbrella' },
  { title: '커뮤니티', desc: '바린이도 전문가로 성장할 수 있어요', icon: 'chat', to: '/community' },
];

export const mobileTabs = [
  { label: '홈', icon: 'home', to: '/', match: '/' },
  { label: '커뮤니티', icon: 'chat', to: '/community', match: '/community' },
  { label: '매물', icon: 'bike', to: '/#market' },
  { label: '채팅', icon: 'bubble', to: '/#chat' },
  { label: '내 차고', icon: 'garage', to: '/garage', match: '/garage' },
];

export const footerColumns = [
  { title: '고객지원', links: ['사업자정보확인', '이용약관', '개인정보처리방침'] },
  { title: '어바웃 모토그라운드', links: ['서비스 소개', '비즈니스 문의', '회사 소개'] },
];
