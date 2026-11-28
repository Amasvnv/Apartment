# Edge Function `apt-api`

ປະຕູດຽວສຳລັບອ່ານ/ຂຽນຂໍ້ມູນອາພາດເມັນ. ຖື `service_role` ຢູ່ຝ່າຍ server ເທົ່ານັ້ນ ແລະ
ບໍ່ສົ່ງ PIN ຫຼື `service_role` ໄປ browser.

> ສະຖານະ: **ຂຽນແລ້ວ ແຕ່ຍັງບໍ່ deploy** — ຍັງບໍ່ run SQL, ຍັງບໍ່ revoke ສິດ anon.

## ໄຟລ໌ທີ່ກ່ຽວຂ້ອງ

| ໄຟລ໌ | ໜ້າທີ່ |
| --- | --- |
| `db/security-schema.sql` | ຕາຕະລະ `app_users`, `app_sessions`, `auth_attempts` + ຟັງຊັນ `apt_public_bill` (service_role ເທົ່ານັ້ນ) |
| `db/revoke-anon.sql` | ຄຳສັ່ງ revoke (comment ໄວ້ທັງໝົດ — ຍັງບໍ່ run) |
| `supabase/functions/apt-api/index.ts` | ຟັງຊັນນີ້ |

## Actions

| action | body | ຜົນ |
| --- | --- | --- |
| `login` | `{ userId, pin }` | `{ token, expiresAt, user }` — ຜິດ 5 ຄັ້ງ/5 ນາທີ ຫຼື 20 ຄັ້ງ/IP/ຊົ່ວໂມງ → 429 |
| `logout` | `{ token }` | ລຶບ session |
| `load` | `{ token }` | ຂໍ້ມູນທັງໝົດ ແບບ `apt_load` ແຕ່ **users ບໍ່ມີ pin** |
| `save` | `{ token, payload, expectedRev }` | ບັນທຶກ + ຊິງຄ໌ `settings.users` ລົງ `app_users`; ຂັດແຍ່ງ rev → 409 `{ error: "conflict", rev }` |
| `set_pin` | `{ token, userId, pin }` | ປ່ຽນ PIN (ໂຕເອງ ຫຼື ຜູ້ຈັດການ) — ເກັບເປັນ PBKDF2 |
| `set_view_month` | `{ token, year, month }` | ຕັ້ງເດືອນຮ່ວມ |
| `public_bill` | `{ room }` | 60 ຄັ້ງ/10 ນາທີ/IP; ຄືນສະເພາະໃບບີນ/ວຽກຊ່ອມ/ອັດຕາ ຂອງຫ້ອງນັ້ນ + ຈຳນວນຄົນຕໍ່ຫ້ອງ (ບໍ່ມີຊື່/ເບີໂທ) |
| `bootstrap_users` | header `x-bootstrap-secret` | ຍ້າຍ PIN ຈາກ `settings.users` ໄປ `app_users` ເປັນ hash ແລ້ວລຶບ pin ອອກຈາກ settings |

ທຸກ action ຮັບ CORS ສະເພາະ origin ໃນ `APP_ORIGIN` (ແລະ `localhost`/`127.0.0.1` ສຳລັບ dev).

## ຂັ້ນຕອນ deploy (ຍັງບໍ່ໄດ້ເຮັດ)

1. Run `db/security-schema.sql` ໃນ Supabase → SQL Editor.
2. ຕັ້ງ secret (ບໍ່ໃສ່ໃນໄຟລ໌, ບໍ່ commit):
   ```bash
   supabase secrets set APP_ORIGIN="https://amasvnv.github.io,http://localhost:5173" \
                          BOOTSTRAP_SECRET="<ສຸ່ມ 32+ ໂຕ>"
   ```
   `SUPABASE_URL` ແລະ `SUPABASE_SERVICE_ROLE_KEY` Supabase ໃສ່ໃຫ້ເອງ.
3. Deploy ແບບບໍ່ໃຫ້ Supabase ກວດ JWT ຂອງຕົນເອງ (ເພາະໃຊ້ token ຂອງ `apt-api`):
   ```bash
   supabase functions deploy apt-api --no-verify-jwt
   ```
4. ຍ້າຍ PIN ຄັ້ງດຽວ (ຫຼັງ backup ແລ້ວ):
   ```bash
   curl -sS -X POST "$SUPABASE_URL/functions/v1/apt-api" \
     -H "Origin: https://amasvnv.github.io" \
     -H "x-bootstrap-secret: $BOOTSTRAP_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"action":"bootstrap_users"}'
   ```
   ຫຼັງສຳເລັດ: ລຶບ secret `BOOTSTRAP_SECRET` ອອກ ເພື່ອປິດ action ນີ້.
