// 제조사 로고 (public/brands/*.svg)
// 출처: Simple Icons(CC0) — 혼다·야마하·KTM·두카티·BMW·스즈키
//       위키미디어 공용(퍼블릭 도메인) — 가와사키·트라이엄프·로얄엔필드·할리데이비슨
// 모양만 가져와 currentColor 로 칠해서 어두운 배경에서도 보이게 함
// wordmark: 로고 자체가 브랜드 이름(글자)이라 옆에 이름을 또 쓰지 않음
// height: 글자 굵기가 달라 로고마다 보기 좋은 높이(px)
const logos = {
  혼다: { file: 'honda', ratio: 1 },
  야마하: { file: 'yamaha', ratio: 1 },
  KTM: { file: 'ktm', ratio: 1 },
  두카티: { file: 'ducati', ratio: 1 },
  BMW: { file: 'bmw', ratio: 1 },
  스즈키: { file: 'suzuki', ratio: 1 },
  할리데이비슨: { file: 'harley', ratio: 348 / 282 },
  가와사키: { file: 'kawasaki', ratio: 168.332 / 30, wordmark: true, height: 13 },
  트라이엄프: { file: 'triumph', ratio: 500 / 137, wordmark: true, height: 20 },
  로얄엔필드: { file: 'royalenfield', ratio: 306.7 / 41.1, wordmark: true, height: 13 },
};

export const findBrandLogo = (brand) => logos[brand] ?? null;

export default function BrandLogo({ brand, className = '' }) {
  const logo = findBrandLogo(brand);
  if (!logo) return null;
  const height = logo.height ?? 18;
  const src = `url(/brands/${logo.file}.svg)`;
  return (
    <span
      className={`brand-logo ${className}`.trim()}
      style={{ width: Math.round(height * logo.ratio), height, WebkitMaskImage: src, maskImage: src }}
      aria-hidden="true"
    />
  );
}

// 로고 + 영문 이름 (로고가 글자 로고면 이름은 화면 낭독기용으로만)
export function BrandName({ brand, en }) {
  const wordmark = findBrandLogo(brand)?.wordmark;
  return (
    <>
      <BrandLogo brand={brand} />
      {wordmark ? <span className="sr-only">{en}</span> : en}
    </>
  );
}
