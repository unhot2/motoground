// 플레이스 분류 · 라이더 태그 + 예시(더미) 장소
// 값은 supabase/schema.sql 의 places.category · tags 와 같아야 합니다.

export const placeCategories = [
  { key: 'cafe', label: '라이더 카페', icon: 'cup' },
  { key: 'food', label: '맛집', icon: 'utensils' },
  { key: 'repair', label: '정비소', icon: 'wrench' },
  { key: 'parking', label: '바이크 주차', icon: 'parking' },
  { key: 'gear', label: '용품 · 딜러', icon: 'helmet' },
  { key: 'stay', label: '숙소 · 캠핑', icon: 'tent' },
  { key: 'wash', label: '세차', icon: 'drop' },
  { key: 'school', label: '교육 · 서킷', icon: 'flag' },
];
export const findPlaceCategory = (key) => placeCategories.find((c) => c.key === key) ?? null;

// 일반 지도앱에는 없는 라이더 전용 정보
export const placeTags = [
  { key: 'bike_parking', label: '바이크 주차' },
  { key: 'covered_parking', label: '지붕 있는 주차' },
  { key: 'free_parking', label: '무료 주차' },
  { key: 'helmet_storage', label: '헬멧 보관' },
  { key: 'rider_meet', label: '라이더 모임 장소' },
  { key: 'rider_discount', label: '라이더 할인' },
  { key: 'import_repair', label: '수입 바이크 정비' },
  { key: 'official_service', label: '공식 서비스센터' },
  { key: 'tire', label: '타이어 교체' },
  { key: 'bike_wash', label: '바이크 세차 가능' },
];
export const tagLabel = (key) => placeTags.find((t) => t.key === key)?.label ?? key;

// 두 좌표 사이 거리(km) — 하버사인 공식
export function distanceKm(a, b) {
  if (a?.lat == null || b?.lat == null) return null;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// 0.35 → '350m', 12.34 → '12.3km'
export function formatDistance(km) {
  if (km == null) return '';
  if (km < 1) return `${Math.max(10, Math.round(km * 100) * 10)}m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)}km`;
}

export const ratingOf = (place) => (place.reviewCount ? place.ratingSum / place.reviewCount : 0);

// 카카오맵 길찾기 · 지도 링크 (지도 키 없이도 동작)
export const kakaoRouteUrl = (p) => `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`;
export const kakaoMapUrl = (p) =>
  p.kakaoPlaceId
    ? `https://place.map.kakao.com/${p.kakaoPlaceId}`
    : p.lat != null
      ? `https://map.kakao.com/link/map/${encodeURIComponent(p.name)},${p.lat},${p.lng}`
      : `https://map.kakao.com/link/search/${encodeURIComponent(p.address)}`;

// ---------------------------------------------------------------------
// 예시(더미) 데이터 — Supabase 설정 전 화면 확인용 (실제 장소가 아님)
// 모양은 api/place.js 가 DB에서 돌려주는 값과 같습니다.
// ---------------------------------------------------------------------
const raw = [
  // [분류, 이름, 시·도, 위도, 경도, 태그, 후기 수, 별점 합계, 찜]
  ['cafe', '[예시] 북악 라이더스 카페', '서울', 37.5935, 126.9805, ['bike_parking', 'helmet_storage', 'rider_meet'], 12, 56, 31],
  ['repair', '[예시] 성수 모터 정비', '서울', 37.5446, 127.0557, ['import_repair', 'tire', 'bike_parking'], 8, 38, 14],
  ['parking', '[예시] 강남역 공영주차장 이륜차 구역', '서울', 37.4979, 127.0276, ['covered_parking', 'free_parking'], 5, 19, 9],
  ['gear', '[예시] 라이더 기어 스토어', '서울', 37.5612, 126.9248, ['bike_parking', 'rider_discount'], 3, 14, 6],
  ['food', '[예시] 남한산성 라이더 국밥', '경기', 37.4786, 127.1825, ['bike_parking', 'rider_meet'], 15, 66, 22],
  ['cafe', '[예시] 양평 강변 라이딩 카페', '경기', 37.4912, 127.4875, ['bike_parking', 'rider_meet', 'rider_discount'], 21, 97, 40],
  ['repair', '[예시] 수원 공식 서비스센터', '경기', 37.2636, 127.0286, ['official_service', 'import_repair'], 6, 27, 8],
  ['wash', '[예시] 일산 바이크 셀프세차', '경기', 37.6584, 126.7700, ['bike_wash', 'free_parking'], 4, 17, 5],
  ['stay', '[예시] 강릉 바다 라이더 펜션', '강원', 37.7519, 128.8761, ['bike_parking', 'covered_parking', 'bike_wash'], 9, 42, 18],
  ['school', '[예시] 영암 서킷 라이딩 스쿨', '전남', 34.7333, 126.4170, ['bike_parking'], 7, 33, 11],
];

export const dummyPlaces = raw.map(([category, name, region, lat, lng, tags, reviewCount, ratingSum, likes], i) => ({
  id: raw.length - i,
  category,
  name,
  address: `${region} 예시구 예시로 1 (예시 주소)`,
  region,
  lat,
  lng,
  phone: '',
  hours: '[예시] 매일 10:00 – 20:00',
  description: '[예시 본문] 장소 소개가 들어갈 자리입니다.',
  tags,
  imageUrls: [],
  kakaoPlaceId: null,
  isPublished: true,
  reviewCount,
  ratingSum,
  likes,
  createdAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
}));
