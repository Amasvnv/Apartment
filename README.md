# ລະບົບຈັດການອາພາດເມັນ (ທີມສີຟ້າ)

ເວັບຈັດການອາພາດເມັນ 6 ໜ້າ ພາສາລາວ ອອກແບບສຳລັບ browser ເດັສທັອບ.
HTML/CSS/JS ລ້ວນໆ ບໍ່ຕ້ອງ build, ມີເຊີບເວີນ້ອຍໆ (Python) ສຳລັບຖານຂໍ້ມູນ SQLite.

## ການເປີດໃຊ້

```bash
python server.py          # ເປີດທີ່ http://127.0.0.1:4173/index.html
python server.py 8080     # ກຳນົດ port ເອງ
```

`server.py` ເຮັດ 2 ຢ່າງ: ເສີບໄຟລ໌ເວັບ ແລະ ໃຫ້ REST API ຂອງຖານຂໍ້ມູນ SQLite.

- ຖານຂໍ້ມູນ: `data/apartment.db` (ສ້າງອັດຕະໂນມັດຄັ້ງທຳອິດ ພ້ອມຂໍ້ມູນຕົວຢ່າງ)
- ໂຄງສ້າງຕາຕະລາງ: `db/schema.sql`
- API: `GET /api/state`, `PUT /api/state`, `GET /api/health`

ຂໍ້ມູນທັງໝົດ (ຫ້ອງ, ຜູ້ເຊົ່າ, ໃບບີນເກັບເງີນ) ຖືກບັນທຶກລົງ SQLite ທຸກຄັ້ງທີ່ແກ້ໄຂ.

## ໂໝດການເກັບຂໍ້ມູນ (assets/db.js)

1. **Supabase (PostgreSQL)** — ຖ້າຕັ້ງຄ່າ Project URL + anon key ໃນໜ້າ `database.html` (ມີສິດກ່ອນໝູ່)
2. **SQLite ຜ່ານ `server.py`** — ໃຊ້ອັດຕະໂນມັດເມື່ອຍັງບໍ່ຕັ້ງຄ່າ Supabase
3. **Turso (ຄລາວ)** — ຖ້າຕັ້ງຄ່າ URL/token ແບບ Turso
4. **ເບົາຣ໌ເຊີ (localStorage)** — ໃຊ້ເມື່ອເປີດແບບໄຟລ໌ສະຖິຕິ (ບໍ່ມີ API)

## ເຊື່ອມຕໍ່ Supabase (ຖານຂໍ້ມູນຈິງ)

1. ສ້າງ project ທີ່ [supabase.com](https://supabase.com) (Free tier ພຽງພໍ)
2. ເປີດ **SQL Editor** → ວາງໄຟລ໌ `db/supabase-schema.sql` ທັງໝົດ → **Run** (ສ້າງຕາຕະລາງ + ຟັງຊັນ `apt_load` / `apt_save` + RLS)
3. ເປີດ **Project Settings → API** ຄັດລອກ **Project URL** ແລະ **anon (publishable) key**
4. ເປີດໜ້າ `database.html` ວາງທັງສອງຄ່າ ແລ້ວກົດ “ບັນທຶກ ແລະ ເຊື່ອມຕໍ່”
5. ຖ້າມີຂໍ້ມູນຢູ່ SQLite ແລ້ວ ໃຫ້ຍ້າຍຄັ້ງດຽວ:

```bash
set SUPABASE_URL=https://xxxxxxx.supabase.co
set SUPABASE_KEY=<anon key>
python tools/migrate_to_supabase.py --yes
```

ຂໍ້ມູນການເຊື່ອມຕໍ່ຖືກເກັບໄວ້ໃນ `localStorage` ຂອງ browser ເຄື່ອງນັ້ນ (ຫຼື ຕັ້ງໃນ `assets/db.config.js`). ໃຊ້ **anon key ເທົ່ານັ້ນ** — ຢ່າວາງ `service_role` key ໃນເບົາຣ໌ເຊີ. ຕາຕະລາງເປີດ RLS ແລະ ເຂົ້າເຖິງໄດ້ຜ່ານຟັງຊັນ RPC ເທົ່ານັ້ນ ດັ່ງນັ້ນຢ່າເຜີຍແຜ່ໜ້າເວັບນີ້ສູ່ສາທາລະນະ.

## ໜ້າຕ່າງໆ

| ໄຟລ໌ | ໜ້າ |
| --- | --- |
| `index.html` | ພາບລວມ |
| `meter.html` | ຈົດມິເຕີ |
| `rooms.html` | ຫ້ອງພັກ |
| `tenants.html` | ຜູ້ເຊົ່າ |
| `invoices.html` | ໃບບີນເກັບເງີນ |
| `reports.html` | ລາຍງານ |
| `repairs.html` | ສ້ອມແປງ (ແຈ້ງຊ່ອມ, ຄວາມສຳຄັນ, ສະຖານະ, ຜູ້ຮັບຜິດຊອບ, ຄ່າໃຊ້ຈ່າຍ) |
| `settings.html` | ຕັ້ງຄ່າອັດຕາຄ່າບໍລິການ (ໄຟຟ້າ / ນ້ຳ / ຂີ້ເຫຍື້ອ / ຄ່າອື່ນໆ) |
| `database.html` | ຕັ້ງຄ່າຖານຂໍ້ມູນ |

> ອັດຕາຄ່າບໍລິການ ແລະ ເດືອນທີ່ຈົດມິເຕີ ຖືກເກັບໄວ້ໃນຕາຕະລາງ `meta` (key `settings`, `viewMonth`) ຂອງຖານຂໍ້ມູນດຽວກັນກັບຂໍ້ມູນອື່ນ (SQLite ຫຼື Supabase).
