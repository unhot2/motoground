import { useEffect, useId, useRef } from 'react';
import Icon from './Icon.jsx';

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)';

// 공통 모달: 열리면 닫기 버튼에 포커스, 배경 스크롤 막기, Esc 로 닫기, 탭 키가 모달 안에서만 돌게
// 내용(children)은 열릴 때마다 새로 만들어져서 입력값이 초기화됩니다.
export default function Modal({ open, onClose, title, children, className = '', closeOnBackdrop = true }) {
  const titleId = useId();
  const boxRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const prevFocus = document.activeElement;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
      if (e.key === 'Tab' && boxRef.current) {
        const items = boxRef.current.querySelectorAll(FOCUSABLE);
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
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal" onMouseDown={(e) => closeOnBackdrop && e.target === e.currentTarget && onClose()}>
      <div className={`modal__box card ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={boxRef}>
        <div className="modal__head">
          <h2 id={titleId} className="modal__title">{title}</h2>
          <button type="button" className="icon-btn modal__close" aria-label="닫기" onClick={onClose} ref={closeRef}>
            <Icon name="close" size={18} strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
