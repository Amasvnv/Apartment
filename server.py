"""ເຊີບເວີທ້ອງຖິ່ນ ສຳລັບລະບົບຈັດການອາພາດເມັນ
- ເສີບໄຟລ໌ເວັບ (HTML/CSS/JS) ຈາກໂຟນເດີນີ້
- REST API ສຳລັບຖານຂໍ້ມູນ SQLite: data/apartment.db

ການນຳໃຊ້:
    python server.py            # ເປີດທີ່ http://127.0.0.1:4173
    python server.py 8080       # ກຳນົດ port ເອງ
"""

import json
import os
import sqlite3
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
DB_PATH = os.path.join(DATA_DIR, "apartment.db")
SCHEMA_PATH = os.path.join(ROOT, "db", "schema.sql")

SCHEMA_FALLBACK = """
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY, floor INTEGER NOT NULL DEFAULT 1,
  room_type TEXT NOT NULL DEFAULT '1 ຫ້ອງນອນ', rent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'vacant', tenant TEXT, phone TEXT,
  meter_elec INTEGER NOT NULL DEFAULT 0, meter_water INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tenants (
  room TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, contract TEXT, move_in TEXT,
  people INTEGER NOT NULL DEFAULT 1, deposit INTEGER NOT NULL DEFAULT 0, rent INTEGER NOT NULL DEFAULT 0,
  stay_status TEXT NOT NULL DEFAULT 'resident'
);
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY, year INTEGER NOT NULL, month INTEGER NOT NULL, room TEXT NOT NULL,
  tenant TEXT, kwh INTEGER NOT NULL DEFAULT 0, m3 INTEGER NOT NULL DEFAULT 0,
  rent INTEGER NOT NULL DEFAULT 0, service INTEGER NOT NULL DEFAULT 0,
  other_fee INTEGER NOT NULL DEFAULT 0, paid INTEGER NOT NULL DEFAULT 0, due TEXT
);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices (year, month);
CREATE INDEX IF NOT EXISTS idx_invoices_room ON invoices (room);
CREATE TABLE IF NOT EXISTS repairs (
  id TEXT PRIMARY KEY, room TEXT NOT NULL, title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other', priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open', assignee TEXT, phone TEXT,
  cost INTEGER NOT NULL DEFAULT 0, reported TEXT, due TEXT, done TEXT, note TEXT
);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs (status);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
"""


def connect():
    os.makedirs(DATA_DIR, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=15)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode = WAL")
    con.execute("PRAGMA busy_timeout = 15000")
    return con


def init_db():
    schema = SCHEMA_FALLBACK
    if os.path.exists(SCHEMA_PATH):
        with open(SCHEMA_PATH, encoding="utf-8") as fh:
            schema = fh.read()
    con = connect()
    try:
        con.executescript(schema)
        # ຖານຂໍ້ມູນເກົ່າ: ເພີ່ມຖັນສະຖານະຜູ້ເຊົ່າຖ້າຍັງບໍ່ມີ
        cols = [r["name"] for r in con.execute("PRAGMA table_info(tenants)")]
        if "stay_status" not in cols:
            con.execute("ALTER TABLE tenants ADD COLUMN stay_status TEXT NOT NULL DEFAULT 'resident'")
        if con.execute("SELECT value FROM meta WHERE key = 'rev'").fetchone() is None:
            con.execute("INSERT INTO meta (key, value) VALUES ('rev', '0')")
        con.commit()
    finally:
        con.close()


def get_rev(con):
    row = con.execute("SELECT value FROM meta WHERE key = 'rev'").fetchone()
    return int(row["value"]) if row else 0


