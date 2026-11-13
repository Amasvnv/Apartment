"""ຍ້າຍຂໍ້ມູນຈາກ SQLite ທ້ອງຖິ່ນ (data/apartment.db) ໄປ Supabase

ການໃຊ້ (PowerShell / cmd):
    set SUPABASE_URL=https://xxxxxxx.supabase.co
    set SUPABASE_KEY=<anon key>
    python tools/migrate_to_supabase.py --yes

ຫຼືສົ່ງຜ່ານ argument:
    python tools/migrate_to_supabase.py --url https://xxxx.supabase.co --key eyJ... --yes

- ອ່ານ SQLite ແບບ read-only (ບໍ່ແກ້ໄຟລ໌ data/apartment.db)
- ຂຽນລົງ Supabase ຜ່ານ RPC apt_save (ແທນທີ່ຂໍ້ມູນເກົ່າໃນ Supabase ທັງໝົດ)
- ຕ້ອງ run db/supabase-schema.sql ໃນ Supabase ກ່ອນ
"""

import argparse
import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, "data", "apartment.db")


def read_sqlite():
    if not os.path.exists(DB_PATH):
        raise SystemExit(f"ບໍ່ພົບຖານຂໍ້ມູນ: {DB_PATH}")
    uri = "file:" + DB_PATH.replace("\\", "/") + "?mode=ro"
    con = sqlite3.connect(uri, uri=True)
    con.row_factory = sqlite3.Row
    try:
        rooms = [dict(r) for r in con.execute("SELECT * FROM rooms ORDER BY id")]
        tenants = [dict(r) for r in con.execute("SELECT * FROM tenants ORDER BY room")]
        invoices = [dict(r) for r in con.execute("SELECT * FROM invoices ORDER BY year, month, id")]
        repairs = [dict(r) for r in con.execute("SELECT * FROM repairs ORDER BY reported, id")]
        settings = None
        row = con.execute("SELECT value FROM meta WHERE key = 'settings'").fetchone()
        if row and row["value"]:
            try:
                settings = json.loads(row["value"])
            except ValueError:
                settings = None
        view_month = None
        row = con.execute("SELECT value FROM meta WHERE key = 'viewMonth'").fetchone()
        if row and row["value"]:
            try:
                view_month = json.loads(row["value"])
            except ValueError:
                view_month = None
    finally:
        con.close()
    return {
        "rooms": rooms,
        "tenants": tenants,
        "invoices": invoices,
        "repairs": repairs,
        "settings": settings or {},
        "view_month": view_month,
    }


def payload_of(data):
    return {
        "rooms": [
            {
                "id": str(r.get("id")),
                "floor": int(r.get("floor") or 1),
                "room_type": r.get("room_type") or "1 ຫ້ອງນອນ",
                "rent": int(r.get("rent") or 0),
                "status": r.get("status") or "vacant",
                "tenant": r.get("tenant"),
                "phone": r.get("phone"),
                "meter_elec": int(r.get("meter_elec") or 0),
                "meter_water": int(r.get("meter_water") or 0),
            }
            for r in data["rooms"]
        ],
        "tenants": [
            {
                "room": str(t.get("room")),
                "name": t.get("name") or "",
                "phone": t.get("phone"),
                "contract": t.get("contract"),
                "move_in": t.get("move_in"),
                "people": int(t.get("people") or 1),
                "deposit": int(t.get("deposit") or 0),
                "rent": int(t.get("rent") or 0),
                "stay_status": t.get("stay_status") or "resident",
            }
            for t in data["tenants"]
        ],
        "invoices": [
            {
                "id": str(i.get("id")),
                "year": int(i.get("year") or 0),
                "month": int(i.get("month") or 0),
                "room": str(i.get("room")),
                "tenant": i.get("tenant"),
                "kwh": int(i.get("kwh") or 0),
                "m3": int(i.get("m3") or 0),
                "rent": int(i.get("rent") or 0),
                "service": int(i.get("service") or 0),
                "other_fee": int(i.get("other_fee") or 0),
                "paid": 1 if i.get("paid") else 0,
                "due": i.get("due"),
            }
            for i in data["invoices"]
        ],
        "repairs": [
            {
                "id": str(r.get("id")),
                "room": str(r.get("room") or ""),
                "title": r.get("title") or "",
                "category": r.get("category") or "other",
                "priority": r.get("priority") or "normal",
                "status": r.get("status") or "open",
                "assignee": r.get("assignee"),
                "phone": r.get("phone"),
                "cost": int(r.get("cost") or 0),
                "reported": r.get("reported"),
                "due": r.get("due"),
                "done": r.get("done"),
                "note": r.get("note"),
            }
            for r in data["repairs"]
        ],
        "settings": data["settings"],
    }


