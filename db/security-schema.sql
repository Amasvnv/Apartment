-- ຕາຕະລາງຄວາມປອດໄພສຳລັບ Edge Function apt-api — Supabase (PostgreSQL)
-- ວິທີໃຊ້: Supabase → SQL Editor → ວາງໄຟລ໌ນີ້ທັງໝົດ → Run
-- ຮັບປະກັນວ່າ idempotent: ສາມາດ run ຊ້ຳໄດ້ບໍ່ເສຍຫາຍ
--
-- ໝາຍເຫດສຳຄັນ:
--   * ໄຟລ໌ນີ້ບໍ່ revoke ສິດຂອງ anon ໃນຟັງຊັນເກົ່າ (apt_load / apt_save / apt_*).
--     ການ revoke ແຍກໄວ້ໃນ db/revoke-anon.sql ແລະ ຍັງບໍ່ໄດ້ run.
--   * ຟັງຊັນໃໝ່ apt_public_bill ຖືກລັອກໃຫ້ເອີ້ນໄດ້ຈາກ service_role ເທົ່ານັ້ນ
--     (Edge Function ເອີ້ນແທນ; browser ເອີ້ນກົງບໍ່ໄດ້).
--   * PIN ບໍ່ເກັບແບບດິບ: ເກັບເປັນ pbkdf2$<iterations>$<salt-b64>$<hash-b64>
--     ຄິດໄລ່ຢູ່ Edge Function (PBKDF2-SHA256 100,000 ຮອບ).

