// 용품(바이크 용품 거래) 분류 · 상태 기준 + 예시(더미) 매물
import { sidoList } from './regions.js';

// 가격 포맷은 중고매물과 같은 로직을 그대로 씁니다.
export { formatPrice } from './market.js';

export const goodsCategories = [
  { key: 'helmet', label: '헬멧' },
  { key: 'jacket', label: '재킷 · 수트' },
  { key: 'glove', label: '글러브' },
  { key: 'boots', label: '부츠' },
  { key: 'protector', label: '보호장비' },
  { key: 'comm', label: '통신기기 · 블랙박스' },
  { key: 'mount', label: '거치대 · 캐리어' },
  { key: 'tool', label: '공구 · 정비용품' },
  { key: 'parts', label: '튜닝 · 교체파츠' },
  { key: 'etc', label: '기타' },
];
export const categoryLabel = (key) => goodsCategories.find((c) => c.key === key)?.label ?? '';

export const goodsConditions = [
  { key: 'new_sealed', label: '미개봉' },
  { key: 'new', label: '새것(미착용)' },
  { key: 'used_high', label: '중고-상' },
  { key: 'used_mid', label: '중고-중' },
  { key: 'used_low', label: '중고-하' },
];
export const conditionLabel = (key) => goodsConditions.find((c) => c.key === key)?.label ?? '';

export const goodsStatuses = [
  { key: 'selling', label: '판매중' },
  { key: 'reserved', label: '예약중' },
  { key: 'sold', label: '판매완료' },
];
export const goodsStatusLabel = (key) => goodsStatuses.find((s) => s.key === key)?.label ?? '';

export const goodsSorts = [
  { key: 'latest', label: '최신순' },
  { key: 'price', label: '낮은 가격순' },
  { key: 'likes', label: '찜 많은순' },
];

// ---------------------------------------------------------------------
// 예시(더미) 데이터 — Supabase 설정 전 화면 확인용
// 모양은 api/goods.js 가 DB에서 돌려주는 값과 같습니다.
// ---------------------------------------------------------------------
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();
const sido = (i) => sidoList[i % sidoList.length];

const raw = [
  // [분류, 브랜드, 상품명, 사이즈, 상태, 가격, 지역(시·도), 거래상태, 몇 시간 전, 조회, 찜]
  ['helmet', '샤크', 'Spartan GT', 'L', 'used_high', 180_000, 0, 'selling', 3, 210, 14],
  ['jacket', '알파인스타', 'GP Plus 가죽 재킷', 'L', 'used_mid', 250_000, 1, 'selling', 8, 184, 9],
  ['glove', '레버', 'GP Pro 글러브', 'M', 'new', 60_000, 2, 'reserved', 12, 97, 5],
  ['boots', 'TCX', 'RT-Race 부츠', '270mm', 'used_high', 150_000, 3, 'selling', 20, 133, 7],
  ['protector', '코미네', '니·시미즈 프로텍터 세트', 'FREE', 'new_sealed', 80_000, 4, 'selling', 28, 88, 4],
  ['comm', '세나', '50S 블루투스 헤드셋', 'FREE', 'used_mid', 130_000, 5, 'sold', 40, 256, 19],
  ['mount', '탑마스터', '탑케이스 거치대', 'FREE', 'used_low', 40_000, 6, 'selling', 52, 61, 2],
  ['tool', '모토', '체인 정비 공구세트', 'FREE', 'used_mid', 35_000, 7, 'selling', 64, 74, 3],
  ['parts', '아크라포빅', '슬립온 머플러 (MT-07용)', 'FREE', 'used_high', 450_000, 8, 'selling', 76, 302, 24],
  ['etc', '모토핏', '바이크 커버', 'L', 'new', 25_000, 9, 'selling', 90, 45, 1],
  ['jacket', '레브잇', '메쉬 라이딩 재킷', 'XL', 'used_mid', 120_000, 10, 'selling', 104, 118, 6],
  ['helmet', '아라이', 'RX-7X 풀페이스', 'M', 'used_high', 420_000, 11, 'selling', 118, 221, 15],
];

export const dummyGoods = raw.map(
  ([category, brand, product, size, condition, price, regionIdx, status, h, views, likes], i) => ({
    id: raw.length - i,
    sellerId: null,
    seller: '[닉네임]',
    sellerAvatar: null,
    category,
    title: `[예시] ${brand} ${product} 판매합니다`,
    brand,
    size,
    condition,
    price,
    region: `${sido(regionIdx)} 예시구`,
    description: '[예시 본문] 판매자가 적은 설명이 들어갈 자리입니다.',
    status,
    views,
    likes,
    imageUrls: [],
    createdAt: hoursAgo(h),
  })
);
