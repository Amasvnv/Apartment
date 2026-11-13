-- ໂຄງສ້າງຖານຂໍ້ມູນ ລະບົບຈັດການອາພາດເມັນ — Supabase (PostgreSQL)
-- ວິທີໃຊ້: ເປີດ Supabase → SQL Editor → ວາງໄຟລ໌ນີ້ທັງໝົດ → Run
-- ຮັບປະກັນວ່າ idempotent: ສາມາດ run ຊ້ຳໄດ້ບໍ່ເສຍຫາຍ

create table if not exists public.rooms (
  id          text primary key,
  floor       integer not null default 1,
  room_type   text    not null default '1 ຫ້ອງນອນ',
  rent        integer not null default 0,
  status      text    not null default 'vacant',
  tenant      text,
  phone       text,
  meter_elec  integer not null default 0,
  meter_water integer not null default 0
);

create table if not exists public.tenants (
  room        text primary key,
  name        text not null,
  phone       text,
  contract    text,
  move_in     text,
  people      integer not null default 1,
  deposit     integer not null default 0,
  rent        integer not null default 0,
  stay_status text not null default 'resident'
);

create table if not exists public.invoices (
  id        text primary key,
  year      integer not null,
  month     integer not null,
  room      text    not null,
  tenant    text,
  kwh       integer not null default 0,
  m3        integer not null default 0,
  rent      integer not null default 0,
  service   integer not null default 0,
  other_fee integer not null default 0,
  paid      integer not null default 0,
  due       text
);
create index if not exists idx_invoices_period on public.invoices (year, month);
create index if not exists idx_invoices_room on public.invoices (room);

create table if not exists public.repairs (
  id       text primary key,
  room     text not null,
  title    text not null,
  category text not null default 'other',
  priority text not null default 'normal',
  status   text not null default 'open',
  assignee text,
  phone    text,
  cost     integer not null default 0,
  reported text,
  due      text,
  done     text,
  note     text
);
create index if not exists idx_repairs_status on public.repairs (status);

create table if not exists public.meta (
  key   text primary key,
  value text
);

insert into public.meta (key, value) values ('rev', '0')
  on conflict (key) do nothing;

-- ---------------------------------------------------------------
-- ຄວາມປອດໄພ: ເປີດ RLS ແລະ ບໍ່ມີ policy ໃຫ້ anon ອ່ານ/ຂຽນຕາຕະລາງໂດຍກົງ
-- ການເຂົ້າເຖິງທັງໝົດເປັນຜ່ານຟັງຊັນ RPC ຂ້າງລຸ່ມເທົ່ານັ້ນ
-- ---------------------------------------------------------------
alter table public.rooms    enable row level security;
alter table public.tenants  enable row level security;
alter table public.invoices enable row level security;
alter table public.repairs  enable row level security;
alter table public.meta     enable row level security;

-- ---------------------------------------------------------------
-- RPC: ອ່ານສະຖານະທັງໝົດ
-- ---------------------------------------------------------------
create or replace function public.apt_load()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'rev', coalesce((select value::int from public.meta where key = 'rev'), 0),
    'rooms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'floor', floor, 'room_type', room_type, 'rent', rent,
        'status', status, 'tenant', tenant, 'phone', phone,
        'meter_elec', meter_elec, 'meter_water', meter_water
      ) order by id) from public.rooms
    ), '[]'::jsonb),
    'tenants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'room', room, 'name', name, 'phone', phone, 'contract', contract,
        'move_in', move_in, 'people', people, 'deposit', deposit,
        'rent', rent, 'stay_status', stay_status
      ) order by room) from public.tenants
    ), '[]'::jsonb),
    'invoices', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'year', year, 'month', month, 'room', room, 'tenant', tenant,
        'kwh', kwh, 'm3', m3, 'rent', rent, 'service', service,
        'other_fee', other_fee, 'paid', paid, 'due', due
      ) order by year, month, id) from public.invoices
    ), '[]'::jsonb),
    'repairs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'room', room, 'title', title, 'category', category,
        'priority', priority, 'status', status, 'assignee', assignee,
        'phone', phone, 'cost', cost, 'reported', reported, 'due', due,
        'done', done, 'note', note
      ) order by reported, id) from public.repairs
    ), '[]'::jsonb),
    'settings', (select value::jsonb from public.meta where key = 'settings'),
    'view_month', (select value::jsonb from public.meta where key = 'viewMonth')
  );
$$;

