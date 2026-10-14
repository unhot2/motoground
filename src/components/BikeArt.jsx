// 장르별 바이크 실루엣 (2D 라인 그림, currentColor 사용)
// 모델 전용 일러스트(image)가 있으면 그걸 쓰고, 없으면 장르마다 같은 그림을 씁니다.
const wheels = (r = 13, back = 24, front = 96, y = 52) => (
  <>
    <circle cx={back} cy={y} r={r} />
    <circle cx={back} cy={y} r={3} />
    <circle cx={front} cy={y} r={r} />
    <circle cx={front} cy={y} r={3} />
  </>
);

const art = {
  // 네이키드: 드러난 엔진, 높은 핸들, 둥근 헤드라이트
  naked: (
    <>
      {wheels()}
      <path d="M24 52l14-20h12M38 32l8-8h22l10 8M50 44h20l8-12M70 44l-6-12M78 32l6 4 12 16" />
      <path d="M46 24c2-6 18-6 22 0" />
      <path d="M82 30l4-12h8M88 18l4-2" />
      <circle cx="90" cy="26" r="3" />
      <path d="M30 24h14" />
    </>
  ),
  // 레플리카: 풀 카울, 낮은 자세, 높은 시트 뒤
  replica: (
    <>
      {wheels()}
      <path d="M24 52l10-14 6-10h10l8-6h18l14 10 10 20" />
      <path d="M40 28l-12-6h-6M58 22l6-6 10 2" />
      <path d="M44 40c8 6 30 6 42-2" />
      <path d="M84 24l10-8 6 2" />
    </>
  ),
  // 투어러: 큰 윈드스크린, 사이드 케이스
  tourer: (
    <>
      {wheels(12)}
      <path d="M24 52l12-18h14l6-8h20l12 8 8 18" />
      <path d="M80 26l6-16 6-2" />
      <path d="M50 26l-4-6h-12l-6 6" />
      <rect x="14" y="30" width="20" height="14" rx="4" />
      <path d="M52 40h28" />
    </>
  ),
  // 어드벤처: 긴 서스펜션, 부리 모양 펜더, 높은 스크린
  adventure: (
    <>
      {wheels(14, 22, 98, 50)}
      <path d="M22 50l14-22h14l6-6h18l10 6 10 14 4 8" />
      <path d="M84 22l4-14 6 0" />
      <path d="M88 32l10 4" />
      <path d="M50 22l-6-8h-10" />
      <path d="M46 38h30" />
    </>
  ),
  // 크루저: 낮고 긴 차체, 뒤로 누운 포크, 앞으로 뻗은 발판
  cruiser: (
    <>
      {wheels(13, 22, 100, 52)}
      <path d="M22 52l8-14h18l8-6h20l12 6 12 20" />
      <path d="M88 38l-2-20 8-4" />
      <path d="M36 32c4-6 14-6 18 0" />
      <path d="M48 46h22M70 46l6 6" />
      <path d="M30 32l-6-6" />
    </>
  ),
  // 스쿠터: 작은 바퀴, 발판, 앞 실드
  scooter: (
    <>
      {wheels(10, 26, 94, 54)}
      <path d="M26 54h18l6-12h22c10 0 16 4 18 12" />
      <path d="M84 44l-6-26h8" />
      <path d="M50 42l-6-12H28c-4 0-6 4-4 8l4 6" />
      <path d="M52 30h20" />
    </>
  ),
  // 클래식: 둥근 탱크, 평평한 시트, 둥근 헤드라이트
  classic: (
    <>
      {wheels()}
      <path d="M24 52l12-18h50l10 18" />
      <path d="M44 34c0-10 22-10 24 0" />
      <path d="M28 34h16" />
      <path d="M84 34l4-14h6M90 20l4-2" />
      <circle cx="92" cy="28" r="4" />
      <path d="M50 44h22" />
    </>
  ),
  // 오프로드: 높은 펜더, 가는 차체, 큰 바퀴
  offroad: (
    <>
      {wheels(14, 22, 98, 50)}
      <path d="M22 50l12-22h8l10-8h16l8 6 10 16 12 8" />
      <path d="M76 26l10-12 10 4" />
      <path d="M30 26l-8-4" />
      <path d="M48 36h24" />
    </>
  ),
};
art.etc = art.naked;

export default function BikeArt({ genre, image, width = 120, className }) {
  if (image) {
    return (
      <img
        className={`bike-art-img ${className ?? ''}`.trim()}
        src={image}
        width={width}
        height={Math.round((width * 70) / 120)}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <svg
      className={className}
      width={width}
      height={Math.round((width * 70) / 120)}
      viewBox="0 0 120 70"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {art[genre] ?? art.naked}
    </svg>
  );
}
