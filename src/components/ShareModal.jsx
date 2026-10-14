import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { isKakaoConfigured, shareToKakao } from '../lib/kakao.js';

// 클립보드 복사 (구형 브라우저·http 환경은 textarea 방식으로)
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

// 공유 모달: URL 복사 + 카카오톡 공유
export default function ShareModal({ open, onClose, url, title, description, imageUrl }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  // 열릴 때: 닫기 버튼에 포커스, 배경 스크롤 막기, Esc 로 닫기
  useEffect(() => {
    if (!open) return undefined;
    setCopied(false);
    setError('');
    const prevFocus = document.activeElement;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      // 탭 키가 모달 밖으로 나가지 않게
      if (e.key === 'Tab' && dialogRef.current) {
        const items = dialogRef.current.querySelectorAll('button:not(:disabled), input');
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  async function onCopy() {
    setError('');
    if (await copyText(url)) setCopied(true);
    else setError('복사하지 못했어요. 주소를 길게 눌러 직접 복사해 주세요.');
  }

  async function onKakao() {
    setError('');
    try {
      await shareToKakao({ title, description, url, imageUrl });
    } catch (err) {
      console.error(err);
      setError('카카오톡 공유를 열지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  }

  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__box card" role="dialog" aria-modal="true" aria-labelledby="share-title" ref={dialogRef}>
        <div className="modal__head">
          <h2 id="share-title" className="modal__title">공유하기</h2>
          <button type="button" className="icon-btn modal__close" aria-label="닫기" onClick={onClose} ref={closeRef}>
            <Icon name="close" size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="share-targets">
          <button
            type="button"
            className="share-target"
            onClick={onKakao}
            disabled={!isKakaoConfigured}
            title={isKakaoConfigured ? undefined : '카카오 JavaScript 키를 설정하면 쓸 수 있어요'}
          >
            <span className="share-target__icon share-target__icon--kakao" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3.5c-5.25 0-9.5 3.33-9.5 7.45 0 2.66 1.77 5 4.45 6.32l-.9 3.33c-.08.3.26.54.52.37l3.95-2.6c.48.05.97.08 1.48.08 5.25 0 9.5-3.34 9.5-7.5S17.25 3.5 12 3.5z" />
              </svg>
            </span>
            <span>카카오톡</span>
          </button>
          <button type="button" className="share-target" onClick={onCopy}>
            <span className="share-target__icon" aria-hidden="true">
              <Icon name="link" size={22} strokeWidth={1.8} />
            </span>
            <span>URL 복사</span>
          </button>
        </div>

        <div className="share-url">
          <label htmlFor="share-url" className="sr-only">공유 주소</label>
          <input id="share-url" type="text" value={url} readOnly onFocus={(e) => e.target.select()} />
          <button type="button" className={`btn ${copied ? 'btn--outline' : 'btn--gold'}`} onClick={onCopy}>
            {copied ? '복사됨' : '복사'}
          </button>
        </div>

        <p className={`share-msg ${error ? 'share-msg--error' : ''}`} role="status" aria-live="polite">
          {error || (copied ? '주소를 복사했어요. 원하는 곳에 붙여넣으세요.' : '')}
        </p>
      </div>
    </div>
  );
}
