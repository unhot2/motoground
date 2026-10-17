-- =====================================================================
-- MOTOGROUND — 용품 거래 더미 데이터 (사진 포함 용품 12개)
-- schema.sql 실행 후 Supabase 대시보드 > SQL Editor 에 붙여넣고 Run 하세요.
-- seed_market_dummy.sql 과 같은 테스트 계정(dummy01~10)을 그대로 사용합니다.
-- 두 시드를 모두 실행할 거라면 순서는 상관없습니다(계정 생성은 중복 방지됩니다).
--
-- 테스트 계정: dummy01@motoground.test ~ dummy10@motoground.test
-- 비밀번호(공통): motoground-dummy-1234
-- 사진: public/dummy/goods/*.webp (실제 파일은 화면 작업 때 추가, 경로만 먼저 심어둡니다)
--
-- 전부 지우려면 (프로필은 market/place 더미와 공유하므로 지우지 않습니다):
--   delete from public.goods where seller_id in (
--     select id from auth.users where email like 'dummy%@motoground.test'
--   );
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 테스트 계정 (가입 트리거가 profiles 를 자동으로 만듭니다, 이미 있으면 건너뜁니다)
-- ---------------------------------------------------------------------
with accounts (n, nickname) as (
  values
    (1, '마포라이더'), (2, '판교출퇴근러'), (3, '해운대스쿠터'), (4, '송도닌자'), (5, '유성알쓰리'),
    (6, '수원투어러'), (7, '수성할리'), (8, '송파팔에스'), (9, '춘천임도'), (10, '고양박서')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000',
  ('00000000-0000-4000-a000-' || lpad(n::text, 12, '0'))::uuid,
  'authenticated', 'authenticated',
  'dummy' || lpad(n::text, 2, '0') || '@motoground.test',
  extensions.crypt('motoground-dummy-1234', extensions.gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object('nickname', nickname),
  now() - (n || ' days')::interval, now(),
  '', '', '', ''
from accounts
on conflict (id) do nothing;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now()
from auth.users u
where u.email like 'dummy%@motoground.test'
on conflict do nothing;


-- ---------------------------------------------------------------------
-- 2. 용품 + 사진 + 연락처
-- ---------------------------------------------------------------------
drop table if exists dummy_goods;
create temp table dummy_goods (
  n int, seller int, category text, title text, brand text, size text, condition text,
  price int, region text, description text, status text, ago interval,
  images text[], contact text
);

insert into dummy_goods values
  (1, 1, 'helmet', 'HJC RPHA 11 라지 무도장 블랙 팝니다', 'HJC', 'L', 'new',
    320000, '서울 마포구',
    E'작년에 사서 몇 번 안 썼습니다. 내장 스펀지 깨끗하고 스크래치 없어요.\n박스, 바이저 여분 같이 드립니다.',
    'selling', '4 hours', array['helmet-hjc-rpha11-1', 'helmet-hjc-rpha11-2'], '010-0000-0001 (문자 먼저 부탁드려요)'),

  (2, 2, 'jacket', '다이네즈 레이싱 자켓 44 사이즈', '다이네즈', '44', 'used_high',
    450000, '경기 성남시',
    E'서킷 몇 번 타고 체형이 바뀌어서 판매합니다.\n숄더/엘보 프로텍터 다 들어있고 찢어진 곳 없습니다.',
    'selling', '7 hours', array['jacket-dainese-1', 'jacket-dainese-2'], 'open.kakao.com/o/dummy02'),

  (3, 3, 'glove', '알파인스타스 GP PRO 장갑 L 미착용', '알파인스타스', 'L', 'new_sealed',
    95000, '부산 해운대구',
    E'사이즈 안 맞아서 한 번도 안 썼습니다. 택 그대로 있어요.\n정가보다 저렴하게 드립니다.',
    'selling', '10 hours', array['glove-alpinestars-1'], null),

  (4, 4, 'boots', 'TCX 레이싱 부츠 270mm', 'TCX', '270mm', 'used_mid',
    180000, '인천 연수구',
    E'투어용으로 1년 정도 신었습니다. 바닥 마모는 있지만 보호 기능엔 문제없어요.\n버클 정상 작동합니다.',
    'selling', '1 day 1 hours', array['boots-tcx-1', 'boots-tcx-2'], 'open.kakao.com/o/dummy04'),

  (5, 5, 'protector', '니룩 척추 보호대 프리사이즈', '니룩', '프리사이즈', 'used_high',
    60000, '대전 유성구',
    E'자켓에 넣어서 쓰던 척추 보호대입니다. 상태 좋아요.\n세탁 가능한 커버 포함입니다.',
    'selling', '1 day 8 hours', array['protector-knox-1'], null),

  (6, 6, 'comm', '세나 50S 블루투스 인터콤 2세트', '세나', null, 'used_high',
    280000, '경기 수원시',
    E'커플/듀오 라이딩용으로 쓰던 2세트입니다. 헬멧 두 개에 부착했던 거라 마운트 두 세트 다 드려요.\n펌웨어 최신으로 업데이트해서 드립니다.',
    'selling', '2 days', array['comm-sena50s-1', 'comm-sena50s-2'], '010-0000-0006'),

  (7, 7, 'mount', '쿼드락 프로 거치대 세트 (핸들바+케이스)', '쿼드락', null, 'new',
    55000, '대구 수성구',
    E'폰 바꾸면서 케이스가 안 맞아서 판매합니다. 핸들바 마운트는 미사용 새 제품이에요.\n진동방지 댐퍼 포함입니다.',
    'selling', '2 days 6 hours', array['mount-quadlock-1'], 'open.kakao.com/o/dummy07'),

  (8, 8, 'tool', '모토 정비 툴킷 세트 (오구스 소켓 포함)', '오구스', null, 'used_mid',
    70000, '서울 송파구',
    E'체인 정비, 오일 교환할 때 쓰던 공구 세트입니다. 오구스 소켓, 체인커터 포함이에요.\n몇 개는 사용감 있지만 기능 이상 없습니다.',
    'selling', '3 days', array['tool-ogura-1', 'tool-ogura-2'], '010-0000-0008'),

  (9, 9, 'parts', '아크라포비치 슬립온 머플러 (닌자400용)', '아크라포비치', null, 'used_high',
    380000, '강원 춘천시',
    E'닌자400 순정에서 교체하고 보관 중이던 슬립온입니다. 소리 좋고 상태 깨끗해요.\n장착 브라켓, 개스킷 같이 드립니다.',
    'selling', '3 days 9 hours', array['parts-akrapovic-1', 'parts-akrapovic-2'], null),

  (10, 10, 'etc', '바이크 커버 XL 방수 거의 새 제품', '노브랜드', 'XL', 'new',
    35000, '경기 고양시',
    E'어드벤처/투어러급 바이크용 커버입니다. 몇 번만 덮어봤고 방수 잘 됩니다.\n수납 파우치 포함입니다.',
    'selling', '4 days', array['etc-bikecover-1'], null),

  (11, 1, 'helmet', '쇼에이 Z8 미디움 화이트 판매', '쇼에이', 'M', 'used_low',
    250000, '서울 마포구',
    E'3년 정도 쓴 헬멧입니다. 외관 잔기스 있고 내장은 세탁해서 드려요.\n제조일자는 사진으로 확인 가능합니다.',
    'selling', '4 days 5 hours', array['helmet-shoei-z8-1', 'helmet-shoei-z8-2'], '010-0000-0001 (문자 먼저 부탁드려요)'),

  (12, 2, 'jacket', '레브잇 메쉬 자켓 L 여름용', '레브잇', 'L', 'used_mid',
    150000, '경기 성남시',
    E'여름 통근용으로 입던 메쉬 자켓입니다. 보호대 다 들어있고 통기성 좋아요.\n한 시즌만 입어서 상태 양호합니다.',
    'selling', '5 days', array['jacket-revit-1'], 'open.kakao.com/o/dummy02');

with inserted as (
  insert into public.goods (
    seller_id, category, title, brand, size, condition,
    price, region, description, status, view_count, created_at
  )
  select
    ('00000000-0000-4000-a000-' || lpad(seller::text, 12, '0'))::uuid,
    category, title, brand, size, condition,
    price, region, description, status,
    (random() * 200)::int + 10,
    now() - ago
  from dummy_goods
  order by n
  returning id, title, seller_id
),
imgs as (
  insert into public.goods_images (goods_id, path, sort_order)
  select i.id, '/dummy/goods/' || img.name || '.webp', img.ord - 1
  from inserted i
  join dummy_goods d on d.title = i.title
  cross join lateral unnest(d.images) with ordinality as img (name, ord)
  returning goods_id
)
insert into public.goods_contacts (goods_id, contact)
select i.id, d.contact
from inserted i
join dummy_goods d on d.title = i.title
where d.contact is not null;

drop table if exists dummy_goods;
