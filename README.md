# ລະບົບຈັດການອາພາດເມັນ (ທີມສີຟ້າ)

ເວັບຈັດການອາພາດເມັນ ພາສາລາວ ອອກແບບສຳລັບ browser ເດສທັອບ.

- **UI:** React 19 + Vite + TypeScript + Mantine 8 (ດີໄຊລ໌ຂາວ-ຟ້າ), Recharts ຜ່ານ `@mantine/charts`
- **ຂໍ້ມູນ:** Supabase (PostgreSQL, RPC `apt_load` / `apt_save`) → `/api/state` (SQLite, `server.py`) → localStorage
- **ການເຂົ້າສູ່ລະບົບ:** ເລືອກຜູ້ໃຊ້ + PIN, ສິດແຍກຕາມໜ້າ (ເບິ່ງ / ແກ້ໄຂ / ລຶບ)

## ໂຄງສ້າງ

```
web/                 ແອັບ React (Vite root, build → web/dist)
  src/pages/         ໜ້າຕ່າງໆ: Overview, Meter, Rooms, Tenants, Invoices,
                     InvoicePrint, BillCheck, Reports, Repairs, Settings,
                     Users, Activity, Database, Login
  src/data/          ຊັ້ນຂໍ້ມູນ: types, seed, storage (Supabase/API/local), store (Context)
  src/lib/           ສູດຄິດໄລ່ (compute), ການຈັດຮູບແບບ (format), ເມນູ (nav), ການແກ້ຂໍ້ມູນ (dataOps)
  src/components/    AppShell, MonthSwitcher, BillPaper, StatCard, PageHeader
  public/db.config.js  ຄ່າ Supabase ທີ່ຕິດໄປກັບ build (ຖ້າບໍ່ຕັ້ງໃນໜ້າ Database)
server.py            ເສີບ web/dist (ຖ້າມີ) ຫຼື ໜ້າ HTML ເກົ່າ + API SQLite
data/apartment.db    ຖານຂໍ້ມູນ SQLite (gitignored)
db/schema.sql         ໂຄງສ້າງຕາຕະລາງ
```

ໜ້າ HTML ເກົ່າ (`index.html`, `invoices.html`, `assets/styles.css`, `deploy/`, …) ຍັງຢູ່ໃນ repo
ເພື່ອອ້າງອີງ ແຕ່ **ບໍ່ຖືກ deploy ແລ້ວ** — GitHub Pages ເຜີຍແຜ່ `web/dist` ເທົ່ານັ້ນ.

## ການເປີດໃຊ້ (ພັດທະນາ)

```bash
npm --prefix web install     # ຕິດຕັ້ງ dependencies ຄັ້ງດຽວ

npm run dev:api              # ເທີມິນານ 1: API SQLite ທີ່ http://127.0.0.1:4173
npm run dev                  # ເທີມິນານ 2: Vite ທີ່ http://127.0.0.1:5173 (proxy /api → 4173)
```

ຖ້າບໍ່ຮັບ API, ແອັບຈະໃຊ້ cache ໃນ localStorage ຫຼືຂໍ້ມູນຕົວຢ່າງ.

## Build ແລະ ເປີດແບບ production ໃນເຄື່ອງ

```bash
npm run build                          # → web/dist (base /Apartment/)
python server.py                       # ເສີບ web/dist + API ທີ່ http://127.0.0.1:4173
# ຫຼື
npm run start                          # build ແລ້ວເປີດ server.py
npm run preview                        # Vite preview ທີ່ http://127.0.0.1:4174/Apartment/
```

## ການເຜີຍແຜ່

Push ຂຶ້ນ `main` → GitHub Actions (`.github/workflows/pages.yml`) ຈະ:

1. `npm ci --prefix web`
2. `npm run build --prefix web`
3. ອັບໂຫຼດ `web/dist` ຂຶ້ນ GitHub Pages

Live: <https://amasvnv.github.io/Apartment/>

## ຖານຂໍ້ມູນ

1. **Supabase** — ຖ້າມີ Project URL + anon key (ໜ້າ **ຖານຂໍ້ມູນ** ຫຼື `web/public/db.config.js`) ມີສິດກ່ອນໝູ່
2. **SQLite** — `/api/state` ຈາກ `server.py` (ໃຊ້ເມື່ອບໍ່ຕັ້ງ Supabase ແລະ ມີເຊີບເວີ)
3. **localStorage** — ເມື່ອເປີດແບບໄຟລ໌ສະຖິຕິ ຫຼື API ໃຊ້ບໍ່ໄດ້

ຕາຕະລາງ Supabase ເປີດ RLS ແລະ ເຂົ້າເຖິງຜ່ານຟັງຊັນ RPC ເທົ່ານັ້ນ — ໃຊ້ **anon key** ເທົ່ານັ້ນ
(ຫ້າມໃຊ້ `service_role` key ໃນເບົາຣ໌ເຊີ). ຂໍ້ມູນການເຊື່ອມຕໍ່ຖືກເກັບໃນ localStorage ຂອງ browser ນັ້ນ.

ການຍ້າຍຂໍ້ມູນຈາກ SQLite ຂຶ້ນ Supabase ຄັ້ງດຽວ:

```bash
set SUPABASE_URL=https://xxxxxxx.supabase.co
set SUPABASE_KEY=<anon key>
python tools/migrate_to_supabase.py --yes
```

## ໜ້າຕ່າງໆ (routes ໃນ `#/`)

| Route | ໜ້າ |
| --- | --- |
| `#/` | ພາບລວມ |
| `#/meter` | ຈົດມິເຕີ |
| `#/rooms` | ຫ້ອງພັກ |
| `#/tenants` | ຜູ້ເຊົ່າ |
| `#/invoices` | ໃບບີນເກັບເງິນ (+ `#/invoices/<ເລກທີ>/print` ພິມ A5) |
| `#/reports` | ລາຍງານ |
| `#/repairs` | ສ້ອມແປງ |
| `#/activity` | ການເຄື່ອນໄຫວ |
| `#/users` | ຜູ້ໃຊ້ |
| `#/settings` | ຕັ້ງຄ່າອັດຕາ |
| `#/database` | ເຊື່ອມຕໍ່ຖານຂໍ້ມູນ |
| `#/bill-check` | ກວດເບິ່ງບີນ (ສາທາລະນະ, ບໍ່ຕ້ອງ login) |

ລິ້ງເກົ່າ `bill-check.html?room=101` ຈະ redirect ໄປ `index.html#/bill-check?room=101`.
