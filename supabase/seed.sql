-- =====================================================================
-- MOTOGROUND — 화면 확인용 예시 게시글 (선택)
-- schema.sql 실행 후, 게시판에 글이 보이는지 확인하고 싶을 때만 실행하세요.
-- 작성자 없이(author_id = null) 들어가며, 화면에는 '알 수 없음'으로 표시됩니다.
-- 지우려면: delete from public.posts where title like '[예시]%' or title like '[공지]%';
-- =====================================================================

insert into public.posts (board_slug, title, content, is_pinned, view_count, created_at) values
  ('notice', '[공지] 모토그라운드 커뮤니티 이용 규칙 안내', '[예시 본문] 커뮤니티 이용 규칙이 들어갈 자리입니다.', true, 0, now() - interval '12 days'),
  ('notice', '[공지] 라이딩 리워드 오픈 이벤트 안내',       '[예시 본문] 이벤트 안내가 들어갈 자리입니다.',     true, 0, now() - interval '15 days'),
  ('tour',   '[예시] 주말 동해안 1박 2일 투어 코스 공유합니다',     '[예시 본문]', false, 1820, now() - interval '1 hours'),
  ('qna',    '[예시] 체인 장력 셀프 조정, 어느 정도가 적당할까요?', '[예시 본문]', false, 1504, now() - interval '3 hours'),
  ('free',   '[예시] 첫 바이크로 네이키드 vs 레플리카 고민 중입니다', '[예시 본문]', false, 1377, now() - interval '5 hours'),
  ('meetup', '[예시] 이번 주 토요일 북악 스카이웨이 새벽 번개',     '[예시 본문]', false, 1120, now() - interval '1 days'),
  ('gear',   '[예시] 여름용 메쉬 자켓 실사용 후기 모음',            '[예시 본문]', false,  980, now() - interval '1 days 2 hours'),
  ('free',   '[예시] 비 오는 날 출퇴근 라이딩 팁 공유해요',          '[예시 본문]', false,  744, now() - interval '1 days 5 hours'),
  ('qna',    '[예시] 엔진오일 교환 주기, 주행거리 기준이 맞나요?',   '[예시 본문]', false,  691, now() - interval '2 days'),
  ('tour',   '[예시] 남해 독일마을 당일치기 코스 후기',              '[예시 본문]', false,  655, now() - interval '2 days 3 hours'),
  ('gear',   '[예시] 블루투스 인터콤 3종 비교해봤습니다',            '[예시 본문]', false,  603, now() - interval '2 days 6 hours'),
  ('meetup', '[예시] 경기 남부 평일 저녁 정기 모임 멤버 모집',       '[예시 본문]', false,  512, now() - interval '3 days'),
  ('free',   '[예시] 바이크 입문 1년 차 회고',                       '[예시 본문]', false,  488, now() - interval '3 days 4 hours');
