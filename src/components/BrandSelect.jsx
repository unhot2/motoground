import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';

// 제조사 선택 상자 (홈페이지 톤의 검정·금색 드롭다운)
// options: [{ value, label, sub, meta }]
// 키보드: ↑↓←→ 이동, Enter·Space 선택, Esc 닫기, Home·End 처음·끝
export default function BrandSelect({ id, options, value, onChange, placeholder = '제조사를 골라주세요', invalid = false }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const buttonRef = useRef(null);
  const selected = options.find((o) => o.value === value) ?? null;

  // 열릴 때 선택된 항목에서 시작
  useEffect(() => {
    if (!open) return undefined;
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    listRef.current?.focus();
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 키보드로 움직인 항목이 보이게
  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function choose(option) {
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  // 목록은 2열 격자라서 ←→ 는 한 칸, ↑↓ 는 한 줄(2칸)씩
  const cols = () => (listRef.current && getComputedStyle(listRef.current).gridTemplateColumns.split(' ').length) || 1;

  function onListKey(e) {
    const last = options.length - 1;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols(), ArrowUp: -cols() }[e.key];
    if (step) {
      e.preventDefault();
      setActive((i) => Math.min(last, Math.max(0, i + step)));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : last);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  }

  return (
    <div className={`brand-select ${open ? 'is-open' : ''} ${invalid ? 'is-invalid' : ''}`} ref={rootRef}>
      <button
        id={id}
        ref={buttonRef}
        type="button"
        className="brand-select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {selected ? (
          <span className="brand-select__value">
            <span className="brand-select__en">{selected.sub}</span>
            <span className="brand-select__name">{selected.label}</span>
          </span>
        ) : (
          <span className="brand-select__placeholder">{placeholder}</span>
        )}
        {selected?.meta && <span className="brand-select__meta">{selected.meta}</span>}
        <Icon name="chevron" size={20} strokeWidth={2} className="brand-select__chev" />
      </button>

      {open && (
        <ul
          id={listId}
          ref={listRef}
          className="brand-select__list"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={id}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={o.value === value}
              className={`brand-select__option ${i === active ? 'is-active' : ''} ${o.value === value ? 'is-selected' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o)}
            >
              <span className="brand-select__en">{o.sub}</span>
              <span className="brand-select__name">{o.label}</span>
              {o.meta && <span className="brand-select__count">{o.meta}</span>}
              {o.value === value && <Icon name="check" size={16} strokeWidth={2.4} className="brand-select__check" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