def post_rpc(base, key, name, body):
    url = base.rstrip("/") + "/rest/v1/rpc/" + name
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "apikey": key,
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            raw = res.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")
        raise SystemExit(f"Supabase ຕອບກັບ HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        raise SystemExit(f"ເຊື່ອມຕໍ່ Supabase ບໍ່ໄດ້: {exc.reason}")


def main():
    ap = argparse.ArgumentParser(description="ຍ້າຍຂໍ້ມູນ SQLite → Supabase")
    ap.add_argument("--url", default=os.environ.get("SUPABASE_URL", ""))
    ap.add_argument("--key", default=os.environ.get("SUPABASE_KEY", ""))
    ap.add_argument("--yes", action="store_true", help="ບໍ່ຕ້ອງຖາມຢືນຢັນ")
    ap.add_argument("--dry-run", action="store_true", help="ສະແດງຈຳນວນແຖວ ໂດຍບໍ່ຂຽນ")
    args = ap.parse_args()

    if not args.url or not args.key:
        raise SystemExit("ຕ້ອງມີ --url ແລະ --key (ຫຼື env SUPABASE_URL / SUPABASE_KEY)")

    data = read_sqlite()
    payload = payload_of(data)
    print(f"SQLite: {DB_PATH}")
    print(
        f"  rooms {len(payload['rooms'])} · tenants {len(payload['tenants'])} · "
        f"invoices {len(payload['invoices'])} · repairs {len(payload['repairs'])}"
    )
    if args.dry_run:
        print("dry-run: ບໍ່ໄດ້ຂຽນຫຍັງລົງ Supabase")
        return

    if not args.yes:
        ans = input("ຂຽນທັບຂໍ້ມູນໃນ Supabase ທັງໝົດດ້ວຍຂໍ້ມູນນີ້? (yes/no): ").strip().lower()
        if ans not in ("y", "yes"):
            raise SystemExit("ຍົກເລີກ")

    print("ກຳລັງຂຽນລົງ Supabase …")
    res = post_rpc(args.url, args.key, "apt_save", {"payload": payload, "expected_rev": None})
    if not res or not res.get("ok"):
        raise SystemExit(f"ບັນທຶກບໍ່ສຳເລັດ: {res}")
    print(
        f"ສຳເລັດ · rev {res.get('rev')} · rooms {res.get('rooms')} · tenants {res.get('tenants')} · "
        f"invoices {res.get('invoices')} · repairs {res.get('repairs')}"
    )

    vm = data.get("view_month")
    if isinstance(vm, dict) and vm.get("year") and vm.get("month"):
        try:
            post_rpc(
                args.url,
                args.key,
                "apt_set_view_month",
                {"p_year": int(vm["year"]), "p_month": int(vm["month"])},
            )
            print(f"ເດືອນທີ່ຈົດມິເຕີ: {vm['month']}/{vm['year']} ✓")
        except SystemExit as exc:
            print(f"ຂ້າມເດືອນທີ່ຈົດມິເຕີ: {exc}")


if __name__ == "__main__":
    main()
