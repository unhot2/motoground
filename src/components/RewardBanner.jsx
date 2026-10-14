export default function RewardBanner() {
  return (
    <section className="container section--tight" aria-label="라이딩 리워드">
      <div className="reward">
        <div className="reward__text">
          <span className="reward__kicker">달릴수록 쌓이는 라이딩 리워드</span>
          <strong className="reward__title">주행기록 관리하고 [리워드 혜택] 받아가세요</strong>
        </div>
        <a href="#reward" className="btn btn--dark btn--pill">기록 시작하기</a>
      </div>
    </section>
  );
}
