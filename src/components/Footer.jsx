import { footerColumns } from '../data/menu.js';

export default function Footer() {
  return (
    <>
      <div className="checker checker--band" aria-hidden="true" />
      <footer className="footer">
        <div className="container footer__inner">
          <div className="footer__grid">
            <div className="footer__brand">
              <span className="brand-word brand-word--lg">MOTOGROUND</span>
              <span className="muted-2">라이더를 위한 바이크 커뮤니티</span>
            </div>

            {footerColumns.map((col) => (
              <div key={col.title} className="footer__col">
                <span className="footer__heading">{col.title}</span>
                {col.links.map((l) => (
                  <a key={l} href="#">{l}</a>
                ))}
              </div>
            ))}

            <div className="footer__col">
              <span className="footer__heading">고객센터</span>
              <span>운영시간 [운영시간]</span>
              <span>
                대표번호 <strong className="text-gold">[대표번호]</strong>
              </span>
            </div>
          </div>

          <div className="footer__legal">
            <span>[회사명] · 대표 [대표자명] · 사업자등록번호 [번호] · 주소 [주소]</span>
            <span>Copyright © Motoground. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