-- ---------------------------------------------------------------
-- RPC: ບັນທຶກສະຖານະທັງໝົດ (ແທນທີ່ທັງໝົດ, ໃນທຸລະກຳດຽວ)
--   payload  = { rooms:[], tenants:[], invoices:[], repairs:[], settings:{} }
--   expected_rev = rev ທີ່ເວັບກຳລັງເຫັນຢູ່ (null = ບໍ່ກວດ)
-- ຖ້າ rev ບໍ່ກົງ ຈະຄືນ {"error":"conflict","rev":<rev ໃໝ່>} ໂດຍບໍ່ຂຽນຫຍັງ
-- ---------------------------------------------------------------
create or replace function public.apt_save(payload jsonb, expected_rev integer default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_rev integer;
  new_rev integer;
begin
  select coalesce((select value::int from public.meta where key = 'rev'), 0) into cur_rev;

  if expected_rev is not null and expected_rev <> cur_rev then
    return jsonb_build_object('error', 'conflict', 'rev', cur_rev);
  end if;

  new_rev := cur_rev + 1;

  -- ໃຊ້ "where true" ເພື່ອໃຫ້ຜ່ານ pg-safeupdate ຂອງ Supabase (ບໍ່ຮັບ DELETE ທີ່ບໍ່ມີ WHERE)
  delete from public.rooms where true;
  delete from public.tenants where true;
  delete from public.invoices where true;
  delete from public.repairs where true;

  insert into public.rooms (id, floor, room_type, rent, status, tenant, phone, meter_elec, meter_water)
  select
    coalesce(nullif(x->>'id', ''), ''),
    coalesce((x->>'floor')::int, 1),
    coalesce(nullif(x->>'room_type', ''), '1 ຫ້ອງນອນ'),
    coalesce((x->>'rent')::int, 0),
    coalesce(nullif(x->>'status', ''), 'vacant'),
    nullif(x->>'tenant', ''),
    nullif(x->>'phone', ''),
    coalesce((x->>'meter_elec')::int, 0),
    coalesce((x->>'meter_water')::int, 0)
  from jsonb_array_elements(coalesce(payload->'rooms', '[]'::jsonb)) as x
  where coalesce(nullif(x->>'id', ''), '') <> '';

  insert into public.tenants (room, name, phone, contract, move_in, people, deposit, rent, stay_status)
  select
    coalesce(nullif(x->>'room', ''), ''),
    coalesce(nullif(x->>'name', ''), ''),
    nullif(x->>'phone', ''),
    nullif(x->>'contract', ''),
    nullif(x->>'move_in', ''),
    coalesce((x->>'people')::int, 1),
    coalesce((x->>'deposit')::int, 0),
    coalesce((x->>'rent')::int, 0),
    coalesce(nullif(x->>'stay_status', ''), 'resident')
  from jsonb_array_elements(coalesce(payload->'tenants', '[]'::jsonb)) as x
  where coalesce(nullif(x->>'room', ''), '') <> '';

  insert into public.invoices (id, year, month, room, tenant, kwh, m3, rent, service, other_fee, paid, due)
  select
    coalesce(nullif(x->>'id', ''), ''),
    coalesce((x->>'year')::int, 0),
    coalesce((x->>'month')::int, 0),
    coalesce(nullif(x->>'room', ''), ''),
    nullif(x->>'tenant', ''),
    coalesce((x->>'kwh')::int, 0),
    coalesce((x->>'m3')::int, 0),
    coalesce((x->>'rent')::int, 0),
    coalesce((x->>'service')::int, 0),
    coalesce((x->>'other_fee')::int, 0),
    coalesce((x->>'paid')::int, 0),
    nullif(x->>'due', '')
  from jsonb_array_elements(coalesce(payload->'invoices', '[]'::jsonb)) as x
  where coalesce(nullif(x->>'id', ''), '') <> '';

  insert into public.repairs (id, room, title, category, priority, status, assignee, phone, cost, reported, due, done, note)
  select
    coalesce(nullif(x->>'id', ''), ''),
    coalesce(nullif(x->>'room', ''), ''),
    coalesce(nullif(x->>'title', ''), ''),
    coalesce(nullif(x->>'category', ''), 'other'),
    coalesce(nullif(x->>'priority', ''), 'normal'),
    coalesce(nullif(x->>'status', ''), 'open'),
    nullif(x->>'assignee', ''),
    nullif(x->>'phone', ''),
    coalesce((x->>'cost')::int, 0),
    nullif(x->>'reported', ''),
    nullif(x->>'due', ''),
    nullif(x->>'done', ''),
    nullif(x->>'note', '')
  from jsonb_array_elements(coalesce(payload->'repairs', '[]'::jsonb)) as x
  where coalesce(nullif(x->>'id', ''), '') <> '';

  if payload ? 'settings' then
    insert into public.meta (key, value)
    values ('settings', (payload->'settings')::text)
    on conflict (key) do update set value = excluded.value;
  end if;

  insert into public.meta (key, value) values ('rev', new_rev::text)
    on conflict (key) do update set value = excluded.value;

  return jsonb_build_object(
    'ok', true,
    'rev', new_rev,
    'rooms', (select count(*) from public.rooms),
    'tenants', (select count(*) from public.tenants),
    'invoices', (select count(*) from public.invoices),
    'repairs', (select count(*) from public.repairs)
  );
end;
$$;

-- ---------------------------------------------------------------
-- RPC: ເດືອນທີ່ຈົດມິເຕີ (ໃຊ້ຮ່ວມກັນທຸກເຄື່ອງ)
-- ---------------------------------------------------------------
create or replace function public.apt_view_month()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select value::jsonb from public.meta where key = 'viewMonth'),
    '{"year":null,"month":null}'::jsonb
  );
$$;

create or replace function public.apt_set_view_month(p_year integer, p_month integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_year is null or p_month is null or p_year < 2026 or p_year > 2100 or p_month < 1 or p_month > 12 then
    raise exception 'ເດືອນ 1–12 ແລະ ປີ 2026–2100';
  end if;
  insert into public.meta (key, value)
  values ('viewMonth', jsonb_build_object('year', p_year, 'month', p_month)::text)
  on conflict (key) do update set value = excluded.value;
  return jsonb_build_object('ok', true, 'year', p_year, 'month', p_month);
end;
$$;

-- ໃຫ້ anon (key ທີ່ໃຊ້ໃນເວັບ) ເອີ້ນ RPC ໄດ້
grant execute on function public.apt_load() to anon, authenticated;
grant execute on function public.apt_save(jsonb, integer) to anon, authenticated;
grant execute on function public.apt_view_month() to anon, authenticated;
grant execute on function public.apt_set_view_month(integer, integer) to anon, authenticated;
