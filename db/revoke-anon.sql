-- ຕັດສິດ anon ອອກຈາກ RPC ແລະ ຕາຕະລາງ — Supabase (PostgreSQL)
--
-- ⚠ ຢ່າ run ໄຟລ໌ນີ້ດຽວນີ້.
-- ທຸກ statement ຖືກ comment ໄວ້ ເພື່ອບໍ່ໃຫ້ run ໂດຍບໍ່ຕັ້ງໃຈ.
-- ລຳດັບການຕັດປ່ຽນທີ່ຖືກຕ້ອງ:
--   1) run db/security-schema.sql
--   2) deploy Edge Function apt-api + ຕັ້ງ secret (APP_ORIGIN, BOOTSTRAP_SECRET)
--   3) ເອີ້ນ action bootstrap_users ຄັ້ງດຽວ ເພື່ອຍ້າຍ PIN ໄປ app_users (ເປັນ hash)
--   4) ແກ້ client ໃຫ້ເອີ້ນ Edge Function ແທນ PostgREST RPC
--   5) ກວດ checklist ໃນແຜນ (anon ຕ້ອງໄດ້ 401/403, ແອັບຍັງໃຊ້ໄດ້)
--   6) ຈຶ່ງ uncomment ແລ້ວ run ໄຟລ໌ນີ້
--
-- Rollback (ຖ້າມີບັນຫາຫຼັງ run):
--   grant execute on function public.apt_load() to anon, authenticated;
--   grant execute on function public.apt_save(jsonb, integer) to anon, authenticated;
--   grant execute on function public.apt_view_month() to anon, authenticated;
--   grant execute on function public.apt_set_view_month(integer, integer) to anon, authenticated;
--   grant select, insert, update, delete on all tables in schema public to anon, authenticated;

-- revoke execute on function public.apt_load()                           from anon, authenticated;
-- revoke execute on function public.apt_save(jsonb, integer)             from anon, authenticated;
-- revoke execute on function public.apt_view_month()                     from anon, authenticated;
-- revoke execute on function public.apt_set_view_month(integer, integer) from anon, authenticated;

-- revoke all on all tables    in schema public from anon, authenticated;
-- revoke all on all sequences in schema public from anon, authenticated;

-- alter default privileges in schema public revoke all on tables    from anon, authenticated;
-- alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- ຫຼັງ revoke ແລ້ວ ໃຫ້ກວດວ່າ service_role ຍັງໃຊ້ໄດ້ (Edge Function ໃຊ້ key ນີ້):
-- select has_function_privilege('service_role', 'public.apt_load()', 'execute');          -- ຕ້ອງເປັນ true
-- select has_function_privilege('service_role', 'public.apt_save(jsonb, integer)', 'execute'); -- ຕ້ອງເປັນ true
