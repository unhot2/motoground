-- =====================================================================
-- MOTOGROUND — Supabase 데이터베이스 구조
-- Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run 하세요.
-- (처음 한 번만 실행. 다시 실행해도 오류가 나지 않도록 작성되어 있습니다)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 회원 프로필 (Supabase 로그인 계정 auth.users 와 1:1)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text not null unique check (char_length(nickname) between 2 and 20),
  avatar_url  text,
  bike_model  text,                                   -- 내 바이크 (선택)
  region      text,                                   -- 활동 지역 (선택)
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

-- 회원가입 시 프로필 자동 생성 (닉네임 없으면 'rider_xxxxxx')
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nickname', ''),
      'rider_' || substr(replace(new.id::text, '-', ''), 1, 6)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 관리자 여부 확인 (정책에서 사용)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;


-- ---------------------------------------------------------------------
-- 2. 게시판
-- ---------------------------------------------------------------------
create table if not exists public.boards (
  slug        text primary key,                       -- 주소에 쓰는 값 (free, tour ...)
  name        text not null,
  description text,
  sort_order  int  not null default 0,
  admin_only  boolean not null default false          -- true면 관리자만 글쓰기 (공지사항)
);

insert into public.boards (slug, name, description, sort_order, admin_only) values
  ('notice', '공지사항',   '운영 공지와 이벤트 안내',            1, true),
  ('free',   '자유게시판', '바이크와 일상, 자유롭게 이야기해요', 2, false),
  ('tour',   '투어 후기',  '다녀온 코스와 맛집을 공유해요',      3, false),
  ('qna',    '정비 Q&A',   '정비·튜닝 궁금증을 함께 해결해요',   4, false),
  ('meetup', '모임·번개',  '함께 달릴 라이더를 찾아보세요',      5, false),
  ('gear',   '용품 리뷰',  '헬멧, 자켓, 액세서리 실사용 후기',   6, false)
on conflict (slug) do update
  set name = excluded.name,
      description = excluded.description,
      sort_order = excluded.sort_order,
      admin_only = excluded.admin_only;


