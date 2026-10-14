import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { features } from '../data/menu.js';

export default function Features() {
  return (
    <section id="features" className="container section section--last">
      <div className="section__head section__head--stack">
        <span className="label-en">HOW TO USE</span>
        <h2 className="section__title">모토그라운드 숨은 꿀기능</h2>
      </div>

      <div className="features">
        {features.map((f) => {
          const inner = (
            <>
              <span className="feature__icon"><Icon name={f.icon} size={26} /></span>
              <span className="feature__title">{f.title}</span>
              <span className="muted feature__desc">{f.desc}</span>
            </>
          );
          return f.to ? (
            <Link key={f.title} to={f.to} className="card feature">{inner}</Link>
          ) : (
            <a key={f.title} href="#feature" className="card feature">{inner}</a>
          );
        })}
      </div>
    </section>
  );
}
