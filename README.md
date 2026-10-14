# MOTOGROUND — 바이크 커뮤니티

React + Vite + Supabase로 만드는 모토그라운드입니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 이 열립니다.
Supabase 설정 전에는 예시(더미) 데이터로 화면이 표시됩니다.

## Supabase 연결하기

1. https://supabase.com 에 가입하고 **New project** 를 만듭니다. (Region: Northeast Asia (Seoul) 추천)
2. 왼쪽 메뉴 **SQL Editor** → `supabase/schema.sql` 내용을 전부 붙여넣고 **Run**
3. (선택) 화면 확인용 예시 글이 필요하면 `supabase/seed.sql` 도 같은 방법으로 Run
4. **Project Settings → API** (또는 상단 **Connect** 버튼)에서 Project URL 과 Publishable key(anon key)를 복사
5. 프로젝트 폴더의 `.env.example` 을 복사해 `.env.local` 로 이름을 바꾸고 값을 채웁니다
6. `npm run dev` 를 다시 실행하면 DB의 글이 표시됩니다

> `.env.local` 은 git 에 올라가지 않습니다. service_role(secret) 키는 절대 넣지 마세요.

### 회원가입·로그인 설정 (Authentication)

1. **Authentication → URL Configuration**
   - Site URL: `http://localhost:5173` (배포 후에는 실제 도메인으로 변경)
   - Redirect URLs 에 `http://localhost:5173/**` 추가
2. 가입 인증 메일은 기본으로 켜져 있습니다. Supabase 기본 메일은 시간당 발송 수가 적어서
   개발 중에는 **Authentication → Sign In / Providers → Email → Confirm email** 을 꺼두면 편합니다.
   (실제 오픈 전에는 다시 켜고, 자체 메일 서버(SMTP)를 연결하세요)

| 주소 | 화면 |
| --- | --- |
| `/signup` | 회원가입 (이메일, 닉네임, 비밀번호) |
| `/login` | 로그인 (`?next=/주소` 로 로그인 후 돌아갈 곳 지정) |
| `/forgot-password` | 비밀번호 재설정 메일 받기 |
| `/reset-password` | 메일 링크로 들어와 새 비밀번호 설정 |
| `/my` | 내 정보: 프로필 카드, 활동 요약, 작성글·댓글·추천한 글 (로그인 필요) |
| `/my/edit` | 프로필 수정 (사진, 닉네임, 내 바이크, 활동 지역) |
| `/my/account` | 비밀번호 변경, 로그아웃, 회원 탈퇴 |
| `/garage` | 내 차고: 내 바이크 목록과 소모품 상태 (로그인 필요) |
| `/garage/new`, `/garage/:id/edit` | 바이크 등록·수정 |
| `/garage/:id` | 바이크 상세: 소모품 상태, 정비 기록, 비용 |
| `/market` | 중고 매물 목록: 검색, 장르·제조사·지역·가격·배기량·연식·주행거리 필터, 정렬 |
| `/market/:id` | 매물 상세: 사진, 차량 정보, 판매자 연락처(로그인 필요), 찜, 공유, 비슷한 매물 |
| `/market/new`, `/market/:id/edit` | 매물 등록·수정 (로그인 필요) |

> 중고 매물의 사고 이력·튜닝 컬럼과 연락처 테이블(`listing_contacts`)도 `schema.sql` 에 추가됐습니다. 예전에 실행했다면 한 번 더 Run 해 주세요.
>
> 회원 탈퇴는 `schema.sql` 의 `delete_my_account` 함수를 씁니다. 예전에 schema.sql 을 실행했다면 한 번 더 Run 해 주세요 (다시 실행해도 안전합니다).

### 카카오톡 공유 설정 (선택)

게시글의 **공유** 버튼에서 카카오톡으로 보내려면 카카오 앱 키가 필요합니다. 키가 없으면 URL 복사만 됩니다.

1. https://developers.kakao.com → **내 애플리케이션** → 애플리케이션 추가
2. **앱 키**의 **JavaScript 키**를 복사해 `.env.local` 의 `VITE_KAKAO_JS_KEY=` 에 넣기
3. **플랫폼 → Web** 에 사이트 도메인 등록: `http://localhost:5173` (배포 후 실제 도메인도 추가)
4. `npm run dev` 다시 실행

> 카카오톡 미리보기 이미지는 인터넷에서 접근 가능한 주소여야 해서, localhost 에서는 이미지가 안 보일 수 있습니다.

### 관리자 지정 (공지 작성용)

회원가입 후 SQL Editor 에서 실행:

```sql
update public.profiles set role = 'admin' where nickname = '내닉네임';
```

## DB 구조 (supabase/schema.sql)

| 테이블 | 내용 |
| --- | --- |
| `profiles` | 회원 프로필 (닉네임, 내 바이크, 지역, 권한). 회원가입 시 자동 생성 |
| `boards` | 게시판 (공지사항, 자유게시판, 투어 후기, 정비 Q&A, 모임·번개, 용품 리뷰) |
| `posts` | 게시글. 조회수·댓글수·추천수는 자동 계산 |
| `comments` | 댓글 (parent_id 가 있으면 답글) |
| `post_likes` | 게시글 추천 (1인 1회) |
| `listings` | 중고 매물 (브랜드, 모델, 장르, 연식, 주행거리, 배기량, 가격, 지역, 판매상태) |
| `listing_images` | 매물 사진 (0번이 대표 사진) |
| `listing_likes` | 매물 찜 |
| `bikes` | 내 차고 바이크 (본인만 보기) |
| `bike_logs` | 정비·주유·보험·용품 비용 기록 |
| `bike_intervals` | 소모품 교체 주기 (사용자가 바꾼 값) |

사진 저장소(Storage): `listing-images`, `post-images`, `avatars`, `garage-images` — 누구나 보기, 로그인 회원은 자기 폴더(`{회원id}/파일명`)에만 업로드.

보안 정책(RLS): 읽기는 누구나, 쓰기·수정·삭제는 로그인한 본인만. 공지는 관리자만. 조회수 등 숫자는 회원이 직접 바꿀 수 없음.

## 폴더 구조

```
public/                 로고, 파비콘
supabase/schema.sql     DB 테이블·보안 정책·저장소
supabase/seed.sql       예시 게시글 (선택)
src/
  main.jsx              진입점 (BrowserRouter)
  App.jsx               라우트 정의
  lib/supabase.js       Supabase 연결 (.env.local 값 사용)
  lib/format.js         날짜·숫자 표시 형식
  api/community.js      게시글·댓글 불러오기 (DB 또는 예시 데이터)
  hooks/useAsync.js     비동기 데이터 로딩 훅
  components/           공통 화면 조각 (Layout, Header, Footer ...)
  pages/                HomePage, CommunityPage, PostDetailPage, NotFoundPage
  data/menu.js          메뉴·서비스 등 화면 데이터
  data/community.js     게시판 목록 + 예시 데이터
  styles/               global.css(디자인 토큰), community.css
```

## 페이지 주소

| 주소 | 화면 |
| --- | --- |
| `/` | 메인 |
| `/community` | 커뮤니티 전체글 |
| `/community/:board` | 게시판별 목록 (notice, free, tour, qna, meetup, gear) |
| `/community/post/:id` | 게시글 상세 |
