// 현재 페이지 주변 최대 5개 번호
function pageNumbers(page, total) {
  const start = Math.max(1, Math.min(page - 2, total - 4));
  const end = Math.min(total, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="페이지">
      <button
        type="button"
        className="page-btn"
        aria-label="이전 페이지"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        ‹
      </button>
      {pageNumbers(page, totalPages).map((n) => (
        <button
          key={n}
          type="button"
          className={`page-btn ${page === n ? 'is-active' : ''}`}
          aria-current={page === n ? 'page' : undefined}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className="page-btn"
        aria-label="다음 페이지"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
      >
        ›
      </button>
    </nav>
  );
}
