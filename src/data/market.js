// 중고매물 필터 · 표시 기준 + 예시(더미) 매물
import { formatCount } from '../lib/format.js';

export const statuses = [
  { key: 'selling', label: '판매중' },
  { key: 'reserved', label: '예약중' },
  { key: 'sold', label: '판매완료' },
];
export const statusLabel = (key) => statuses.find((s) => s.key === key)?.label ?? '';

export const accidents = [
  { key: 'none', label: '무사고' },
  { key: 'minor', label: '경미한 사고' },
  { key: 'major', label: '사고 있음' },
];
export const accidentLabel = (key) => accidents.find((a) => a.key === key)?.label ?? '';

export const sorts = [
  { key: 'latest', label: '최신순' },
  { key: 'price', label: '낮은 가격순' },
  { key: 'mileage', label: '짧은 주행거리순' },
  { key: 'year', label: '최근 연식순' },
  { key: 'likes', label: '찜 많은순' },
];

// 가격 (원)
export const priceRanges = [
  { key: 'u300', label: '300만원 이하', max: 3_000_000 },
  { key: 'u500', label: '500만원 이하', max: 5_000_000 },
  { key: 'u1000', label: '1,000만원 이하', max: 10_000_000 },
  { key: 'u2000', label: '2,000만원 이하', max: 20_000_000 },
  { key: 'o2000', label: '2,000만원 초과', min: 20_000_001 },
];

// 배기량 — 125cc 이하는 원동기 면허, 초과는 2종 소형 면허
export const ccRanges = [
  { key: 'u125', label: '125cc 이하 (원동기)', max: 125 },
  { key: 'u500', label: '126~500cc', min: 126, max: 500 },
  { key: 'u1000', label: '501~1,000cc', min: 501, max: 1000 },
  { key: 'o1000', label: '1,000cc 초과', min: 1001 },
];

export const kmRanges = [
  { key: 'u5k', label: '5천km 이하', max: 5000 },
  { key: 'u10k', label: '1만km 이하', max: 10000 },
  { key: 'u30k', label: '3만km 이하', max: 30000 },
  { key: 'u50k', label: '5만km 이하', max: 50000 },
];

const thisYear = new Date().getFullYear();
export const yearOptions = [1, 3, 5, 10].map((n) => ({ key: String(thisYear - n), label: `${thisYear - n}년식 이후` }));

export const licenseOf = (cc) => (cc ? (cc <= 125 ? '원동기' : '2종 소형') : '');

// 7,200,000 → '720만원', 7,250,000 → '725만원', 15,000 → '1.5만원'
export function formatPrice(won) {
  if (won == null) return '';
  if (won === 0) return '무료 나눔';
  if (won < 10000) return `${formatCount(won)}원`;
  const man = won / 10000;
  return `${formatCount(Number.isInteger(man) ? man : Math.round(man * 10) / 10)}만원`;
}

// 12,400 → '1.2만km', 8,400 → '8,400km'
export function formatKm(km, { short = true } = {}) {
  if (km == null) return '';
  if (!short || km < 10000) return `${formatCount(km)}km`;
  return `${Math.round(km / 1000) / 10}만km`;
}

// ---------------------------------------------------------------------
// 예시(더미) 데이터 — Supabase 설정 전 화면 확인용
// 모양은 api/market.js 가 DB에서 돌려주는 값과 같습니다.
// ---------------------------------------------------------------------
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

const raw = [
  // [브랜드, 모델, 장르, 연식, 주행km, cc, 가격, 지역, 상태, 몇 시간 전, 조회, 찜, 사고]
  ['야마하', 'MT-07', 'naked', 2021, 12400, 689, 7_200_000, '서울 마포구', 'selling', 2, 412, 18, 'none'],
  ['혼다', 'CBR650R', 'replica', 2022, 8100, 649, 8_900_000, '경기 성남시', 'reserved', 5, 388, 22, 'none'],
  ['혼다', 'PCX125', 'scooter', 2023, 4300, 125, 3_100_000, '부산 해운대구', 'selling', 9, 205, 7, 'none'],
  ['BMW', 'R nineT', 'classic', 2019, 24000, 1170, 16_500_000, '부산 수영구', 'sold', 30, 920, 41, 'minor'],
  ['가와사키', '닌자 400', 'replica', 2020, 15800, 399, 5_300_000, '인천 연수구', 'selling', 26, 301, 12, 'none'],
  ['야마하', 'YZF-R3', 'replica', 2022, 6900, 321, 5_800_000, '대전 유성구', 'selling', 48, 266, 9, 'none'],
  ['혼다', 'CB500X', 'adventure', 2021, 21000, 471, 6_400_000, '경기 수원시', 'selling', 54, 190, 5, 'minor'],
  ['할리데이비슨', '아이언 883', 'cruiser', 2018, 18500, 883, 9_800_000, '대구 수성구', 'selling', 70, 344, 16, 'none'],
  ['스즈키', 'GSX-8S', 'naked', 2024, 2100, 776, 11_200_000, '서울 송파구', 'selling', 80, 158, 6, 'none'],
  ['혼다', 'CRF300L', 'offroad', 2022, 9800, 286, 5_900_000, '강원 춘천시', 'selling', 96, 122, 3, 'none'],
  ['BMW', 'R 1250 RT', 'tourer', 2020, 33000, 1254, 19_800_000, '경기 고양시', 'selling', 120, 410, 20, 'none'],
  ['야마하', 'NMAX 125', 'scooter', 2021, 17000, 125, 2_300_000, '광주 서구', 'selling', 150, 98, 2, 'minor'],
];

export const dummyListings = raw.map(([brand, model, genre, year, km, cc, price, region, status, h, views, likes, accident], i) => ({
  id: raw.length - i,
  sellerId: null,
  seller: '[닉네임]',
  sellerAvatar: null,
  title: `[예시] ${brand} ${model} 판매합니다`,
  brand,
  model,
  genre,
  modelYear: year,
  mileageKm: km,
  cc,
  price,
  region,
  description: '[예시 본문] 판매자가 적은 설명이 들어갈 자리입니다.',
  accident,
  tuning: '',
  status,
  views,
  likes,
  imageUrls: [],
  createdAt: hoursAgo(h),
}));
