const pad = (n) => String(n).padStart(2, '0');

// 목록용: 오늘 쓴 글은 '14:20', 그 외는 '10.12'
export function formatListDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.getFullYear() !== now.getFullYear()) {
    return `${String(d.getFullYear()).slice(2)}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  }
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

// 상세용: '2026.10.12 14:20'
export function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const formatCount = (n) => (n ?? 0).toLocaleString('ko-KR');

// 매물 등록 시각: '방금 전', '15분 전', '3시간 전', '2일 전', 일주일 넘으면 '10.12'
export function formatAgo(iso) {
  if (!iso) return '';
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  if (min < 60 * 24) return `${Math.floor(min / 60)}시간 전`;
  if (min < 60 * 24 * 7) return `${Math.floor(min / 60 / 24)}일 전`;
  return formatListDate(iso);
}

// 가입일 등 날짜만: '2026.10.12'
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
