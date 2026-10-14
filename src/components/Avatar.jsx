import Icon from './Icon.jsx';

// 프로필 사진 (없으면 헬멧 아이콘)
export default function Avatar({ src, size = 32, className = '' }) {
  return (
    <span className={`avatar ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      {src ? <img src={src} alt="" /> : <Icon name="helmet" size={Math.round(size / 2)} />}
    </span>
  );
}
