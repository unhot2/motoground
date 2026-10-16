-- =====================================================================
-- MOTOGROUND — 중고매물 더미 데이터 (테스트 계정 10개 + 사진 포함 매물 14개)
-- schema.sql 실행 후 Supabase 대시보드 > SQL Editor 에 붙여넣고 Run 하세요.
-- 다시 실행해도 계정은 중복 생성되지 않지만, 매물은 한 번 더 들어가니 한 번만 실행하세요.
--
-- 테스트 계정: dummy01@motoground.test ~ dummy10@motoground.test
-- 비밀번호(공통): motoground-dummy-1234
-- 사진: public/dummy/listings/*.webp (출처·라이선스는 같은 폴더 CREDITS.md)
--
-- 전부 지우려면 (프로필·매물·사진·연락처까지 같이 지워집니다):
--   delete from auth.users where email like 'dummy%@motoground.test';
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. 테스트 계정 (가입 트리거가 profiles 를 자동으로 만듭니다)
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

-- 프로필 추가 정보 (내 바이크 · 활동 지역)
update public.profiles p
set bike_model = v.bike_model, region = v.region
from (values
  (1, '야마하 MT-07', '서울 마포구'), (2, '혼다 CBR650R', '경기 성남시'), (3, '혼다 PCX160', '부산 해운대구'),
  (4, '가와사키 닌자 400', '인천 연수구'), (5, '야마하 YZF-R3', '대전 유성구'), (6, '혼다 CB500X', '경기 수원시'),
  (7, '할리데이비슨 아이언 883', '대구 수성구'), (8, '스즈키 GSX-8S', '서울 송파구'), (9, '혼다 CRF300L', '강원 춘천시'),
  (10, 'BMW R nineT', '경기 고양시')
) as v (n, bike_model, region)
where p.id = ('00000000-0000-4000-a000-' || lpad(v.n::text, 12, '0'))::uuid;


-- ---------------------------------------------------------------------
-- 2. 매물 + 사진 + 연락처
-- ---------------------------------------------------------------------
drop table if exists dummy_listings;
create temp table dummy_listings (
  n int, seller int, title text, brand text, model text, genre text, model_year int, mileage_km int, cc int,
  price int, region text, description text, accident text, tuning text, status text, ago interval,
  images text[], contact text
);

insert into dummy_listings values
  (1, 1, '2021 MT-07 무사고 1.2만km 판매합니다', '야마하', 'MT-07', 'naked', 2021, 12400, 689,
    6800000, '서울 마포구',
    E'21년식 MT-07 블랙입니다.\n무사고, 엔진오일은 3천km마다 센터에서 교환했고 정비 기록 다 있습니다.\n리어 타이어 올해 봄에 교체했어요. 직거래 선호하고 서류 바로 가능합니다.',
    'none', null, 'selling', '3 hours', array['mt07-1', 'mt07-2'], '010-0000-0001 (문자 먼저 부탁드려요)'),

  (2, 2, 'CBR650R 22년식 출퇴근용 급매', '혼다', 'CBR650R', 'replica', 2022, 8100, 649,
    8900000, '경기 성남시',
    E'판교 출퇴근용으로만 탔습니다. 주행 8천km대.\n퀵시프터 장착되어 있고 순정 부품 같이 드려요.\n차 사게 돼서 급하게 정리합니다. 네고 조금 가능.',
    'none', '퀵시프터 장착', 'reserved', '6 hours', array['cbr650r-1', 'cbr650r-2'], 'open.kakao.com/o/dummy02'),

  (3, 3, 'PCX160 23년식 그레이 저주행', '혼다', 'PCX160', 'scooter', 2023, 4300, 157,
    3300000, '부산 해운대구',
    E'동네 마실용으로 가끔 탔습니다. 4천km대.\n스마트키 2개 다 있고 기스 거의 없어요.\n해운대 근처 직거래합니다.',
    'none', null, 'selling', '10 hours', array['pcx-1'], null),

  (4, 4, '닌자400 20년식 체인 교체 완료 입문용 추천', '가와사키', '닌자 400', 'replica', 2020, 15800, 399,
    5200000, '인천 연수구',
    E'입문용으로 2년 탔고 상위 기종으로 넘어가서 판매합니다.\n체인/스프라켓 지난달 교체, 브레이크 패드도 교체했습니다.\n제꿍 한 번 있어서 좌측 레버만 교체했어요.',
    'minor', '프레임 슬라이더', 'selling', '1 day 2 hours', array['ninja400-1', 'ninja400-2'], 'open.kakao.com/o/dummy04'),

  (5, 5, 'R3 22년식 깔끔한 매물', '야마하', 'YZF-R3', 'replica', 2022, 6900, 321,
    5600000, '대전 유성구',
    E'서킷 주행 없고 주말 투어만 다녔습니다.\n실내 보관해서 상태 좋습니다. 사진보다 실물이 더 깔끔해요.',
    'none', null, 'selling', '1 day 9 hours', array['r3-1', 'r3-2'], null),

  (6, 6, 'CB500X 투어링 세팅 탑케이스 포함', '혼다', 'CB500X', 'adventure', 2021, 21000, 471,
    6500000, '경기 수원시',
    E'전국 투어 많이 다닌 녀석입니다. 주행거리 대비 관리 잘했어요.\n탑케이스, 핸드가드, 하단 가드 장착. 하단 가드에 잔기스 있습니다.',
    'minor', '탑케이스 · 핸드가드 · 엔진가드', 'selling', '2 days', array['cb500x-1', 'cb500x-2'], '010-0000-0006'),

  (7, 7, '할리 아이언883 18년식 머플러 튜닝', '할리데이비슨', '아이언 883', 'cruiser', 2018, 18500, 883,
    9500000, '대구 수성구',
    E'머플러 교체해서 소리 좋습니다. 순정 머플러도 보관 중이라 같이 드려요.\n배터리 올해 교체. 대구 직거래만 합니다.',
    'none', '머플러 교체', 'selling', '2 days 7 hours', array['iron883-1', 'iron883-2'], 'open.kakao.com/o/dummy07'),

  (8, 8, 'GSX-8S 24년식 신차급 2천km', '스즈키', 'GSX-8S', 'naked', 2024, 2100, 776,
    10500000, '서울 송파구',
    E'출고 후 거의 못 탔습니다. 보증 기간 넉넉하게 남았어요.\n1천km 첫 점검 완료했습니다.',
    'none', null, 'selling', '3 days', array['gsx8s-1'], '010-0000-0008'),

  (9, 9, 'CRF300L 임도용 오프로드 타이어', '혼다', 'CRF300L', 'offroad', 2022, 9800, 286,
    5800000, '강원 춘천시',
    E'임도 위주로 탔습니다. 오프로드 타이어로 교체되어 있고 순정 타이어도 드려요.\n스키드플레이트 장착. 흙 묻은 거 세차해서 드립니다.',
    'none', '스키드플레이트 · 오프로드 타이어', 'selling', '3 days 5 hours', array['crf300l-1', 'crf300l-2'], null),

  (10, 10, 'BMW R nineT 19년식 개인 소장용', 'BMW', 'R nineT', 'classic', 2019, 24000, 1170,
    15500000, '경기 고양시',
    E'주말에만 탄 개인 소장용입니다. 센터 정비 이력 전부 있습니다.\n좌측 실린더 커버에 경미한 접촉 흔적 있어요(사진 참고).',
    'minor', null, 'sold', '4 days', array['rninet-1', 'rninet-2'], null),

  (11, 1, 'KTM 390 듀크 22년식 오렌지', 'KTM', '390 듀크', 'naked', 2022, 7400, 373,
    5200000, '서울 마포구',
    E'세컨 바이크로 타던 거라 주행 짧습니다.\n체인 관리 꾸준히 했고 타이어 상태 좋아요. MT-07 같이 정리합니다.',
    'none', null, 'selling', '4 days 6 hours', array['duke390-1', 'duke390-2'], '010-0000-0001 (문자 먼저 부탁드려요)'),

  (12, 2, '트레이서9 GT 23년식 사이드백 포함', '야마하', '트레이서 9 GT', 'tourer', 2023, 5200, 889,
    14500000, '경기 성남시',
    E'투어용으로 샀는데 생각보다 못 타서 판매합니다.\n순정 사이드백, 열선 그립, 크루즈 컨트롤 다 들어있는 GT 모델입니다.',
    'none', null, 'selling', '5 days', array['tracer9-1'], 'open.kakao.com/o/dummy02'),

  (13, 3, 'NMAX 125 21년식 배달용으로 쓰던 거', '야마하', 'NMAX 125', 'scooter', 2021, 17000, 125,
    2300000, '부산 해운대구',
    E'배달용으로 1년 쓰다가 판매합니다. 엔진 상태 좋고 시동 잘 걸려요.\n외관에 잔기스 있습니다. 가격 저렴하게 내놨어요.',
    'minor', null, 'selling', '5 days 12 hours', array['nmax-1'], null),

  (14, 8, '트라이엄프 본네빌 T120 순정 상태', '트라이엄프', '본네빌 T120', 'classic', 2020, 11000, 1200,
    12800000, '서울 송파구',
    E'튜닝 없이 순정 그대로입니다. 클래식 감성 좋아하시는 분께 추천드려요.\nGSX-8S 사면서 정리합니다.',
    'none', null, 'reserved', '6 days', array['t120-1'], '010-0000-0008');

with inserted as (
  insert into public.listings (
    seller_id, title, brand, model, genre, model_year, mileage_km, displacement_cc,
    price, region, description, accident, tuning, status, view_count, created_at
  )
  select
    ('00000000-0000-4000-a000-' || lpad(seller::text, 12, '0'))::uuid,
    title, brand, model, genre, model_year, mileage_km, cc,
    price, region, description, accident, tuning, status,
    (random() * 300)::int + 20,
    now() - ago
  from dummy_listings
  order by n
  returning id, title, seller_id
),
imgs as (
  insert into public.listing_images (listing_id, path, sort_order)
  select i.id, '/dummy/listings/' || img.name || '.webp', img.ord - 1
  from inserted i
  join dummy_listings d on d.title = i.title
  cross join lateral unnest(d.images) with ordinality as img (name, ord)
  returning listing_id
)
insert into public.listing_contacts (listing_id, contact)
select i.id, d.contact
from inserted i
join dummy_listings d on d.title = i.title
where d.contact is not null;

drop table if exists dummy_listings;