def bump_rev(con):
    rev = get_rev(con) + 1
    con.execute("INSERT INTO meta (key, value) VALUES ('rev', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (str(rev),))
    return rev


def read_state():
    con = connect()
    try:
        rev = get_rev(con)
        rooms = [
            {
                "no": r["id"],
                "floor": r["floor"],
                "type": r["room_type"],
                "rent": r["rent"],
                "status": r["status"],
                "tenant": r["tenant"],
                "phone": r["phone"],
                "meterElec": r["meter_elec"],
                "meterWater": r["meter_water"],
            }
            for r in con.execute("SELECT * FROM rooms ORDER BY id")
        ]
        tenants = [
            {
                "name": t["name"],
                "phone": t["phone"],
                "room": t["room"],
                "contract": t["contract"],
                "moveIn": t["move_in"],
                "people": t["people"],
                "deposit": t["deposit"],
                "rent": t["rent"],
                "stayStatus": t["stay_status"],
            }
            for t in con.execute("SELECT * FROM tenants ORDER BY room")
        ]
        invoices = [
            {
                "no": i["id"],
                "room": i["room"],
                "tenant": i["tenant"],
                "kwh": i["kwh"],
                "m3": i["m3"],
                "rent": i["rent"],
                "service": i["service"],
                "other": i["other_fee"],
                "paid": bool(i["paid"]),
                "due": i["due"],
                "year": i["year"],
                "month": i["month"],
            }
            for i in con.execute("SELECT * FROM invoices ORDER BY year, month, id")
        ]
        repairs = [
            {
                "id": r["id"],
                "room": r["room"],
                "title": r["title"],
                "category": r["category"],
                "priority": r["priority"],
                "status": r["status"],
                "assignee": r["assignee"],
                "phone": r["phone"],
                "cost": r["cost"],
                "reported": r["reported"],
                "due": r["due"],
                "done": r["done"],
                "note": r["note"],
            }
            for r in con.execute("SELECT * FROM repairs ORDER BY reported, id")
        ]
        row = con.execute("SELECT value FROM meta WHERE key = 'settings'").fetchone()
        settings = None
        if row and row["value"]:
            try:
                settings = json.loads(row["value"])
            except ValueError:
                settings = None
    finally:
        con.close()
    return {
        "rev": rev,
        "rooms": rooms,
        "tenants": tenants,
        "invoices": invoices,
        "repairs": repairs,
        "settings": settings,
    }


VIEW_MONTH_KEY = "viewMonth"


def read_view_month():
    """ເດືອນທີ່ເລືອກໃນໜ້າຕັ້ງຄ່າ (ການ໌ “ເດືອນທີ່ຈົດມິເຕີ”) — ບໍ່ກ່ຽວກັບ rev"""
    con = connect()
    try:
        row = con.execute(
            "SELECT value FROM meta WHERE key = ?", (VIEW_MONTH_KEY,)
        ).fetchone()
        if row and row["value"]:
            try:
                v = json.loads(row["value"])
                y = int(v.get("year"))
                m = int(v.get("month"))
                if 2026 <= y <= 2100 and 1 <= m <= 12:
                    return {"year": y, "month": m}
            except (ValueError, TypeError, AttributeError):
                pass
    finally:
        con.close()
    return {"year": None, "month": None}


def write_view_month(data):
    try:
        y = int(data.get("year"))
        m = int(data.get("month"))
    except (TypeError, ValueError, AttributeError):
        return {"error": "year/month ຕ້ອງເປັນໂຕເລກ"}, 400
    if not (2026 <= y <= 2100) or not (1 <= m <= 12):
        return {"error": "ເດືອນ 1–12 ແລະ ປີ 2026–2100"}, 400
    con = connect()
    try:
        with con:
            con.execute(
                "INSERT INTO meta (key, value) VALUES (?, ?)"
                ' ON CONFLICT(key) DO UPDATE SET value = excluded.value',
                (VIEW_MONTH_KEY, json.dumps({"year": y, "month": m})),
            )
    finally:
        con.close()
    return {"ok": True, "year": y, "month": m}, 200


def write_state(data):
    rooms = data.get("rooms") or []
    tenants = data.get("tenants") or []
    invoices = data.get("invoices") or []
    repairs = data.get("repairs") or []
    # ກັນຂໍ້ມູນເສຍ: ຫ້ອງຕ້ອງມີເລກຫ້ອງເປັນຂໍ້ຄວາມທີ່ບໍ່ຫວ່າງ
    for r in rooms:
        if not isinstance(r.get("no"), (str, int)) or str(r.get("no")).strip() == "":
            return {"error": "room ຕ້ອງມີເລກຫ້ອງ"}, 400
    con = connect()
    try:
        if data.get("rev") is not None and int(data.get("rev")) != get_rev(con):
            return {"error": "conflict", "rev": get_rev(con)}, 409
        settings = data.get("settings")
        with con:
            rev = bump_rev(con)
            if isinstance(settings, dict):
                con.execute(
                    "INSERT INTO meta (key, value) VALUES ('settings', ?)"
                    " ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                    (json.dumps(settings, ensure_ascii=False),),
                )
            con.execute("DELETE FROM rooms")
            con.execute("DELETE FROM tenants")
            con.execute("DELETE FROM invoices")
            con.execute("DELETE FROM repairs")
            con.executemany(
                "INSERT INTO rooms (id, floor, room_type, rent, status, tenant, phone, meter_elec, meter_water)"
                " VALUES (?,?,?,?,?,?,?,?,?)",
                [
                    (
                        str(r.get("no")),
                        int(r.get("floor") or 1),
                        r.get("type") or "1 ຫ້ອງນອນ",
                        int(r.get("rent") or 0),
                        r.get("status") or "vacant",
                        r.get("tenant"),
                        r.get("phone"),
                        int(r.get("meterElec") or 0),
                        int(r.get("meterWater") or 0),
                    )
                    for r in rooms
                ],
            )
            con.executemany(
                "INSERT INTO tenants (room, name, phone, contract, move_in, people, deposit, rent, stay_status)"
                " VALUES (?,?,?,?,?,?,?,?,?)",
                [
                    (
                        str(t.get("room")),
                        t.get("name") or "",
                        t.get("phone"),
                        t.get("contract"),
                        t.get("moveIn"),
                        int(t.get("people") or 1),
                        int(t.get("deposit") or 0),
                        int(t.get("rent") or 0),
                        t.get("stayStatus") or "resident",
                    )
                    for t in tenants
                ],
            )
            con.executemany(
                "INSERT INTO invoices (id, year, month, room, tenant, kwh, m3, rent, service, other_fee, paid, due)"
                " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                [
                    (
                        str(i.get("no")),
                        int(i.get("year") or 0),
                        int(i.get("month") or 0),
                        str(i.get("room")),
                        i.get("tenant"),
                        int(i.get("kwh") or 0),
                        int(i.get("m3") or 0),
                        int(i.get("rent") or 0),
                        int(i.get("service") or 0),
                        int(i.get("other") or 0),
                        1 if i.get("paid") else 0,
                        i.get("due"),
                    )
                    for i in invoices
                ],
            )
            con.executemany(
                "INSERT INTO repairs (id, room, title, category, priority, status, assignee, phone, cost, reported, due, done, note)"
                " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                [
                    (
                        str(r.get("id")),
                        str(r.get("room") or ""),
                        r.get("title") or "",
                        r.get("category") or "other",
                        r.get("priority") or "normal",
                        r.get("status") or "open",
                        r.get("assignee"),
                        r.get("phone"),
                        int(r.get("cost") or 0),
                        r.get("reported"),
                        r.get("due"),
                        r.get("done"),
                        r.get("note"),
                    )
                    for r in repairs
                ],
            )
    finally:
        con.close()
    return {
        "ok": True,
        "rev": rev,
        "rooms": len(rooms),
        "tenants": len(tenants),
        "invoices": len(invoices),
        "repairs": len(repairs),
    }, 200


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))
        sys.stderr.flush()

    def _path(self):
        return self.path.split("?", 1)[0].rstrip("/") or "/"

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self._path()
        if path == "/api/state":
            try:
                return self._json(read_state())
            except Exception as exc:  # noqa: BLE001
                return self._json({"error": str(exc)}, 500)
        if path == "/api/view-month":
            try:
                return self._json(read_view_month())
            except Exception as exc:  # noqa: BLE001
                return self._json({"error": str(exc)}, 500)
        if path == "/api/health":
            state = read_state()
            return self._json(
                {
                    "ok": True,
                    "database": os.path.relpath(DB_PATH, ROOT).replace("\\", "/"),
                    "rooms": len(state["rooms"]),
                    "tenants": len(state["tenants"]),
                    "invoices": len(state["invoices"]),
                    "repairs": len(state["repairs"]),
                }
            )
        return super().do_GET()

    def do_PUT(self):
        path = self._path()
        if path not in ("/api/state", "/api/view-month"):
            return self.send_error(405, "Method not allowed")
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        if path == "/api/view-month":
            try:
                payload, code = write_view_month(json.loads(raw.decode("utf-8")))
                return self._json(payload, code)
            except Exception as exc:  # noqa: BLE001
                return self._json({"error": str(exc)}, 400)
        try:
            data = json.loads(raw.decode("utf-8"))
            payload, code = write_state(data)
            return self._json(payload, code)
        except Exception as exc:  # noqa: BLE001
            return self._json({"error": str(exc)}, 400)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    init_db()
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"database: {DB_PATH}")
    print(f"open: http://127.0.0.1:{port}/index.html")
    sys.stdout.flush()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nປິດເຊີບເວີ")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
