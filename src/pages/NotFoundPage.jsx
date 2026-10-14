import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="container notfound">
      <span className="label-en">404</span>
      <h1 className="section__title">페이지를 찾을 수 없어요</h1>
      <p className="muted">주소가 바뀌었거나 삭제된 페이지입니다.</p>
      <Link to="/" className="btn btn--gold btn--pill">홈으로 가기</Link>
    </section>
  );
}
