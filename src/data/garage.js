// 내 차고 기준 데이터 + 소모품 교체 시기 계산

export const genres = [
  { key: 'naked', label: '네이키드' },
  { key: 'replica', label: '레플리카' },
  { key: 'tourer', label: '투어러' },
  { key: 'adventure', label: '어드벤처' },
  { key: 'cruiser', label: '크루저' },
  { key: 'scooter', label: '스쿠터' },
  { key: 'classic', label: '클래식' },
  { key: 'offroad', label: '오프로드' },
  { key: 'etc', label: '기타' },
];
export const genreLabel = (key) => genres.find((g) => g.key === key)?.label ?? '';

// 비용 분류
export const categories = [
  { key: 'maintenance', label: '정비', color: 'var(--gold)' },
  { key: 'fuel', label: '주유', color: '#8fa7c9' },
  { key: 'insurance', label: '보험', color: '#c98f8f' },
  { key: 'gear', label: '용품', color: '#9fbf7a' },
  { key: 'etc', label: '기타', color: '#8f8676' },
];
export const categoryLabel = (key) => categories.find((c) => c.key === key)?.label ?? '기타';

// 소모품 기본 교체 주기 (일반적인 값, 바이크마다 바꿀 수 있음)
export const defaultItems = [
  { key: 'engine_oil', label: '엔진오일', km: 3000, months: 6 },
  { key: 'oil_filter', label: '오일필터', km: 6000, months: 12 },
  { key: 'chain_lube', label: '체인 청소·윤활', km: 500, months: null },
  { key: 'chain_kit', label: '체인·스프라켓', km: 20000, months: null },
  { key: 'front_tire', label: '앞타이어', km: 15000, months: 48 },
  { key: 'rear_tire', label: '뒷타이어', km: 12000, months: 48 },
  { key: 'brake_pad', label: '브레이크 패드', km: 15000, months: null },
  { key: 'brake_fluid', label: '브레이크액', km: null, months: 24 },
  { key: 'coolant', label: '냉각수', km: null, months: 24 },
  { key: 'spark_plug', label: '점화플러그', km: 12000, months: null },
  { key: 'air_filter', label: '에어필터', km: 12000, months: 24 },
  { key: 'battery', label: '배터리', km: null, months: 36 },
];
export const itemLabel = (key) => defaultItems.find((i) => i.key === key)?.label ?? key;

// 기본값 + 내가 바꾼 주기 → 실제로 쓰는 주기 (둘 다 비우면 추적 안 함)
export function resolveIntervals(custom = []) {
  return defaultItems.map((item) => {
    const mine = custom.find((c) => c.item_key === item.key);
    return mine ? { ...item, km: mine.interval_km, months: mine.interval_months, custom: true } : { ...item, custom: false };
  });
}

const monthsBetween = (from, to) =>
  (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + (to.getDate() - from.getDate()) / 30;

// 소모품 하나의 상태
//   level: 'bad' 교체 필요 / 'soon' 곧 교체(80% 이상) / 'ok' 정상 / 'none' 기록 없음
export function itemStatus(item, logs, currentKm, today = new Date()) {
  const last = logs
    .filter((l) => l.category === 'maintenance' && l.items.includes(item.key))
    .sort((a, b) => b.performedOn.localeCompare(a.performedOn) || (b.odometerKm ?? 0) - (a.odometerKm ?? 0))[0];
  if (!last) return { ...item, level: 'none', ratio: 0, text: '교체 기록이 없어요' };

  const ratios = [];
  const parts = [];
  if (item.km && last.odometerKm != null) {
    const used = Math.max(0, currentKm - last.odometerKm);
    ratios.push(used / item.km);
    const left = item.km - used;
    parts.push(left >= 0 ? `${left.toLocaleString('ko-KR')}km 남음` : `${(-left).toLocaleString('ko-KR')}km 지남`);
  }
  if (item.months) {
    const passed = monthsBetween(new Date(last.performedOn), today);
    ratios.push(passed / item.months);
    const left = Math.round(item.months - passed);
    parts.push(left >= 0 ? `${left}개월 남음` : `${-left}개월 지남`);
  }
  if (!ratios.length) return { ...item, level: 'none', ratio: 0, last, text: '마지막 교체 주행거리를 적어주세요' };

  const ratio = Math.max(...ratios);
  const level = ratio >= 1 ? 'bad' : ratio >= 0.8 ? 'soon' : 'ok';
  const cycle = [item.km && `${item.km.toLocaleString('ko-KR')}km`, item.months && `${item.months}개월`].filter(Boolean).join(' / ');
  return { ...item, level, ratio, last, text: `${cycle} 주기 · ${parts.join(' · ')}` };
}

const levelOrder = { bad: 0, soon: 1, ok: 2, none: 3 };

// 추적하는 소모품 전체 상태 (급한 순)
export function bikeStatus(intervals, logs, currentKm) {
  return intervals
    .filter((item) => item.km || item.months)
    .map((item) => itemStatus(item, logs, currentKm))
    .sort((a, b) => levelOrder[a.level] - levelOrder[b.level] || b.ratio - a.ratio);
}

export const levelText = { bad: '교체 필요', soon: '곧 교체', ok: '정상', none: '기록 없음' };

export const bikeTitle = (bike) => bike.nickname || `${bike.brand} ${bike.model}`;
