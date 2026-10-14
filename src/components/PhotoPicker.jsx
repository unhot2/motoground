import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 20; // 원본 기준. 올릴 때 줄여서 저장

// 사진 고르기 (미리보기 · 삭제 · 끌어서 순서 바꾸기 · 대표 지정)
// images: [{ key, url, file? }] — file 이 있으면 아직 안 올린 새 사진
export default function PhotoPicker({ images, onChange, max, showMain = true, label = '사진' }) {
  const fileRef = useRef(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [error, setError] = useState('');

  // 화면을 떠날 때 미리보기 주소 정리
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.forEach((img) => img.file && URL.revokeObjectURL(img.url)), []);

  function add(fileList) {
    const files = Array.from(fileList ?? []);
    const notes = [];
    const ok = files.filter((f) => {
      if (!TYPES.includes(f.type)) return notes.push('JPG·PNG·WEBP 사진만 올릴 수 있어요.') && false;
      if (f.size > MAX_MB * 1024 * 1024) return notes.push(`${MAX_MB}MB 이하 사진만 올릴 수 있어요.`) && false;
      return true;
    });
    const room = max - images.length;
    if (ok.length > room) notes.push(`${label}은 최대 ${max}장까지 올릴 수 있어요.`);
    const added = ok.slice(0, Math.max(0, room)).map((file) => ({
      key: `${file.name}-${file.size}-${Math.random()}`,
      url: URL.createObjectURL(file),
      file,
    }));
    setError([...new Set(notes)].join(' '));
    if (added.length) onChange([...images, ...added]);
  }

  function remove(key) {
    const target = images.find((img) => img.key === key);
    if (target?.file) URL.revokeObjectURL(target.url);
    onChange(images.filter((img) => img.key !== key));
  }

  function move(from, to) {
    if (from === to || to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <>
      <ul className="write-photos">
        {images.map((img, i) => (
          <li
            key={img.key}
            className={`write-photo ${dragIndex === i ? 'is-dragging' : ''}`}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) move(dragIndex, i);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
          >
            <img src={img.url} alt={`${label} ${i + 1}`} />
            {showMain &&
              (i === 0 ? (
                <span className="write-photo__badge">대표</span>
              ) : (
                <button type="button" className="write-photo__main" onClick={() => move(i, 0)}>
                  대표로
                </button>
              ))}
            <button
              type="button"
              className="write-photo__del"
              aria-label={`${label} ${i + 1} 삭제`}
              onClick={() => remove(img.key)}
            >
              <Icon name="close" size={14} strokeWidth={2.4} />
            </button>
          </li>
        ))}
        {images.length < max && (
          <li>
            <button
              type="button"
              className="write-photo write-photo--add"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                add(e.dataTransfer.files);
              }}
            >
              <Icon name="plus" size={22} strokeWidth={2} />
              <span>{images.length} / {max}</span>
            </button>
          </li>
        )}
      </ul>
      {error && <p className="field__msg field__msg--error" role="alert">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept={TYPES.join(',')}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label={`${label} 선택`}
        onChange={(e) => {
          add(e.target.files);
          e.target.value = '';
        }}
      />
    </>
  );
}

// 새 사진만 올리고 기존 사진과 원래 순서대로 합친 주소 목록
export async function resolvePhotoUrls(images, upload) {
  const uploaded = await upload(images.filter((img) => img.file).map((img) => img.file));
  let i = 0;
  return { urls: images.map((img) => (img.file ? uploaded[i++] : img.url)), uploaded };
}

export const toPhotoItems = (urls = []) => urls.map((url) => ({ key: url, url, file: null }));