-- ---------------------------------------------------------------------
-- 3. 게시글
-- ---------------------------------------------------------------------
create table if not exists public.posts (
  id            bigint generated always as identity primary key,
  board_slug    text not null references public.boards (slug) on update cascade,
  author_id     uuid references public.profiles (id) on delete set null,  -- 탈퇴 시 글은 남김
  title         text not null check (char_length(title) between 1 and 100),
  content       text not null default '',
  image_urls    text[] not null default '{}',          -- 본문 첨부 사진 (post-images 저장소 주소)
  is_pinned     boolean not null default false,        -- 공지 고정
  view_count    int not null default 0,
  comment_count int not null default 0,                -- 트리거로 자동 계산
  like_count    int not null default 0,                -- 트리거로 자동 계산
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists posts_board_created_idx on public.posts (board_slug, created_at desc);
create index if not exists posts_created_idx       on public.posts (created_at desc);
create index if not exists posts_views_idx         on public.posts (view_count desc);


-- ---------------------------------------------------------------------
-- 4. 댓글 (parent_id 가 있으면 답글)
-- ---------------------------------------------------------------------
create table if not exists public.comments (
  id          bigint generated always as identity primary key,
  post_id     bigint not null references public.posts (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  parent_id   bigint references public.comments (id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 1000),
  like_count  int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists comments_post_idx on public.comments (post_id, created_at);


-- ---------------------------------------------------------------------
-- 5. 게시글 추천 (한 사람당 한 번)
-- ---------------------------------------------------------------------
create table if not exists public.post_likes (
  post_id    bigint not null references public.posts (id) on delete cascade,
  user_id    uuid   not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);


-- ---------------------------------------------------------------------
-- 6. 중고 매물
-- ---------------------------------------------------------------------
create table if not exists public.listings (
  id              bigint generated always as identity primary key,
  seller_id       uuid not null references public.profiles (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 100),
  brand           text not null,                      -- 제조사 (예: 혼다, 야마하, BMW)
  model           text not null,                      -- 모델명
  genre           text check (genre in ('replica', 'naked', 'tourer', 'adventure', 'cruiser', 'scooter', 'classic', 'offroad', 'etc')),
  model_year      int  check (model_year between 1950 and 2100),
  mileage_km      int  check (mileage_km >= 0),
  displacement_cc int  check (displacement_cc > 0),
  price           int  not null check (price >= 0),   -- 원 단위
  region          text not null,                      -- 거래 지역 (예: 서울 강남구)
  description     text not null default '',
  status          text not null default 'selling' check (status in ('selling', 'reserved', 'sold')),
  view_count      int  not null default 0,
  like_count      int  not null default 0,            -- 찜 수, 트리거로 자동 계산
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists listings_status_created_idx on public.listings (status, created_at desc);
create index if not exists listings_brand_idx          on public.listings (brand, model);
create index if not exists listings_price_idx          on public.listings (price);
create index if not exists listings_seller_idx         on public.listings (seller_id);


-- ---------------------------------------------------------------------
-- 7. 매물 사진 (listing-images 저장소의 파일 경로)
-- ---------------------------------------------------------------------
create table if not exists public.listing_images (
  id          bigint generated always as identity primary key,
  listing_id  bigint not null references public.listings (id) on delete cascade,
  path        text not null,                           -- 저장소 안 경로: {회원id}/{파일명}
  sort_order  int  not null default 0,                 -- 0번이 대표 사진
  created_at  timestamptz not null default now()
);

create index if not exists listing_images_listing_idx on public.listing_images (listing_id, sort_order);

-- 매물 추가 정보 (예전에 schema.sql 을 실행했어도 다시 Run 하면 컬럼만 추가됩니다)
alter table public.listings add column if not exists accident text check (accident in ('none', 'minor', 'major'));  -- 사고 이력
alter table public.listings add column if not exists tuning   text check (char_length(tuning) <= 200);                -- 튜닝 내역

-- 매물 연락처 (오픈채팅 링크·전화번호) — 로그인한 회원만 볼 수 있게 매물과 따로 저장
create table if not exists public.listing_contacts (
  listing_id bigint primary key references public.listings (id) on delete cascade,
  contact    text   not null check (char_length(contact) between 1 and 200)
);


-- ---------------------------------------------------------------------
-- 8. 매물 찜
-- ---------------------------------------------------------------------
create table if not exists public.listing_likes (
  listing_id bigint not null references public.listings (id) on delete cascade,
  user_id    uuid   not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);


-- =====================================================================
-- 자동 계산 트리거
-- =====================================================================

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

drop trigger if exists listings_touch on public.listings;
create trigger listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();

-- 댓글 수
create or replace function public.sync_comment_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_count on public.comments;
create trigger comments_count after insert or delete on public.comments
  for each row execute function public.sync_comment_count();

-- 게시글 추천 수
create or replace function public.sync_post_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists post_likes_count on public.post_likes;
create trigger post_likes_count after insert or delete on public.post_likes
  for each row execute function public.sync_post_like_count();

-- 매물 찜 수
create or replace function public.sync_listing_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update listings set like_count = like_count + 1 where id = new.listing_id;
  elsif tg_op = 'DELETE' then
    update listings set like_count = greatest(like_count - 1, 0) where id = old.listing_id;
  end if;
  return null;
end;
$$;

drop trigger if exists listing_likes_count on public.listing_likes;
create trigger listing_likes_count after insert or delete on public.listing_likes
  for each row execute function public.sync_listing_like_count();

-- 일반 회원이 자기 글을 수정할 때 조회수·댓글수·추천수·공지고정을 바꾸지 못하게 보호
create or replace function public.protect_post_counters()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.view_count    := old.view_count;
    new.comment_count := old.comment_count;
    new.like_count    := old.like_count;
    new.is_pinned     := old.is_pinned;
    new.author_id     := old.author_id;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_protect on public.posts;
create trigger posts_protect before update on public.posts
  for each row execute function public.protect_post_counters();

create or replace function public.protect_listing_counters()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.view_count := old.view_count;
    new.like_count := old.like_count;
    new.seller_id  := old.seller_id;
  end if;
  return new;
end;
$$;

drop trigger if exists listings_protect on public.listings;
create trigger listings_protect before update on public.listings
  for each row execute function public.protect_listing_counters();

-- 조회수 +1 (누구나 호출 가능, 이 함수로만 조회수 변경)
create or replace function public.increment_post_view(p_post_id bigint)
returns void language sql security definer set search_path = public as $$
  update posts set view_count = view_count + 1 where id = p_post_id;
$$;

create or replace function public.increment_listing_view(p_listing_id bigint)
returns void language sql security definer set search_path = public as $$
  update listings set view_count = view_count + 1 where id = p_listing_id;
$$;

grant execute on function public.increment_post_view(bigint)    to anon, authenticated;
grant execute on function public.increment_listing_view(bigint) to anon, authenticated;


-- =====================================================================
-- 보안 정책 (RLS) — 읽기는 누구나, 쓰기는 로그인한 본인만
-- =====================================================================
alter table public.profiles       enable row level security;
alter table public.boards         enable row level security;
alter table public.posts          enable row level security;
alter table public.comments       enable row level security;
alter table public.post_likes     enable row level security;
alter table public.listings       enable row level security;
alter table public.listing_images enable row level security;
alter table public.listing_likes  enable row level security;

-- 프로필
drop policy if exists "profiles_read"   on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_read"   on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- 게시판 (읽기만, 수정은 대시보드에서)
drop policy if exists "boards_read" on public.boards;
create policy "boards_read" on public.boards for select using (true);

-- 게시글
drop policy if exists "posts_read"   on public.posts;
drop policy if exists "posts_insert" on public.posts;
drop policy if exists "posts_update" on public.posts;
drop policy if exists "posts_delete" on public.posts;
create policy "posts_read" on public.posts for select using (true);
create policy "posts_insert" on public.posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and view_count = 0 and comment_count = 0 and like_count = 0
    and (public.is_admin() or (
      is_pinned = false
      and not exists (select 1 from public.boards b where b.slug = board_slug and b.admin_only)
    ))
  );
create policy "posts_update" on public.posts for update to authenticated
  using (author_id = auth.uid() or public.is_admin());
create policy "posts_delete" on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- 댓글
drop policy if exists "comments_read"   on public.comments;
drop policy if exists "comments_insert" on public.comments;
drop policy if exists "comments_update" on public.comments;
drop policy if exists "comments_delete" on public.comments;
create policy "comments_read"   on public.comments for select using (true);
create policy "comments_insert" on public.comments for insert to authenticated
  with check (author_id = auth.uid() and like_count = 0);
create policy "comments_update" on public.comments for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
create policy "comments_delete" on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- 게시글 추천
drop policy if exists "post_likes_read"   on public.post_likes;
drop policy if exists "post_likes_insert" on public.post_likes;
drop policy if exists "post_likes_delete" on public.post_likes;
create policy "post_likes_read"   on public.post_likes for select using (true);
create policy "post_likes_insert" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy "post_likes_delete" on public.post_likes for delete to authenticated using (user_id = auth.uid());

-- 매물
drop policy if exists "listings_read"   on public.listings;
drop policy if exists "listings_insert" on public.listings;
drop policy if exists "listings_update" on public.listings;
drop policy if exists "listings_delete" on public.listings;
create policy "listings_read"   on public.listings for select using (true);
create policy "listings_insert" on public.listings for insert to authenticated
  with check (seller_id = auth.uid() and view_count = 0 and like_count = 0);
create policy "listings_update" on public.listings for update to authenticated
  using (seller_id = auth.uid() or public.is_admin());
create policy "listings_delete" on public.listings for delete to authenticated
  using (seller_id = auth.uid() or public.is_admin());

-- 매물 사진 (자기 매물에만 추가/삭제)
drop policy if exists "listing_images_read"  on public.listing_images;
drop policy if exists "listing_images_write" on public.listing_images;
create policy "listing_images_read"  on public.listing_images for select using (true);
create policy "listing_images_write" on public.listing_images for all to authenticated
  using      (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

-- 매물 찜 (본인 것만 보이게)
drop policy if exists "listing_likes_read"   on public.listing_likes;
drop policy if exists "listing_likes_insert" on public.listing_likes;
drop policy if exists "listing_likes_delete" on public.listing_likes;
create policy "listing_likes_read"   on public.listing_likes for select to authenticated using (user_id = auth.uid());
create policy "listing_likes_insert" on public.listing_likes for insert to authenticated with check (user_id = auth.uid());
create policy "listing_likes_delete" on public.listing_likes for delete to authenticated using (user_id = auth.uid());

-- 매물 연락처 (읽기는 로그인 회원만, 쓰기는 자기 매물만)
alter table public.listing_contacts enable row level security;
drop policy if exists "listing_contacts_read"  on public.listing_contacts;
drop policy if exists "listing_contacts_write" on public.listing_contacts;
create policy "listing_contacts_read"  on public.listing_contacts for select to authenticated using (true);
create policy "listing_contacts_write" on public.listing_contacts for all to authenticated
  using      (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));


-- =====================================================================
-- 사진 저장소 (Storage) — 공개 읽기, 로그인 회원은 자기 폴더({회원id}/...)에만 업로드
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('listing-images', 'listing-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-images',    'post-images',    true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars',        'avatars',        true, 1048576, array['image/jpeg', 'image/png', 'image/webp']),
  ('garage-images',  'garage-images',  true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('place-images',   'place-images',   true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('goods-images',   'goods-images',   true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "motoground_images_read"   on storage.objects;
drop policy if exists "motoground_images_insert" on storage.objects;
drop policy if exists "motoground_images_update" on storage.objects;
drop policy if exists "motoground_images_delete" on storage.objects;

create policy "motoground_images_read" on storage.objects for select
  using (bucket_id in ('listing-images', 'post-images', 'avatars', 'garage-images', 'place-images', 'goods-images'));

create policy "motoground_images_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('listing-images', 'post-images', 'avatars', 'garage-images', 'place-images', 'goods-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "motoground_images_update" on storage.objects for update to authenticated
  using (
    bucket_id in ('listing-images', 'post-images', 'avatars', 'garage-images', 'place-images', 'goods-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "motoground_images_delete" on storage.objects for delete to authenticated
  using (
    bucket_id in ('listing-images', 'post-images', 'avatars', 'garage-images', 'place-images', 'goods-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- =====================================================================
-- 회원 탈퇴 — 로그인한 본인 계정만 삭제
-- 프로필·추천·찜·매물은 함께 지워지고, 게시글·댓글은 '탈퇴한 회원' 글로 남습니다.
-- (프로필 사진 파일은 화면에서 먼저 지운 뒤 이 함수를 호출합니다)
-- =====================================================================
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;


-- =====================================================================
-- 내 차고 — 내 바이크 · 정비/비용 기록 · 소모품 교체 주기 (본인만 보기)
-- =====================================================================
create table if not exists public.bikes (
  id              bigint generated always as identity primary key,
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  nickname        text check (char_length(nickname) <= 20),           -- 별명 (예: 검둥이)
  brand           text not null check (char_length(brand) between 1 and 30),
  model           text not null check (char_length(model) between 1 and 40),
  model_year      int  check (model_year between 1950 and 2100),
  displacement_cc int  check (displacement_cc > 0),
  genre           text check (genre in ('replica', 'naked', 'tourer', 'adventure', 'cruiser', 'scooter', 'classic', 'offroad', 'etc')),
  purchased_on    date,
  purchase_km     int  check (purchase_km >= 0),
  current_km      int  not null default 0 check (current_km >= 0),
  image_urls      text[] not null default '{}',                       -- garage-images 저장소 주소, 0번이 대표 사진
  is_main         boolean not null default false,                     -- 대표 바이크 (1인 1대)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists bikes_owner_idx on public.bikes (owner_id, created_at);
create unique index if not exists bikes_one_main_idx on public.bikes (owner_id) where is_main;

drop trigger if exists bikes_touch on public.bikes;
create trigger bikes_touch before update on public.bikes
  for each row execute function public.touch_updated_at();

-- 정비·주유·보험·용품 등 비용 기록
create table if not exists public.bike_logs (
  id           bigint generated always as identity primary key,
  bike_id      bigint not null references public.bikes (id) on delete cascade,
  owner_id     uuid   not null references public.profiles (id) on delete cascade,
  category     text   not null default 'maintenance'
               check (category in ('maintenance', 'fuel', 'insurance', 'gear', 'etc')),
  items        text[] not null default '{}',                          -- 소모품 키(engine_oil 등) 또는 직접 입력한 이름
  performed_on date   not null default current_date,
  odometer_km  int    check (odometer_km >= 0),
  cost         int    not null default 0 check (cost >= 0),           -- 원 단위
  shop         text   check (char_length(shop) <= 40),                -- 정비한 곳
  memo         text   check (char_length(memo) <= 500),
  image_urls   text[] not null default '{}',                          -- 영수증 사진
  created_at   timestamptz not null default now()
);

create index if not exists bike_logs_bike_idx  on public.bike_logs (bike_id, performed_on desc);
create index if not exists bike_logs_owner_idx on public.bike_logs (owner_id);

-- 소모품 교체 주기 (사용자가 바꾼 값만 저장, 나머지는 화면의 기본값 사용)
create table if not exists public.bike_intervals (
  bike_id         bigint not null references public.bikes (id) on delete cascade,
  item_key        text   not null,
  interval_km     int    check (interval_km > 0),
  interval_months int    check (interval_months > 0),
  primary key (bike_id, item_key)
);

alter table public.bikes          enable row level security;
alter table public.bike_logs      enable row level security;
alter table public.bike_intervals enable row level security;

-- 바이크: 본인 것만
drop policy if exists "bikes_owner" on public.bikes;
create policy "bikes_owner" on public.bikes for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 기록: 본인 것만, 내 바이크에만 추가
drop policy if exists "bike_logs_owner" on public.bike_logs;
create policy "bike_logs_owner" on public.bike_logs for all to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid())
  );

-- 교체 주기: 내 바이크 것만
drop policy if exists "bike_intervals_owner" on public.bike_intervals;
create policy "bike_intervals_owner" on public.bike_intervals for all to authenticated
  using      (exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.bikes b where b.id = bike_id and b.owner_id = auth.uid()));


-- =====================================================================
-- 플레이스 — 라이더 카페 · 정비소 · 바이크 주차 등 (운영자가 등록, 누구나 보기)
-- 예전에 schema.sql 을 실행했어도 다시 Run 하면 이 부분과 사진 저장소만 추가됩니다
-- =====================================================================
create table if not exists public.places (
  id             bigint generated always as identity primary key,
  category       text   not null check (category in ('cafe', 'food', 'repair', 'parking', 'gear', 'stay', 'wash', 'school')),
  name           text   not null check (char_length(name) between 1 and 60),
  address        text   not null check (char_length(address) between 1 and 200),
  region         text   not null,                                     -- 시·도 (서울, 경기 ...) 필터용
  lat            double precision check (lat between -90 and 90),     -- 지도 좌표 (없으면 지도에만 안 보임)
  lng            double precision check (lng between -180 and 180),
  phone          text   check (char_length(phone) <= 30),
  hours          text   check (char_length(hours) <= 200),            -- 영업시간 (자유 입력)
  description    text   not null default '' check (char_length(description) <= 2000),
  tags           text[] not null default '{}',                        -- 라이더 태그 (bike_parking 등, 화면 data/place.js)
  image_urls     text[] not null default '{}',                        -- place-images 저장소 주소, 0번이 대표 사진
  kakao_place_id text,                                                -- 카카오맵 장소 id (검색으로 등록했을 때)
  is_published   boolean not null default true,                       -- false 면 운영자만 보임
  created_by     uuid   references public.profiles (id) on delete set null,
  review_count   int    not null default 0,                           -- 트리거로 자동 계산
  rating_sum     int    not null default 0,                           -- 별점 합계 (평균 = rating_sum / review_count)
  like_count     int    not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists places_category_idx on public.places (category, created_at desc);
create index if not exists places_region_idx   on public.places (region);
create index if not exists places_geo_idx      on public.places (lat, lng);

drop trigger if exists places_touch on public.places;
create trigger places_touch before update on public.places
  for each row execute function public.touch_updated_at();

-- 후기 (한 장소에 회원당 하나)
create table if not exists public.place_reviews (
  id         bigint generated always as identity primary key,
  place_id   bigint not null references public.places (id) on delete cascade,
  author_id  uuid   not null references public.profiles (id) on delete cascade,
  rating     int    not null check (rating between 1 and 5),
  content    text   not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (place_id, author_id)
);

create index if not exists place_reviews_place_idx on public.place_reviews (place_id, created_at desc);

-- 찜
create table if not exists public.place_likes (
  place_id   bigint not null references public.places (id) on delete cascade,
  user_id    uuid   not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (place_id, user_id)
);

-- 후기 수 · 별점 합계
create or replace function public.sync_place_review_stats()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update places set review_count = review_count + 1, rating_sum = rating_sum + new.rating where id = new.place_id;
  elsif tg_op = 'DELETE' then
    update places set review_count = greatest(review_count - 1, 0), rating_sum = greatest(rating_sum - old.rating, 0) where id = old.place_id;
  end if;
  return null;
end;
$$;

drop trigger if exists place_reviews_stats on public.place_reviews;
create trigger place_reviews_stats after insert or delete on public.place_reviews
  for each row execute function public.sync_place_review_stats();

-- 찜 수
create or replace function public.sync_place_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update places set like_count = like_count + 1 where id = new.place_id;
  elsif tg_op = 'DELETE' then
    update places set like_count = greatest(like_count - 1, 0) where id = old.place_id;
  end if;
  return null;
end;
$$;

drop trigger if exists place_likes_count on public.place_likes;
create trigger place_likes_count after insert or delete on public.place_likes
  for each row execute function public.sync_place_like_count();

-- 운영자가 장소를 수정할 때 후기 수·별점·찜 수가 덮어써지지 않게 보호
create or replace function public.protect_place_counters()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.review_count := old.review_count;
    new.rating_sum   := old.rating_sum;
    new.like_count   := old.like_count;
    new.created_by   := old.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists places_protect on public.places;
create trigger places_protect before update on public.places
  for each row execute function public.protect_place_counters();

alter table public.places        enable row level security;
alter table public.place_reviews enable row level security;
alter table public.place_likes   enable row level security;

-- 장소: 공개된 것은 누구나, 등록·수정·삭제는 운영자만
drop policy if exists "places_read"   on public.places;
drop policy if exists "places_insert" on public.places;
drop policy if exists "places_update" on public.places;
drop policy if exists "places_delete" on public.places;
create policy "places_read"   on public.places for select using (is_published or public.is_admin());
create policy "places_insert" on public.places for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid() and review_count = 0 and rating_sum = 0 and like_count = 0);
create policy "places_update" on public.places for update to authenticated using (public.is_admin());
create policy "places_delete" on public.places for delete to authenticated using (public.is_admin());

-- 후기: 누구나 보기, 회원은 공개된 장소에 자기 후기만 쓰고 지우기 (운영자는 삭제 가능)
drop policy if exists "place_reviews_read"   on public.place_reviews;
drop policy if exists "place_reviews_insert" on public.place_reviews;
drop policy if exists "place_reviews_delete" on public.place_reviews;
create policy "place_reviews_read"   on public.place_reviews for select using (true);
create policy "place_reviews_insert" on public.place_reviews for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.places p where p.id = place_id and p.is_published)
  );
create policy "place_reviews_delete" on public.place_reviews for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- 찜: 본인 것만
drop policy if exists "place_likes_read"   on public.place_likes;
drop policy if exists "place_likes_insert" on public.place_likes;
drop policy if exists "place_likes_delete" on public.place_likes;
create policy "place_likes_read"   on public.place_likes for select to authenticated using (user_id = auth.uid());
create policy "place_likes_insert" on public.place_likes for insert to authenticated with check (user_id = auth.uid());
create policy "place_likes_delete" on public.place_likes for delete to authenticated using (user_id = auth.uid());


-- =====================================================================
-- 용품 거래 — 헬멧 · 자켓 · 보호장비 등 바이크 용품 중고/새상품 거래 (AC-19)
-- 예전에 schema.sql 을 실행했어도 다시 Run 하면 이 부분과 사진 저장소만 추가됩니다
-- =====================================================================
create table if not exists public.goods (
  id          bigint generated always as identity primary key,
  seller_id   uuid references public.profiles (id) on delete cascade,
  category    text check (category in ('helmet', 'jacket', 'glove', 'boots', 'protector', 'comm', 'mount', 'tool', 'parts', 'etc')),
  title       text not null check (char_length(title) between 1 and 100),
  brand       text,
  size        text,                                     -- 사이즈 (예: L, 42, 원터치 등 자유 입력)
  condition   text check (condition in ('new_sealed', 'new', 'used_high', 'used_mid', 'used_low')),
  price       int  check (price >= 0),                  -- 원 단위
  region      text,                                     -- 거래 지역 (예: 서울 강남구)
  description text,
  status      text not null default 'selling' check (status in ('selling', 'reserved', 'sold')),
  view_count  int  not null default 0,
  like_count  int  not null default 0,                  -- 찜 수, 트리거로 자동 계산
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists goods_status_created_idx on public.goods (status, created_at desc);
create index if not exists goods_category_idx       on public.goods (category);
create index if not exists goods_price_idx           on public.goods (price);
create index if not exists goods_seller_idx          on public.goods (seller_id);

-- 용품 사진 (goods-images 저장소의 파일 경로)
create table if not exists public.goods_images (
  id          bigint generated always as identity primary key,
  goods_id    bigint not null references public.goods (id) on delete cascade,
  path        text not null,                             -- 저장소 안 경로: {회원id}/{파일명}
  sort_order  int  not null default 0,                   -- 0번이 대표 사진
  created_at  timestamptz not null default now()
);

create index if not exists goods_images_goods_idx on public.goods_images (goods_id, sort_order);

-- 용품 연락처 (오픈채팅 링크·전화번호) — 로그인한 회원만 볼 수 있게 용품과 따로 저장
create table if not exists public.goods_contacts (
  goods_id bigint primary key references public.goods (id) on delete cascade,
  contact  text not null check (char_length(contact) between 1 and 200)
);

-- 용품 찜
create table if not exists public.goods_likes (
  goods_id   bigint not null references public.goods (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (goods_id, user_id)
);

drop trigger if exists goods_touch on public.goods;
create trigger goods_touch before update on public.goods
  for each row execute function public.touch_updated_at();

-- 용품 찜 수
create or replace function public.sync_goods_like_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update goods set like_count = like_count + 1 where id = new.goods_id;
  elsif tg_op = 'DELETE' then
    update goods set like_count = greatest(like_count - 1, 0) where id = old.goods_id;
  end if;
  return null;
end;
$$;

drop trigger if exists goods_likes_count on public.goods_likes;
create trigger goods_likes_count after insert or delete on public.goods_likes
  for each row execute function public.sync_goods_like_count();

-- 일반 회원이 자기 용품을 수정할 때 조회수·찜수·판매자를 바꾸지 못하게 보호
create or replace function public.protect_goods_counters()
returns trigger language plpgsql as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.view_count := old.view_count;
    new.like_count := old.like_count;
    new.seller_id  := old.seller_id;
  end if;
  return new;
end;
$$;

drop trigger if exists goods_protect on public.goods;
create trigger goods_protect before update on public.goods
  for each row execute function public.protect_goods_counters();

-- 조회수 +1 (누구나 호출 가능, 이 함수로만 조회수 변경)
drop function if exists public.increment_goods_view(uuid);
create or replace function public.increment_goods_view(p_goods_id bigint)
returns void language sql security definer set search_path = public as $$
  update goods set view_count = view_count + 1 where id = p_goods_id;
$$;

grant execute on function public.increment_goods_view(bigint) to anon, authenticated;

alter table public.goods          enable row level security;
alter table public.goods_images   enable row level security;
alter table public.goods_contacts enable row level security;
alter table public.goods_likes    enable row level security;

-- 용품
drop policy if exists "goods_read"   on public.goods;
drop policy if exists "goods_insert" on public.goods;
drop policy if exists "goods_update" on public.goods;
drop policy if exists "goods_delete" on public.goods;
create policy "goods_read"   on public.goods for select using (true);
create policy "goods_insert" on public.goods for insert to authenticated
  with check (seller_id = auth.uid() and view_count = 0 and like_count = 0);
create policy "goods_update" on public.goods for update to authenticated
  using (seller_id = auth.uid() or public.is_admin());
create policy "goods_delete" on public.goods for delete to authenticated
  using (seller_id = auth.uid() or public.is_admin());

-- 용품 사진 (자기 용품에만 추가/삭제)
drop policy if exists "goods_images_read"  on public.goods_images;
drop policy if exists "goods_images_write" on public.goods_images;
create policy "goods_images_read"  on public.goods_images for select using (true);
create policy "goods_images_write" on public.goods_images for all to authenticated
  using      (exists (select 1 from public.goods g where g.id = goods_id and g.seller_id = auth.uid()))
  with check (exists (select 1 from public.goods g where g.id = goods_id and g.seller_id = auth.uid()));

-- 용품 찜 (본인 것만 보이게)
drop policy if exists "goods_likes_read"   on public.goods_likes;
drop policy if exists "goods_likes_insert" on public.goods_likes;
drop policy if exists "goods_likes_delete" on public.goods_likes;
create policy "goods_likes_read"   on public.goods_likes for select to authenticated using (user_id = auth.uid());
create policy "goods_likes_insert" on public.goods_likes for insert to authenticated with check (user_id = auth.uid());
create policy "goods_likes_delete" on public.goods_likes for delete to authenticated using (user_id = auth.uid());

-- 용품 연락처 (읽기는 로그인 회원만, 쓰기는 자기 용품만) — listing_contacts 와 동일한 패턴
drop policy if exists "goods_contacts_read"  on public.goods_contacts;
drop policy if exists "goods_contacts_write" on public.goods_contacts;
create policy "goods_contacts_read"  on public.goods_contacts for select to authenticated using (true);
create policy "goods_contacts_write" on public.goods_contacts for all to authenticated
  using      (exists (select 1 from public.goods g where g.id = goods_id and g.seller_id = auth.uid()))
  with check (exists (select 1 from public.goods g where g.id = goods_id and g.seller_id = auth.uid()));
