import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useAsync from '../hooks/useAsync.js';
import { boards } from '../data/community.js';
import {
  CONTENT_MAX,
  IMAGE_MAX_COUNT,
  IMAGE_MAX_MB,
  TITLE_MAX,
  createPost,
  fetchPost,
  removePostImages,
  updatePost,
  uploadPostImages,
} from '../api/community.js';

const DRAFT_KEY = 'mg-write-draft';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// 게시판별 작성 팁 (오른쪽 안내 상자)
const boardTips = {
  notice: '공지는 상단 고정 여부를 꼭 확인해 주세요.',
  free: '바이크 이야기가 아니어도 괜찮아요. 서로 존중하는 말투면 충분해요.',
  tour: '코스, 소요 시간, 쉬어간 곳을 적으면 다른 라이더에게 큰 도움이 돼요.',
  qna: '차종·연식·주행거리와 증상이 생긴 상황을 적으면 답이 빨라요.',
  meetup: '날짜·시간·출발 장소·인원·페이스를 꼭 적어주세요.',
  gear: '제품명, 사용 기간, 장단점을 함께 적어주세요.',
};

const pad = (n) => String(n).padStart(2, '0');
const timeText = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

function readDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeDraft(draft) {
  try {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* 저장소를 못 쓰는 환경이면 임시저장 없이 동작 */
  }
}

// /community/write            새 글
// /community/write?board=tour 게시판 미리 선택
// /community/write?edit=12    12번 글 수정
export default function WritePage() {
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const { user, isAdmin } = useAuth();
  const original = useAsync(() => (editId ? fetchPost(editId) : Promise.resolve(null)), [editId]);

  if (!editId) return <WriteForm key="new" initialBoard={params.get('board')} />;

  if (original.loading) return <WriteShell title="글 수정"><div className="card write-card my-loading" aria-busy="true" /></WriteShell>;
  const post = original.data?.post;
  if (original.error || !post) {
    return (
      <WriteShell title="글 수정">
        <div className="card board-empty">글을 찾을 수 없어요. 삭제됐거나 주소가 잘못됐어요.</div>
      </WriteShell>
    );
  }
  if (post.authorId !== user.id && !isAdmin) {
    return (
      <WriteShell title="글 수정">
        <div className="card board-empty">내가 쓴 글만 수정할 수 있어요.</div>
      </WriteShell>
    );
  }
  return <WriteForm key={`edit-${post.id}`} post={post} />;
}

function WriteShell({ title, status, children }) {
  return (
    <>
      <section className="page-head">
        <div className="container page-head__inner write-head">
          <div>
            <span className="eyebrow">
              <span className="checker checker--short" aria-hidden="true" />
              <span>COMMUNITY</span>
            </span>
            <h1 className="page-head__title">{title}</h1>
          </div>
          {status}
        </div>
      </section>
      <div className="container write">{children}</div>
    </>
  );
}