-- ---------------------------------------------------------------
-- ຜູ້ໃຊ້ລະບົບ (ແທນ settings.users[].pin)
-- ---------------------------------------------------------------
create table if not exists public.app_users (
  id          text primary key,
  name        text not null default '',
  role        text not null default 'staff',
  perms       jsonb not null default '{}'::jsonb,
  active      boolean not null default true,
  pin_hash    text not null,
  must_rotate boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- session token (ເກັບສະເພາະ hash; token ດິບຢູ່ browser ຂອງຜູ້ໃຊ້)
-- ---------------------------------------------------------------
create table if not exists public.app_sessions (
  token_hash text primary key,
  user_id    text not null references public.app_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_ip text
);
create index if not exists idx_app_sessions_expiry on public.app_sessions (expires_at);
create index if not exists idx_app_sessions_user on public.app_sessions (user_id);

-- ---------------------------------------------------------------
-- ບັນທຶກການພະຍາຍາມ (rate limit ຝ່າຍ server)
--   action: 'login' | 'public_bill'
-- ---------------------------------------------------------------
create table if not exists public.auth_attempts (
  id      bigserial primary key,
  action  text not null default 'login',
  user_id text,
  ip      text,
  ok      boolean not null default false,
  at      timestamptz not null default now()
);
create index if not exists idx_auth_attempts_login on public.auth_attempts (action, user_id, at desc);
create index if not exists idx_auth_attempts_ip on public.auth_attempts (action, ip, at desc);

-- ---------------------------------------------------------------
-- RLS: ເປີດ ແລະ ບໍ່ມີ policy ໃຫ້ anon/authenticated — service_role ຜ່ານໄດ້ຢ່າງດຽວ
-- ---------------------------------------------------------------
alter table public.app_users     enable row level security;
alter table public.app_sessions  enable row level security;
alter table public.auth_attempts enable row level security;

revoke all on table public.app_users     from anon, authenticated;
revoke all on table public.app_sessions  from anon, authenticated;
revoke all on table public.auth_attempts from anon, authenticated;
revoke all on sequence public.auth_attempts_id_seq from anon, authenticated;

-- Edge Function (service_role) ເທົ່ານັ້ນທີ່ອ່ານ/ຂຽນຕາຕະລະເຫຼົ່ານີ້ໄດ້
grant all on table public.app_users, public.app_sessions, public.auth_attempts to service_role;
grant all on sequence public.auth_attempts_id_seq to service_role;

-- ---------------------------------------------------------------
-- ໃບບີນສຳລັບໜ້າສາທາລະນະ (QR) — ຄືນສະເພາະຂໍ້ມູນທີ່ຈຳເປັນຕໍ່ການສະແດງໃບບີນ
--   ບໍ່ມີເບີໂທ, ບໍ່ມີຊື່ຜູ້ເຊົ່າຫ້ອງອື່ນ, ບໍ່ມີ users/activity/tenantsByMonth/meterReadings
--   settings ເປັນ "whitelist" ບໍ່ແມ່ນການລຶບບາງ key ອອກ — key ໃໝ່ໃນອະນາຄົດຈະບໍ່ຮົ່ວໂດຍອັດຕະໂນມັດ
-- ---------------------------------------------------------------
create or replace function public.apt_public_bill(p_room text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with target as (
    select nullif(btrim(p_room), '') as room_id
  ),
  latest as (
    select i.*
    from public.invoices i, target t
    where i.room = t.room_id
    order by i.year desc, i.month desc, i.id desc
    limit 1
  )
  select jsonb_build_object(
    'found', exists (select 1 from latest),
    'invoice', (
      select jsonb_build_object(
        'id', id, 'year', year, 'month', month, 'room', room, 'tenant', tenant,
        'kwh', kwh, 'm3', m3, 'rent', rent, 'service', service,
        'other', other_fee, 'paid', paid, 'due', due
      )
      from latest
    ),
    -- ໃບບີນຂອງຫ້ອງນີ້ເທົ່ານັ້ນ (ໃຊ້ຄິດຍອດຄ້າງ)
    'invoices', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', i.id, 'year', i.year, 'month', i.month, 'room', i.room, 'tenant', i.tenant,
        'kwh', i.kwh, 'm3', i.m3, 'rent', i.rent, 'service', i.service,
        'other', i.other_fee, 'paid', i.paid, 'due', i.due
      ) order by i.year desc, i.month desc), '[]'::jsonb)
      from public.invoices i, target t
      where i.room = t.room_id
    ),
    'room', (
      select jsonb_build_object('id', r.id, 'room_type', r.room_type, 'floor', r.floor)
      from public.rooms r, target t
      where r.id = t.room_id
    ),
    'tenant_name', (
      select tn.name from public.tenants tn, target t where tn.room = t.room_id limit 1
    ),
    -- ຈຳນວນຄົນ ແລະ ສະຖານະຢູ່ ຂອງແຕ່ລະຫ້ອງ — ຕ້ອງການສຳລັບແບ່ງຄ່ານ້ຳ/ຂີ້ເຫຍື້ອ
    -- ບໍ່ມີຊື່ ແລະ ເບີໂທ
    'tenants', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'room', room, 'people', people, 'stay_status', stay_status
      ) order by room), '[]'::jsonb)
      from public.tenants
    ),
    'repairs', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id, 'room', r.room, 'title', r.title, 'status', r.status, 'reported', r.reported
      ) order by r.reported desc), '[]'::jsonb)
      from public.repairs r, target t
      where r.room = t.room_id and r.status <> 'cancelled'
    ),
    'settings', (
      select jsonb_build_object(
        'name', s->'name',
        'currency', s->'currency',
        'rent', s->'rent',
        'electricRate', s->'electricRate',
        'waterRate', s->'waterRate',
        'waterTotal', s->'waterTotal',
        'serviceFee', s->'serviceFee',
        'trashFee', s->'trashFee',
        'trashTotal', s->'trashTotal',
        'rentByMonth', s->'rentByMonth',
        'ratesByMonth', s->'ratesByMonth',
        'extraFeesByMonth', s->'extraFeesByMonth',
        'monthNotes', s->'monthNotes',
        'monthNotes2', s->'monthNotes2',
        'current', s->'current'
      )
      from (select value::jsonb as s from public.meta where key = 'settings') m
    ),
    'view_month', (select value::jsonb from public.meta where key = 'viewMonth')
  );
$$;

-- ລັອກຟັງຊັນໃໝ່ນີ້: ໃຫ້ service_role ເທົ່ານັ້ນ
revoke all on function public.apt_public_bill(text) from public, anon, authenticated;
grant execute on function public.apt_public_bill(text) to service_role;

-- ---------------------------------------------------------------
-- ເຊັກໄວ້ຫຼັງ run
-- ---------------------------------------------------------------
-- select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' and tablename in ('app_users','app_sessions','auth_attempts');
-- select has_function_privilege('anon', 'public.apt_public_bill(text)', 'execute');  -- ຕ້ອງເປັນ false
