-- Migration #12: Patch hashtags cho các country chưa có trong #11
-- AUSTRALIA, THỔ NHĨ KỲ không có trong DS ban đầu

UPDATE tours SET hashtags = ARRAY[
  '#dulichaustralia', '#australia', '#tourchauu',
  '#dulichtrongoai', '#sydney', '#melbourne', '#goldcoast'
] WHERE country = 'AUSTRALIA' AND (hashtags = '{}' OR hashtags = ARRAY['#dulichtrongoai', '#namngantravel', '#tourvietnam']);

UPDATE tours SET hashtags = ARRAY[
  '#dulichthonhiky', '#thonhiky', '#turkey', '#tourchauu',
  '#dulichtrongoai', '#istanbul', '#cappadocia', '#trungdong'
] WHERE country = 'THỔ NHĨ KỲ' AND (hashtags = '{}' OR hashtags = ARRAY['#dulichtrongoai', '#namngantravel', '#tourvietnam']);
