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