function WriteForm({ post = null, initialBoard = null }) {
  const isEdit = Boolean(post);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const titleRef = useRef(null);

  const choosable = boards.filter((b) => b.slug !== 'all' && (b.slug !== 'notice' || isAdmin));
  const firstBoard = choosable.some((b) => b.slug === initialBoard) ? initialBoard : '';

  const [form, setForm] = useState(() => ({
    board: post?.board ?? firstBoard,
    title: post?.title ?? '',
    content: post?.content ?? '',
    pinned: post?.pinned ?? false,
  }));
  // 사진: 기존 사진은 { url }, 새로 고른 사진은 { url: 미리보기, file }
  const [images, setImages] = useState(() =>
    (post?.imageUrls ?? []).map((url) => ({ key: url, url, file: null }))
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [draft, setDraft] = useState(() => (isEdit ? null : readDraft()));
  const [dragIndex, setDragIndex] = useState(null);

  // ---- 임시저장 (새 글만, 사진 제외) ----
  useEffect(() => {
    // 이전 임시저장을 이어 쓸지 고르기 전에는 덮어쓰지 않음
    if (isEdit || !dirty || draft) return undefined;
    const timer = setTimeout(() => {
      const { board, title, content } = form;
      if (!title.trim() && !content.trim()) return;
      writeDraft({ board, title, content, savedAt: Date.now() });
      setSavedAt(new Date());
    }, 800);
    return () => clearTimeout(timer);
  }, [form, dirty, isEdit, draft]);

  function restoreDraft() {
    setForm((f) => ({
      ...f,
      board: choosable.some((b) => b.slug === draft.board) ? draft.board : f.board,
      title: draft.title ?? '',
      content: draft.content ?? '',
    }));
    setDraft(null);
    setDirty(true);
  }
  function discardDraft() {
    writeDraft(null);
    setDraft(null);
  }

  // ---- 나가기 전 확인 (새로고침·탭 닫기) ----
  useEffect(() => {
    if (!dirty || busy) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, busy]);

  // 미리보기 주소 정리
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(
    () => () => imagesRef.current.forEach((img) => img.file && URL.revokeObjectURL(img.url)),
    []
  );

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };
  const pickBoard = (slug) => {
    setForm((f) => ({ ...f, board: slug }));
    setDirty(true);
    if (errors.board) setErrors((er) => ({ ...er, board: undefined }));
  };

  // ---- 사진 ----
  function addFiles(fileList) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    const room = IMAGE_MAX_COUNT - images.length;
    const notes = [];
    const ok = files.filter((f) => {
      if (!IMAGE_TYPES.includes(f.type)) return notes.push(`${f.name}: JPG·PNG·WEBP·GIF 만 올릴 수 있어요.`) && false;
      // 정지 사진은 올릴 때 줄여서 저장하니 원본은 넉넉히 허용
      const limit = f.type === 'image/gif' ? IMAGE_MAX_MB : 20;
      if (f.size > limit * 1024 * 1024) return notes.push(`${f.name}: ${limit}MB 이하만 올릴 수 있어요.`) && false;
      return true;
    });
    if (ok.length > room) notes.push(`사진은 최대 ${IMAGE_MAX_COUNT}장까지 올릴 수 있어요.`);
    const added = ok.slice(0, Math.max(0, room)).map((file) => ({
      key: `${file.name}-${file.size}-${Math.random()}`,
      url: URL.createObjectURL(file),
      file,
    }));
    setImages((list) => [...list, ...added]);
    setErrors((er) => ({
      ...er,
      images: notes.join(' ') || undefined,
      content: added.length ? undefined : er.content,
    }));
    if (added.length) setDirty(true);
  }

  function removeImage(key) {
    setImages((list) => {
      const target = list.find((img) => img.key === key);
      if (target?.file) URL.revokeObjectURL(target.url);
      return list.filter((img) => img.key !== key);
    });
    setDirty(true);
  }

  function moveImage(from, to) {
    if (from === to || to < 0 || to >= images.length) return;
    setImages((list) => {
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setDirty(true);
  }

  // ---- 등록 ----
  function validate() {
    const found = {};
    if (!form.board) found.board = '게시판을 골라주세요.';
    if (!form.title.trim()) found.title = '제목을 입력해 주세요.';
    if (!form.content.trim() && images.length === 0) found.content = '본문을 입력하거나 사진을 올려주세요.';
    return found;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      if (found.title) titleRef.current?.focus();
      return;
    }

    setBusy(true);
    let uploaded = [];
    try {
      // 새 사진만 올리고, 기존 사진과 원래 순서대로 합침
      uploaded = await uploadPostImages(user.id, images.filter((img) => img.file).map((img) => img.file));
      let i = 0;
      const imageUrls = images.map((img) => (img.file ? uploaded[i++] : img.url));

      const payload = {
        board: form.board,
        title: form.title.trim(),
        content: form.content.trim(),
        imageUrls,
        pinned: isAdmin && form.board === 'notice' ? form.pinned : isEdit ? undefined : false,
      };

      let id = post?.id;
      if (isEdit) {
        await updatePost(post.id, payload);
        // 수정하면서 뺀 기존 사진은 저장소에서도 삭제
        await removePostImages(post.imageUrls.filter((url) => !imageUrls.includes(url)));
      } else {
        id = await createPost({ authorId: user.id, ...payload });
        writeDraft(null);
      }
      setDirty(false);
      navigate(`/community/post/${id}`, { replace: true });
    } catch (err) {
      console.error(err);
      await removePostImages(uploaded);
      setFormError(
        /payload too large|exceeded the maximum allowed size/i.test(err?.message ?? '')
          ? `사진 용량이 너무 커요. 장당 ${IMAGE_MAX_MB}MB 이하로 올려주세요.`
          : '글을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'
      );
      setBusy(false);
    }
  }

  function onCancel() {
    if (dirty && !window.confirm('작성 중인 내용이 사라져요. 나갈까요?')) return;
    if (isEdit) navigate(`/community/post/${post.id}`);
    else navigate(form.board && form.board !== 'notice' ? `/community/${form.board}` : '/community');
  }

  const tip = boardTips[form.board];

  return (
    <WriteShell
      title={isEdit ? '글 수정' : '글쓰기'}
      status={
        savedAt && (
          <span className="write-saved" role="status">
            <Icon name="check" size={16} strokeWidth={2} /> 임시저장됨 {timeText(savedAt)}
          </span>
        )
      }
    >
      <form className="write__main card write-card" onSubmit={onSubmit} noValidate>
        {draft && (
          <div className="write-draft" role="status">
            <span>작성 중이던 글이 있어요{draft.title ? ` · "${draft.title.slice(0, 20)}"` : ''}. 이어서 쓸까요?</span>
            <div className="write-draft__btns">
              <button type="button" className="my-link-btn" onClick={discardDraft}>삭제</button>
              <button type="button" className="btn btn--gold btn--pill my-btn-sm" onClick={restoreDraft}>이어 쓰기</button>
            </div>
          </div>
        )}

        {formError && <p className="form-alert" role="alert">{formError}</p>}

        {/* 게시판 */}
        <fieldset className="write-field">
          <legend className="write-label">
            게시판 <span className="write-label__sub">필수</span>
          </legend>
          <div className="write-boards" role="radiogroup" aria-label="게시판">
            {choosable.map((b) => (
              <button
                key={b.slug}
                type="button"
                role="radio"
                aria-checked={form.board === b.slug}
                className={`write-chip ${form.board === b.slug ? 'is-active' : ''}`}
                onClick={() => pickBoard(b.slug)}
              >
                {b.name}
              </button>
            ))}
          </div>
          {errors.board && <p className="field__msg field__msg--error" role="alert">{errors.board}</p>}
          {isAdmin && form.board === 'notice' && (
            <div className="check write-pin">
              <input id="w-pin" type="checkbox" checked={form.pinned} onChange={set('pinned')} />
              <label htmlFor="w-pin">목록 맨 위에 고정</label>
            </div>
          )}
        </fieldset>

        {/* 제목 */}
        <div className={`write-field ${errors.title ? 'field--error' : ''}`}>
          <div className="write-label">
            <label htmlFor="w-title">제목</label>
            <span className="write-label__sub">{form.title.length} / {TITLE_MAX}</span>
          </div>
          <input
            ref={titleRef}
            id="w-title"
            className="write-input"
            type="text"
            value={form.title}
            onChange={set('title')}
            maxLength={TITLE_MAX}
            placeholder="제목을 입력하세요"
            aria-invalid={Boolean(errors.title)}
          />
          {errors.title && <p className="field__msg field__msg--error" role="alert">{errors.title}</p>}
        </div>

        {/* 본문 */}
        <div className="write-field">
          <div className="write-label">
            <label htmlFor="w-content">본문</label>
            <span className="write-label__sub">{form.content.length.toLocaleString('ko-KR')} / {CONTENT_MAX.toLocaleString('ko-KR')}</span>
          </div>
          <div className={`write-editor ${errors.content ? 'is-error' : ''}`}>
            <div className="write-editor__bar">
              <button
                type="button"
                className="write-tool"
                onClick={() => fileRef.current?.click()}
                disabled={images.length >= IMAGE_MAX_COUNT}
              >
                <Icon name="image" size={18} strokeWidth={1.8} /> 사진
              </button>
            </div>
            <textarea
              id="w-content"
              value={form.content}
              onChange={set('content')}
              maxLength={CONTENT_MAX}
              rows={14}
              placeholder={'내용을 입력하세요.\n문단은 빈 줄로 나눠져요.'}
              aria-invalid={Boolean(errors.content)}
            />
          </div>
          {errors.content && <p className="field__msg field__msg--error" role="alert">{errors.content}</p>}
        </div>

        {/* 사진 */}
        <div className="write-field">
          <div className="write-label">
            <span>사진</span>
            <span className="write-label__sub">
              {images.length} / {IMAGE_MAX_COUNT}장 · 첫 번째 사진이 대표 사진이에요
            </span>
          </div>
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
                  if (dragIndex !== null) moveImage(dragIndex, i);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
              >
                <img src={img.url} alt={`첨부 사진 ${i + 1}`} />
                {i === 0 ? (
                  <span className="write-photo__badge">대표</span>
                ) : (
                  <button type="button" className="write-photo__main" onClick={() => moveImage(i, 0)}>
                    대표로
                  </button>
                )}
                <button
                  type="button"
                  className="write-photo__del"
                  aria-label={`사진 ${i + 1} 삭제`}
                  onClick={() => removeImage(img.key)}
                >
                  <Icon name="close" size={14} strokeWidth={2.4} />
                </button>
              </li>
            ))}
            {images.length < IMAGE_MAX_COUNT && (
              <li>
                <button
                  type="button"
                  className="write-photo write-photo--add"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    addFiles(e.dataTransfer.files);
                  }}
                >
                  <Icon name="plus" size={22} strokeWidth={2} />
                  <span>추가</span>
                </button>
              </li>
            )}
          </ul>
          <p className="field__msg">끌어서 순서를 바꿀 수 있어요. 큰 사진은 자동으로 줄여서 올려요.</p>
          {errors.images && <p className="field__msg field__msg--error" role="alert">{errors.images}</p>}
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_TYPES.join(',')}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-label="사진 선택"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        <div className="write-actions">
          <button type="button" className="btn btn--outline" onClick={onCancel} disabled={busy}>취소</button>
          <button type="submit" className="btn btn--gold" disabled={busy}>
            {busy ? (images.some((img) => img.file) ? '사진 올리는 중…' : '저장하는 중…') : isEdit ? '수정 완료' : '등록'}
          </button>
        </div>
      </form>

      <aside className="write__side">
        <div className="card side-box">
          <span className="side-box__title">작성 가이드</span>
          <ul className="write-guide">
            <li>욕설·비방·차별 표현은 삭제될 수 있어요.</li>
            <li>판매·구매 글은 중고매물에 올려주세요.</li>
            <li>사진 속 번호판과 얼굴은 가려주세요.</li>
          </ul>
        </div>
        {tip && (
          <div className="card side-box">
            <span className="side-box__title">{boards.find((b) => b.slug === form.board)?.name} 팁</span>
            <p className="write-tip">{tip}</p>
          </div>
        )}
        {!isEdit && (
          <p className="write-note">
            작성 중인 글은 이 브라우저에 자동으로 임시저장돼요. 사진은 저장되지 않아요.{' '}
            <Link to="/community">목록으로</Link>
          </p>
        )}
      </aside>
    </WriteShell>
  );
}
