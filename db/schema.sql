-- ໂຄງສ້າງຖານຂໍ້ມູນ ລະບົບຈັດການອາພາດເມັນ (SQLite / Turso)
-- ສ້າງດ້ວຍ: ໜ້າ database.html ຫຼື `turso db shell <db> < db/schema.sql`

CREATE TABLE IF NOT EXISTS rooms (
  id          TEXT PRIMARY KEY,
  floor       INTEGER NOT NULL DEFAULT 1,
  room_type   TEXT    NOT NULL DEFAULT '1 ຫ້ອງນອນ',
  rent        INTEGER NOT NULL DEFAULT 0,
  status      TEXT    NOT NULL DEFAULT 'vacant',
  tenant      TEXT,
  phone       TEXT,
  meter_elec  INTEGER NOT NULL DEFAULT 0,
  meter_water INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tenants (
  room     TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  phone    TEXT,
  contract TEXT,
  move_in  TEXT,
  people   INTEGER NOT NULL DEFAULT 1,
  deposit  INTEGER NOT NULL DEFAULT 0,
  rent     INTEGER NOT NULL DEFAULT 0,
  stay_status TEXT NOT NULL DEFAULT 'resident'
);

CREATE TABLE IF NOT EXISTS invoices (
  id        TEXT PRIMARY KEY,
  year      INTEGER NOT NULL,
  month     INTEGER NOT NULL,
  room      TEXT    NOT NULL,
  tenant    TEXT,
  kwh       INTEGER NOT NULL DEFAULT 0,
  m3        INTEGER NOT NULL DEFAULT 0,
  rent      INTEGER NOT NULL DEFAULT 0,
  service   INTEGER NOT NULL DEFAULT 0,
  other_fee INTEGER NOT NULL DEFAULT 0,
  paid      INTEGER NOT NULL DEFAULT 0,
  due       TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices (year, month);
CREATE INDEX IF NOT EXISTS idx_invoices_room ON invoices (room);

-- ເກັບ revision ສຳລັບກວດການຂຽນທັບຈາກຫຼາຍໜ້າຕ່າງ
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- ວຽກສ້ອມແປງ ຕາມຫ້ອງພັກ
CREATE TABLE IF NOT EXISTS repairs (
  id       TEXT PRIMARY KEY,
  room     TEXT    NOT NULL,
  title    TEXT    NOT NULL,
  category TEXT    NOT NULL DEFAULT 'other',
  priority TEXT    NOT NULL DEFAULT 'normal',
  status   TEXT    NOT NULL DEFAULT 'open',
  assignee TEXT,
  phone    TEXT,
  cost     INTEGER NOT NULL DEFAULT 0,
  reported TEXT,
  due      TEXT,
  done     TEXT,
  note     TEXT
);

CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs (status);
