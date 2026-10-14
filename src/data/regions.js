// 활동 지역 시·도 목록. profiles.region 에는 '서울 강남구' 처럼 '시도 + 상세' 로 저장
export const sidoList = [
  '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
  '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
];

export function splitRegion(region) {
  const [first = '', ...rest] = (region ?? '').trim().split(/\s+/);
  return sidoList.includes(first) ? { sido: first, detail: rest.join(' ') } : { sido: '', detail: (region ?? '').trim() };
}

export const joinRegion = (sido, detail) => [sido, detail.trim()].filter(Boolean).join(' ');