5. ແກ້ client (`web/src/data/storage.ts`, `auth.tsx`, `BillCheck.tsx`) ໃຫ້ເອີ້ນຟັງຊັນນີ້.
6. ກວດ checklist ໃນແຜນ → ຈຶ່ງ uncomment ແລ້ວ run `db/revoke-anon.sql`.

## ການແກ້ PIN / ຜູ້ໃຊ້ ໃນໜ້າ Users

`save` ຈັດການ `settings.users` ແລະ `app_users` ໃຫ້ກົງກັນ — **ບໍ່ຕັດ PIN ຖິ້ມງຽບໆ**:

| ການກະທຳໃນໜ້າ Users | ຜົນຝ່າຍ server |
| --- | --- |
| ໃສ່ PIN ໃໝ່ໃຫ້ຜູ້ໃຊ້ (4–6 ໂຕເລກ) | hash ລົງ `app_users.pin_hash` + ຕັດ session ເກົ່າຂອງຜູ້ນັ້ນ |
| ປ່ຽນຊື່ / ບົດບາດ / ສິດ / ປິດ-ເປີດ | ຊິງຄ໌ລົງ `app_users` ທັນທີ (ສິດມີຜົນກັບ request ຕໍ່ໄປ) |
| ລຶບຜູ້ໃຊ້ອອກຈາກລາຍຊື່ | ຕັ້ງ `active = false` (ບໍ່ລຶບແຖວ) + ຕັດ session |
| ສ້າງຜູ້ໃຊ້ໃໝ່ ໂດຍບໍ່ໃສ່ PIN | 400 ພ້ອມຂໍ້ຄວາມຊັດເຈນ (ບໍ່ໃຫ້ສ້າງຜູ້ໃຊ້ທີ່ login ບໍ່ໄດ້) |
| PIN ຜິດຮູບແບບ / ຊ້ຳ id | 400 ກ່ອນຂຽນຫຍັງລົງຖານ |
| ລຶບ ຫຼື ປິດ ຕົນເອງ / ບໍ່ເຫຼືອຜູ້ຈັດການ | 400 (ກັນລັອກຕົນເອງອອກ) |
| ຜູ້ທີ່ບໍ່ແມ່ນຜູ້ຈັດການ ປ່ຽນ PIN ຄົນອື່ນ / ປ່ຽນລາຍຊື່ | 403 |

client ໄດ້ `hasPin` ແທນຄ່າ `pin` ໃນທຸກ response — UI ຄວນສະແດງ “PIN ••••” ເມື່ອ `hasPin: true`
ແລະ ສົ່ງ `pin` ສະເພາະຕອນຜູ້ໃຊ້ພິມ PIN ໃໝ່ (ບໍ່ສົ່ງ `pin` ເມື່ອບໍ່ປ່ຽນ).

`public_bill` ໃຊ້ **whitelist** ຂອງ settings (name, currency, ອັດຕາ, ຍອດລວມ, ໝາຍເຫດ) — ບໍ່ສົ່ງ
`users`, `activity`, `tenantsByMonth` ຫຼື `meterReadings`; key ໃໝ່ທີ່ເພີ່ມພາຍຫຼັງຈະບໍ່ຮົ່ວໂດຍອັດຕະໂນມັດ.

ຖ້າຍັງບໍ່ run `bootstrap_users` (app_users ຫວ່າງ), `login` / `load` / `save` ຈະຕອບ **503**
ແທນການເຮັດວຽກແບບເກົ່າ — ເພື່ອບໍ່ໃຫ້ PIN ດິບຫາຍ ຫຼື ຖືກຕັດຖິ້ມ.

## ຂໍ້ຄວນລະວັງ

- `save` ຍັງຮັບ payload ທັງກ້ອນ (ຄືເກົ່າ `apt_save`). ການກວດສິດລາຍໜ້າ (perms) ຍັງເປັນຂອງ client
  — server ກັນພຽງ viewer ແລະ ການປ່ຽນລາຍຊື່ຜູ້ໃຊ້ (ຜູ້ຈັດການເທົ່ານັ້ນ).
- PIN ດິບຍັງຢູ່ໃນ `settings.users` ຈົນກວ່າຈະ run `bootstrap_users`; ຫຼັງຈາກນັ້ນຈະຖືກລຶບ.
- `token` ມີອາຍຸ 12 ຊົ່ວໂມງ; ເກັບຝ່າຍ client ໃນ `sessionStorage` ເທົ່ານັ້ນ.
- ບໍ່ log token ຫຼື PIN; log ພຽງ action/status/ຂໍ້ຄວາມຜິດພາດ.
