/* =========================================================
   ຊັ້ນເຊື່ອມຕໍ່ຖານຂໍ້ມູນ
   - "supabase" : PostgreSQL ຜ່ານ Supabase RPC (apt_load / apt_save)
   - "turso"    : SQLite ຄລາວ ຜ່ານ HTTP API v2
   - ຖ້າຍັງບໍ່ຕັ້ງຄ່າ ຈະໃຊ້ server.py (SQLite) ຫຼື ເບົາຣ໌ເຊີ (localStorage)
   ========================================================= */

const DB = (function () {
  const CFG_KEY = "db.config";
  const CACHE_KEY = "db.cache";

  const state = {
    mode: "local", // "supabase" | "server" (SQLite ຜ່ານ server.py) | "cloud" (Turso) | "local"
    connected: false,
    error: "",
    updatedAt: null,
    rev: 0,
    counts: { rooms: 0, tenants: 0, invoices: 0 }
  };

  let readyResolve;
  const ready = new Promise((r) => (readyResolve = r));

  /* ---------------- ຕັ້ງຄ່າ ---------------- */
  function readConfig() {
    let c = null;
    try {
      c = JSON.parse(localStorage.getItem(CFG_KEY) || "null");
    } catch (e) {
      c = null;
    }
    if (!c && window.DB_CONFIG) c = window.DB_CONFIG;
    const url = c && c.url ? String(c.url).trim() : "";
    const token = c && c.token ? String(c.token).trim() : "";
    const provider = c && c.provider ? String(c.provider).trim() : "";
    return { url, token, provider };
  }

  let config = readConfig();
  const isConfigured = () => !!(config.url && config.token);
  // Supabase = Project URL ທີ່ລົງທ້າຍ .supabase.co · ຖ້າບໍ່ລະບຸ ຈະເດົາຈາກ URL
  const provider = () =>
    config.provider || (/supabase/i.test(config.url || "") ? "supabase" : "turso");
  const isSupabase = () => provider() === "supabase";

  /* ---------------- Supabase (PostgREST RPC) ---------------- */
  function supabaseBase() {
    return String(config.url || "").trim().replace(/\/+$/, "");
  }

  function sbHeaders() {
    return {
      apikey: config.token,
      Authorization: "Bearer " + config.token,
      "Content-Type": "application/json",
      Accept: "application/json"
    };
  }

  async function sbRpc(name, body) {
    if (!isConfigured()) throw new Error("ຢັງບໍ່ໄດ້ຕັ້ງຄ່າ Project URL ຫຼື anon key");
    let res;
    try {
      res = await fetch(supabaseBase() + "/rest/v1/rpc/" + name, {
        method: "POST",
        headers: sbHeaders(),
        body: JSON.stringify(body || {}),
        cache: "no-store"
      });
    } catch (e) {
      throw new Error("ເຊື່ອມຕໍ່ Supabase ບໍ່ໄດ້: ກວດ Project URL / ອິນເຕີເນັດ (" + e.message + ")");
    }
    if (res.status === 401 || res.status === 403)
      throw new Error("anon key ບໍ່ຖືກຕ້ອງ ຫຼື ຖືກປິດ (HTTP " + res.status + ")");
    if (res.status === 404)
      throw new Error(
        "ບໍ່ພົບຟັງຊັນ " + name + "() — ກະລຸນາ run db/supabase-schema.sql ໃນ Supabase SQL Editor"
      );
    if (!res.ok) {
      let msg = "Supabase ຕອບກັບ HTTP " + res.status;
      try {
        const j = await res.json();
        if (j && (j.message || j.error)) msg += " — " + (j.message || j.error);
      } catch (e) {
        /* ບໍ່ມີ JSON ໃນຄຳຕອບ */
      }
      throw new Error(msg);
    }
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }

  function endpoint() {
    if (isSupabase()) return supabaseBase() + "/rest/v1";
    let u = config.url.replace(/^(libsql|turso|wss?):\/\//i, "https://");
    u = u.replace(/\/+$/, "");
    return u + "/v2/pipeline";
  }

  /* ---------------- ຕົວຊ່ວຍ SQL ---------------- */
  const arg = (v) => {
    if (v === null || v === undefined) return { type: "null" };
    if (typeof v === "number") return Number.isInteger(v) ? { type: "integer", value: String(v) } : { type: "float", value: v };
    if (typeof v === "boolean") return { type: "integer", value: v ? "1" : "0" };
    return { type: "text", value: String(v) };
  };
  const sql = (text, args) => ({ sql: text, args: (args || []).map(arg) });

  async function exec(statements) {
    if (!isConfigured()) throw new Error("ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ URL ຫຼື token");
    const body = {
      requests: [
        ...statements.map((s) => ({ type: "execute", stmt: s })),
        { type: "close" }
      ]
    };
    let res;
    try {
      res = await fetch(endpoint(), {
        method: "POST",
        headers: { Authorization: "Bearer " + config.token, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error("ເຊື່ອມຕໍ່ບໍ່ໄດ້: ກວດ URL / ອິນເຕີເນັດ (" + e.message + ")");
    }
    if (res.status === 401 || res.status === 403) throw new Error("token ບໍ່ຖືກຕ້ອງ ຫຼື ໝົດອາຍຸ (HTTP " + res.status + ")");
    if (!res.ok) throw new Error("ຖານຂໍ້ມູນຕອບກັບ HTTP " + res.status);
    const json = await res.json();
    const results = json.results || [];
    const bad = results.find((r) => r.type === "error");
    if (bad) throw new Error((bad.error && bad.error.message) || "SQL error");
    return results.map((r) => (r.response && r.response.result) || { cols: [], rows: [] });
  }

  const decode = (cell) => {
    if (!cell || cell.type === "null") return null;
    if (cell.type === "integer" || cell.type === "float") return Number(cell.value);
    return cell.value;
  };
  function toObjects(result) {
    const cols = (result.cols || []).map((c) => c.name);
    return (result.rows || []).map((row) => {
      const o = {};
      row.forEach((cell, i) => (o[cols[i]] = decode(cell)));
      return o;
    });
  }

  /* ---------------- ຂໍ້ມູນ ---------------- */
  const SETTING_KEYS = [
    "rent",
    "electricRate",
    "waterRate",
    "waterTotal",
    "serviceFee",
    "trashFee",
    "trashTotal"
  ];

  function applySettings(s) {
    if (!s || typeof s !== "object") return;
    SETTING_KEYS.forEach((k) => {
      if (s[k] !== undefined && s[k] !== null && !Number.isNaN(Number(s[k]))) APT[k] = Number(s[k]);
    });
    /* ອັດຕາແຍກເດືອນ: { "YYYY-M": { rent, electricRate, waterTotal, trashTotal, serviceFee } } */
    const monthEntries = {};
    const addMonth = (key) => {
      const mm = String(key).match(/^(\d{4})-0?(\d{1,2})$/);
      if (!mm) return null;
      const month = Number(mm[2]);
      if (month < 1 || month > 12) return null;
      return Number(mm[1]) + "-" + month;
    };
    const pickRates = (src) => {
      const o = {};
      RATE_KEYS.forEach((k) => {
        const v = src[k];
        if (v !== undefined && v !== null && v !== "" && !Number.isNaN(Number(v))) o[k] = Number(v);
      });
      return o;
    };
    /* ຂໍ້ມູນເກົ່າ (rentByMonth) ຖືກຫຼອມເຂົ້າ ratesByMonth */
    if (s.rentByMonth && typeof s.rentByMonth === "object") {
      Object.keys(s.rentByMonth).forEach((k) => {
        const key = addMonth(k);
        const v = Number(s.rentByMonth[k]);
        if (!key || Number.isNaN(v)) return;
        (monthEntries[key] || (monthEntries[key] = {})).rent = v;
      });
    }
    if (s.ratesByMonth && typeof s.ratesByMonth === "object") {
      Object.keys(s.ratesByMonth).forEach((k) => {
        const key = addMonth(k);
        if (!key || !s.ratesByMonth[k] || typeof s.ratesByMonth[k] !== "object") return;
        monthEntries[key] = { ...(monthEntries[key] || {}), ...pickRates(s.ratesByMonth[k]) };
      });
    }
    APT.ratesByMonth = monthEntries;
    APT.rentByMonth = {};
    Object.keys(monthEntries).forEach((k) => {
      if (monthEntries[k].rent !== undefined) APT.rentByMonth[k] = monthEntries[k].rent;
    });
    /* ຄ່າບໍລິການເພີ່ມເຕີມ ແຍກຕາມເດືອນ (2026-11 → ລາຍການ) — ເດືອນທີ່ບໍ່ມີ ບໍ່ຄິດຄ່າ */
    APT.extraFeesByMonth = {};
    if (s.extraFeesByMonth && typeof s.extraFeesByMonth === "object") {
      Object.keys(s.extraFeesByMonth).forEach((k) => {
        const list = s.extraFeesByMonth[k];
        if (!Array.isArray(list)) return;
        const clean = list
          .filter((f) => f && (String(f.name || "").trim() || Number(f.amount)))
          .map((f) => ({ name: String(f.name || "").trim(), amount: Number(f.amount) || 0, active: !!f.active }));
        if (clean.length) APT.extraFeesByMonth[k] = clean;
      });
    }
    if (s.meterReadings && typeof s.meterReadings === "object") {
      const out = {};
      Object.keys(s.meterReadings).forEach((room) => {
        const months = s.meterReadings[room];
        if (!months || typeof months !== "object") return;
        out[room] = {};
        Object.keys(months).forEach((k) => {
          const v = Number(months[k]);
          if (!Number.isNaN(v)) out[room][k] = v;
        });
      });
      APT.meterReadings = out;
    }
    /* ຂໍ້ຄວາມປະຈຳເດືອນ */
    APT.monthNotes = {};
    if (s.monthNotes && typeof s.monthNotes === "object") {
      Object.keys(s.monthNotes).forEach((k) => {
        const v = s.monthNotes[k];
        if (typeof v === "string" && v.trim()) APT.monthNotes[k] = v.trim();
      });
    }
    APT.monthNotes2 = {};
    if (s.monthNotes2 && typeof s.monthNotes2 === "object") {
      Object.keys(s.monthNotes2).forEach((k) => {
        const v = s.monthNotes2[k];
        if (typeof v === "string" && v.trim()) APT.monthNotes2[k] = v.trim();
      });
    }
    /* ບັນທຶກການເຄື່ອນໄຫວ — ຫຼ້າສຸດຢູ່ຫົວລາຍການ */
    APT.activity = [];
    if (Array.isArray(s.activity)) {
      s.activity.forEach((a) => {
        if (!a || typeof a !== "object" || !a.t) return;
        APT.activity.push({
          t: String(a.t),
          kind: String(a.kind || "settings"),
          title: String(a.title || ""),
          detail: String(a.detail || ""),
          by: String(a.by || "")
        });
      });
      if (APT.activity.length > 500) APT.activity.length = 500;
    }
    /* ຜູ້ໃຊ້ລະບົບ ແລະ ສິດ (ເກັບໃນ settings ດຽວກັນ) */
    if (Array.isArray(s.users)) {
      const ACTIONS = ["view", "edit", "delete"];
      APT.users = s.users
        .filter((u) => u && String(u.name || "").trim())
        .map((u) => {
          const perms = {};
          if (u.perms && typeof u.perms === "object") {
            Object.keys(u.perms).forEach((m) => {
              const list = Array.isArray(u.perms[m]) ? u.perms[m].filter((a) => ACTIONS.indexOf(a) >= 0) : [];
              if (list.length) perms[m] = list;
            });
          }
          return {
            id: String(u.id || ""),
            name: String(u.name).trim(),
            phone: u.phone == null ? "" : String(u.phone),
            role: String(u.role || "staff"),
            pin: /^\d{4,6}$/.test(String(u.pin == null ? "" : u.pin)) ? String(u.pin) : "",
            active: u.active !== false,
            perms
          };
        });
    }
  }

  function settingsSnapshot() {
    return {
      rent: APT.rent,
      rentByMonth: { ...(APT.rentByMonth || {}) },
      ratesByMonth: JSON.parse(JSON.stringify(APT.ratesByMonth || {})),
      electricRate: APT.electricRate,
      waterRate: APT.waterRate,
      waterTotal: APT.waterTotal,
      serviceFee: APT.serviceFee,
      trashFee: APT.trashFee,
      trashTotal: APT.trashTotal,
      extraFeesByMonth: JSON.parse(JSON.stringify(APT.extraFeesByMonth || {})),
      monthNotes: { ...(APT.monthNotes || {}) },
      monthNotes2: { ...(APT.monthNotes2 || {}) },
      meterReadings: APT.meterReadings || {},
      activity: (APT.activity || []).slice(0, 500),
      users: JSON.parse(JSON.stringify(APT.users || []))
    };
  }

  // ສະຖານະຫ້ອງຕ້ອງກົງກັບທະບຽນຜູ້ເຊົ່າ: ມີຜູ້ເຊົ່າ = ມີຜູ້ເຊົ່າ, ບໍ່ມີ = ຫ້ອງວ່າງ
  function syncRooms() {
    let changed = false;
    ROOMS.forEach((r) => {
      const t = TENANTS.find((x) => String(x.room) === String(r.no));
      if (t) {
        if (r.tenant !== t.name || r.phone !== t.phone) changed = true;
        r.tenant = t.name;
        r.phone = t.phone;
        if (r.status !== "repair" && r.status !== "occupied") {
          r.status = "occupied";
          changed = true;
        }
      } else if (r.status === "occupied" || r.tenant || r.phone) {
        if (r.status !== "vacant") changed = true;
        r.status = "vacant";
        r.tenant = null;
        r.phone = null;
      }
    });
    return changed;
  }

  function applyData(data) {
    applySettings(data.settings);
    ROOMS.length = 0;
    (data.rooms || []).forEach((r) => ROOMS.push(r));
    if (Array.isArray(data.repairs) && data.repairs.length) {
      REPAIRS.length = 0;
      data.repairs.forEach((r) => REPAIRS.push(r));
    }
    TENANTS.length = 0;
    (data.tenants || []).forEach((t) => TENANTS.push(t));
    Object.keys(INVOICE_MONTHS).forEach((k) => delete INVOICE_MONTHS[k]);
    (data.invoices || []).forEach((i) => {
      const key = i.year + "-" + i.month;
      (INVOICE_MONTHS[key] || (INVOICE_MONTHS[key] = [])).push(i);
    });
    state.roomsSynced = syncRooms();
    state.counts = {
      rooms: ROOMS.length,
      tenants: TENANTS.length,
      invoices: (data.invoices || []).length
    };
  }

  function snapshot() {
    syncRooms();
    const invoices = [];
    Object.keys(INVOICE_MONTHS).forEach((key) => {
      const [y, m] = key.split("-").map(Number);
      INVOICE_MONTHS[key].forEach((i) => invoices.push({ ...i, year: y, month: m }));
    });
    return {
      rooms: ROOMS.map((r) => ({ ...r })),
      tenants: TENANTS.map((t) => ({ ...t })),
      invoices,
      repairs: REPAIRS.map((r) => ({ ...r })),
      settings: settingsSnapshot()
    };
  }

  function fromRows(rows) {
    return {
      rooms: rows.rooms.map((r) => ({
        no: r.id,
        floor: r.floor,
        type: r.room_type,
        rent: r.rent,
        status: r.status,
        tenant: r.tenant,
        phone: r.phone,
        meterElec: r.meter_elec,
        meterWater: r.meter_water
      })),
      tenants: rows.tenants.map((t) => ({
        name: t.name,
        phone: t.phone,
        room: t.room,
        contract: t.contract,
        moveIn: t.move_in,
        people: t.people,
        deposit: t.deposit,
        rent: t.rent,
        stayStatus: t.stay_status || "resident"
      })),
      repairs: (rows.repairs || []).map((r) => ({
        id: r.id,
        room: r.room,
        title: r.title,
        category: r.category,
        priority: r.priority,
        status: r.status,
        assignee: r.assignee,
        phone: r.phone,
        cost: r.cost,
        reported: r.reported,
        due: r.due,
        done: r.done,
        note: r.note
      })),
      invoices: rows.invoices.map((i) => ({
        no: i.id,
        room: i.room,
        tenant: i.tenant,
        kwh: i.kwh,
        m3: i.m3,
        rent: i.rent,
        service: i.service,
        other: i.other_fee,
        paid: !!i.paid,
        due: i.due,
        year: i.year,
        month: i.month
      }))
    };
  }

  /* ---------------- ໂໝດເຊີບເວີທ້ອງຖິ່ນ (server.py + SQLite) ---------------- */
  const API_STATE = "/api/state";

  async function fetchServer() {
    const res = await fetch(API_STATE, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) throw new Error("API HTTP " + res.status);
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) throw new Error("ບໍ່ພົບ API");
    const data = await res.json();
    if (!data || !Array.isArray(data.rooms)) throw new Error("ບໍ່ພົບ API");
    return data;
  }

  async function saveServer() {
    const data = { ...snapshot(), rev: state.rev };
    const res = await fetch(API_STATE, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.status === 409) {
      // ມີໜ້າອື່ນຂຽນຂໍ້ມູນໄປກ່ອນ — ໂຫຼດຂໍ້ມູນລ່າສຸດຄືນ ແລ້ວບອກໃຫ້ຜູ້ໃຊ້ຮູ້
      const fresh = await fetchServer();
      state.rev = fresh.rev || 0;
      applyData(fresh);
      throw new Error("ຂໍ້ມູນຖືກແກ້ໄຂຈາກໜ້າອື່ນ — ກຳລັງໂຫຼດຂໍ້ມູນໃໝ່");
    }
    if (!res.ok) throw new Error("ບັນທຶກບໍ່ສຳເລັດ (HTTP " + res.status + ")");
    const json = await res.json();
    if (typeof json.rev === "number") state.rev = json.rev;
    return true;
  }

  async function fetchCloud() {
    const [rooms, tenants, invoices, repairs, meta] = await exec([
      sql("SELECT id, floor, room_type, rent, status, tenant, phone, meter_elec, meter_water FROM rooms ORDER BY id"),
      sql("SELECT room, name, phone, contract, move_in, people, deposit, rent, stay_status FROM tenants ORDER BY room"),
      sql("SELECT id, year, month, room, tenant, kwh, m3, rent, service, other_fee, paid, due FROM invoices ORDER BY year, month, id"),
      sql("SELECT id, room, title, category, priority, status, assignee, phone, cost, reported, due, done, note FROM repairs ORDER BY reported, id"),
      sql("SELECT value FROM meta WHERE key = 'settings'")
    ]);
    const data = fromRows({
      rooms: toObjects(rooms),
      tenants: toObjects(tenants),
      invoices: toObjects(invoices),
      repairs: toObjects(repairs)
    });
    const raw = toObjects(meta)[0];
    if (raw && raw.value) {
      try {
        data.settings = JSON.parse(raw.value);
      } catch (e) {
        /* JSON ເສຍ — ໃຊ້ຄ່າເລີ່ມຕົ້ນ */
      }
    }
    return data;
  }

  async function fetchSupabase() {
    const data = await sbRpc("apt_load", {});
    if (!data || !Array.isArray(data.rooms)) throw new Error("Supabase ຕອບກັບຂໍ້ມູນບໍ່ຖືກຮູບແບບ");
    const out = fromRows({
      rooms: data.rooms,
      tenants: data.tenants || [],
      invoices: data.invoices || [],
      repairs: data.repairs || []
    });
    if (data.settings) out.settings = data.settings;
    out.rev = Number(data.rev) || 0;
    return out;
  }

  /* ແປງຂໍ້ມູນໃນແອັບ (camelCase) → ຖັນ Postgres (snake_case) */
  function supabasePayload() {
    const data = snapshot();
    return {
      rooms: data.rooms.map((r) => ({
        id: String(r.no),
        floor: Number(r.floor) || 1,
        room_type: r.type || "1 ຫ້ອງນອນ",
        rent: Number(r.rent) || 0,
        status: r.status || "vacant",
        tenant: r.tenant === undefined ? null : r.tenant,
        phone: r.phone === undefined ? null : r.phone,
        meter_elec: Number(r.meterElec) || 0,
        meter_water: Number(r.meterWater) || 0
      })),
      tenants: data.tenants.map((t) => ({
        room: String(t.room),
        name: t.name || "",
        phone: t.phone === undefined ? null : t.phone,
        contract: t.contract === undefined ? null : t.contract,
        move_in: t.moveIn === undefined ? null : t.moveIn,
        people: Number(t.people) || 1,
        deposit: Number(t.deposit) || 0,
        rent: Number(t.rent) || 0,
        stay_status: t.stayStatus || "resident"
      })),
      invoices: data.invoices.map((i) => ({
        id: String(i.no),
        year: Number(i.year) || 0,
        month: Number(i.month) || 0,
        room: String(i.room),
        tenant: i.tenant === undefined ? null : i.tenant,
        kwh: Number(i.kwh) || 0,
        m3: Number(i.m3) || 0,
        rent: Number(i.rent) || 0,
        service: Number(i.service) || 0,
        other_fee: Number(i.other) || 0,
        paid: i.paid ? 1 : 0,
        due: i.due === undefined ? null : i.due
      })),
      repairs: (data.repairs || []).map((r) => ({
        id: String(r.id),
        room: String(r.room || ""),
        title: r.title || "",
        category: r.category || "other",
        priority: r.priority || "normal",
        status: r.status || "open",
        assignee: r.assignee === undefined ? null : r.assignee,
        phone: r.phone === undefined ? null : r.phone,
        cost: Number(r.cost) || 0,
        reported: r.reported === undefined ? null : r.reported,
        due: r.due === undefined ? null : r.due,
        done: r.done === undefined ? null : r.done,
        note: r.note === undefined ? null : r.note
      })),
      settings: data.settings || {}
    };
  }

  async function saveSupabase() {
    const res = await sbRpc("apt_save", { payload: supabasePayload(), expected_rev: state.rev });
    if (res && res.error === "conflict") {
      // ມີໜ້າອື່ນຂຽນຂໍ້ມູນໄປກ່ອນ — ໂຫຼດຂໍ້ມູນລ່າສຸດຄືນ ແລ້ວບອກໃຫ້ຜູ້ໃຊ້ຮູ້
      const fresh = await fetchSupabase();
      state.rev = fresh.rev || 0;
      applyData(fresh);
      throw new Error("ຂໍ້ມູນຖືກແກ້ໄຂຈາກໜ້າອື່ນ — ກຳລັງໂຫຼດຂໍ້ມູນໃໝ່");
    }
    if (res && typeof res.rev === "number") state.rev = res.rev;
    return true;
  }

  /* ---------------- ເດືອນທີ່ຈົດມິເຕີ (ໃຊ້ຮ່ວມທຸກເຄື່ອງ) ---------------- */
  const monthOk = (v) => {
    const y = Number(v && v.year);
    const m = Number(v && v.month);
    return Number.isInteger(y) && y >= 2026 && y <= 2100 && Number.isInteger(m) && m >= 1 && m <= 12
      ? { year: y, month: m }
      : null;
  };

  async function getViewMonth() {
    if (state.mode === "supabase") return monthOk(await sbRpc("apt_view_month", {}));
    const res = await fetch("/api/view-month", { cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return monthOk(await res.json());
  }

  async function setViewMonth(year, month) {
    if (state.mode === "supabase") {
      await sbRpc("apt_set_view_month", { p_year: year, p_month: month });
      return true;
    }
    const res = await fetch("/api/view-month", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month })
    });
    if (!res.ok) throw new Error("ບັນທຶກເດືອນບໍ່ສຳເລັດ (HTTP " + res.status + ")");
    return true;
  }

  /* ---------------- ບັນທຶກ ---------------- */
  function persistLocal() {
    const data = snapshot();
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      /* ພື້ນທີ່ເກັບບໍ່ພຽງພໍ — ບໍ່ໃຫ້ຂັດການເຮັດວຽກ */
    }
    state.updatedAt = new Date().toISOString();
  }

  async function save() {
    /* ຜູ້ເບິ່ງ ເບິ່ງໄດ້ຢ່າງດຽວ — ບໍ່ຍອມໃຫ້ບັນທຶກທຸກກໍລະນີ */
    if (typeof currentUser === "function") {
      const me = currentUser();
      if (me && me.role === "viewer") {
        if (typeof showStatusToast === "function")
          showStatusToast("danger", "ບໍ່ມີສິດບັນທຶກ", "ຜູ້ເບິ່ງ ເບິ່ງໄດ້ຢ່າງດຽວ");
        return false;
      }
    }
    if (state.mode === "supabase") {
      try {
        await saveSupabase();
        postPing();
        state.connected = true;
        state.error = "";
        state.updatedAt = new Date().toISOString();
        paintStatus();
        return true;
      } catch (e) {
        state.error = e.message;
        paintStatus();
        if (e.message.indexOf("ໜ້າອື່ນ") >= 0) setTimeout(() => location.reload(), 600);
        else state.connected = false;
        return false;
      }
    }
    if (state.mode === "server") {
      try {
        await saveServer();
        postPing();
        state.connected = true;
        state.error = "";
        state.updatedAt = new Date().toISOString();
        paintStatus();
        return true;
      } catch (e) {
        state.error = e.message;
        paintStatus();
        if (e.message.indexOf("ໜ້າອື່ນ") >= 0) setTimeout(() => location.reload(), 600);
        else state.connected = false;
        return false;
      }
    }
    persistLocal();
    if (state.mode !== "cloud") {
      paintStatus();
      return true;
    }
    const data = snapshot();
    try {
      const stmts = [
        sql("DELETE FROM rooms"),
        sql("DELETE FROM tenants"),
        sql("DELETE FROM invoices"),
        sql("DELETE FROM repairs"),
        sql("INSERT OR REPLACE INTO meta (key, value) VALUES ('settings', ?)", [JSON.stringify(data.settings || {})])
      ];
      data.rooms.forEach((r) =>
        stmts.push(
          sql("INSERT INTO rooms (id, floor, room_type, rent, status, tenant, phone, meter_elec, meter_water) VALUES (?,?,?,?,?,?,?,?,?)", [
            r.no, r.floor, r.type, r.rent, r.status, r.tenant, r.phone, r.meterElec, r.meterWater
          ])
        )
      );
      data.tenants.forEach((t) =>
        stmts.push(
          sql("INSERT INTO tenants (room, name, phone, contract, move_in, people, deposit, rent, stay_status) VALUES (?,?,?,?,?,?,?,?,?)", [
            t.room, t.name, t.phone, t.contract, t.moveIn, t.people, t.deposit, t.rent, t.stayStatus || "resident"
          ])
        )
      );
      data.invoices.forEach((i) =>
        stmts.push(
          sql(
            "INSERT INTO invoices (id, year, month, room, tenant, kwh, m3, rent, service, other_fee, paid, due) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            [i.no, i.year, i.month, i.room, i.tenant, i.kwh, i.m3, i.rent, i.service, i.other, i.paid ? 1 : 0, i.due]
          )
        )
      );
      (data.repairs || []).forEach((r) =>
        stmts.push(
          sql(
            "INSERT INTO repairs (id, room, title, category, priority, status, assignee, phone, cost, reported, due, done, note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [r.id, r.room, r.title, r.category, r.priority, r.status, r.assignee, r.phone, r.cost, r.reported, r.due, r.done, r.note]
          )
        )
      );
      await exec(stmts);
      postPing();
      state.error = "";
      state.connected = true;
      state.updatedAt = new Date().toISOString();
      paintStatus();
      return true;
    } catch (e) {
      state.error = e.message;
      state.connected = false;
      paintStatus();
      return false;
    }
  }

  /* ---------------- ສະຖານະ / ການເຊື່ອມຕໍ່ ---------------- */
  function paintStatus() {
    const nodes = document.querySelectorAll("[data-db-status]");
    const online = state.mode !== "local" && state.connected;
    const text = online
      ? state.mode === "supabase"
        ? "ຖານຂໍ້ມູນ Supabase: ເຊື່ອມຕໍ່ແລ້ວ"
        : state.mode === "server"
          ? "ຖານຂໍ້ມູນ SQLite: ເຊື່ອມຕໍ່ແລ້ວ"
          : "ຖານຂໍ້ມູນ Turso: ເຊື່ອມຕໍ່ແລ້ວ"
      : state.mode === "local"
        ? "ຖານຂໍ້ມູນ: ຍັງບໍ່ເຊື່ອມຕໍ່"
        : "ຖານຂໍ້ມູນ: ມີຂໍ້ຜິດພາດ";
    nodes.forEach((n) => {
      n.textContent = text;
      n.className = "db-status " + (online ? "on" : "off");
      n.title = state.error || (state.updatedAt ? "ອັບເດດ: " + new Date(state.updatedAt).toLocaleString("en-GB") : "");
    });
  }

  /* ---------------- ກວດຂໍ້ມູນໃໝ່ ເມື່ອກັບມາທີ່ໜ້າ ຫຼື ແທັບອື່ນບັນທຶກ ---------------- */
  /* ບັນທຶກສຳເລັດ → ປະກາດໃຫ້ແທັບອື່ນຮູ້ (storage event ຂ້າມແທັບ) */
  const PING_KEY = "db.savedAt";
  function postPing() {
    try {
      localStorage.setItem(PING_KEY, String(Date.now()));
    } catch (e) {
      /* ບໍ່ມີ localStorage — ຂ້າມ */
    }
  }

  let refreshing = false;
  let lastCheck = 0;

  /* ຜູ້ໃຊ້ກຳລັງພິມຢູ່ບໍ — ຖ້າແມ່ນ ຢ່າໂຫຼດໜ້າໃໝ່ ເພື່ອບໍ່ໃຫ້ເສຍຂໍ້ຄວາມ */
  function isEditing() {
    const el = document.activeElement;
    if (!el) return false;
    if (el.isContentEditable) return true;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || "");
  }

  async function fetchLatest() {
    if (state.mode === "supabase") return fetchSupabase();
    if (state.mode === "server") return fetchServer();
    return null;
  }

  /* ດຶງຂໍ້ມູນລ່າສຸດຈາກຖານຂໍ້ມູນ; ຖ້າ rev ປ່ຽນ → ອັບເດດໃນໜ່ວຍຄວາມຈຳ ແລະ ແຈ້ງໜ້າທີ່ເປີດຢູ່ */
  async function refresh(force) {
    if (state.mode !== "supabase" && state.mode !== "server") return false;
    const now = Date.now();
    if (!force && now - lastCheck < 2000) return false;
    if (refreshing) return false;
    refreshing = true;
    lastCheck = now;
    try {
      const fresh = await fetchLatest();
      const rev = Number(fresh && fresh.rev) || 0;
      if (!force && rev === Number(state.rev || 0)) return false;
      applyData(fresh);
      state.rev = rev;
      state.connected = true;
      state.error = "";
      state.updatedAt = new Date().toISOString();
      state.counts = {
        rooms: ROOMS.length,
        tenants: TENANTS.length,
        invoices: Object.values(INVOICE_MONTHS).reduce((s, l) => s + l.length, 0)
      };
      paintStatus();
      /* ໃຫ້ໜ້າວາງແຕ້ມຄືນ: ຖ້າບໍ່ມີໜ້າໃດຮັບ (preventDefault) ຈະໂຫຼດໜ້າໃໝ່ */
      const handled = !document.dispatchEvent(new CustomEvent("db:datachanged", { cancelable: true }));
      if (!handled && !isEditing()) location.reload();
      return true;
    } catch (e) {
      return false;
    } finally {
      refreshing = false;
    }
  }

  (function watchData() {
    const check = () => {
      refresh();
    };
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) check();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) check();
    });
    window.addEventListener("storage", (e) => {
      if (e.key === PING_KEY) check();
    });
  })();

  async function boot() {
    // 0) ຖ້າຕັ້ງຄ່າ Supabase ໄວ້ — ໃຊ້ຖານຂໍ້ມູນຈິງເປັນຫຼັກ (ບໍ່ຂຽນລົງ SQLite ທ້ອງຖິ່ນ)
    if (isConfigured() && isSupabase()) {
      state.mode = "supabase";
      try {
        const data = await fetchSupabase();
        state.rev = data.rev || 0;
        const empty = !data.rooms.length && !data.tenants.length && !data.invoices.length;
        if (empty) {
          state.connected = true;
          state.counts = { rooms: 0, tenants: 0, invoices: 0 };
          state.error = "ຖານຂໍ້ມູນຍັງຫວ່າງ — ເບິ່ງວິທີຍ້າຍຂໍ້ມູນໃນໜ້າຖານຂໍ້ມູນ";
        } else {
          applyData(data);
          state.connected = true;
          state.error = "";
          state.updatedAt = new Date().toISOString();
          state.counts = {
            rooms: ROOMS.length,
            tenants: TENANTS.length,
            invoices: Object.values(INVOICE_MONTHS).reduce((s, l) => s + l.length, 0)
          };
        }
      } catch (e) {
        state.connected = false;
        state.error = e.message;
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            applyData(JSON.parse(cached));
          } catch (err) {
            /* cache ເສຍ — ໃຊ້ຂໍ້ມູນຕົວຢ່າງ */
          }
        }
        state.counts = {
          rooms: ROOMS.length,
          tenants: TENANTS.length,
          invoices: Object.values(INVOICE_MONTHS).reduce((s, l) => s + l.length, 0)
        };
      }
      paintStatus();
      readyResolve(state);
      return state;
    }

    // 1) ເມື່ອເປີດຜ່ານ server.py ຈະມີ REST API + ຖານຂໍ້ມູນ SQLite ພ້ອມໃຊ້
    try {
      const data = await fetchServer();
      state.mode = "server";
      state.connected = true;
      state.rev = data.rev || 0;
      if (data.rooms.length || data.tenants.length || data.invoices.length) {
        applyData(data);
      } else {
        // ຖານຂໍ້ມູນຫວ່າງ — ໃສ່ຂໍ້ມູນຕົວຢ່າງໃຫ້ອັດຕະໂນມັດ
        state.counts = {
          rooms: ROOMS.length,
          tenants: TENANTS.length,
          invoices: Object.values(INVOICE_MONTHS).reduce((s, l) => s + l.length, 0)
        };
        await saveServer();
      }
      // ຖ້າສະຖານະຫ້ອງຖືກແກ້ໃຫ້ກົງກັບທະບຽນຜູ້ເຊົ່າ — ບັນທຶກການແກ້ນັ້ນລົງຖານຂໍ້ມູນເລີຍ
      if (state.roomsSynced) {
        try {
          await saveServer();
        } catch (e) {
          state.error = e.message;
        }
      }
      state.updatedAt = new Date().toISOString();
      paintStatus();
      readyResolve(state);
      return state;
    } catch (e) {
      /* ບໍ່ມີ API — ລອງ Turso ຫຼື ເບົາຣ໌ເຊີຕໍ່ໄປ */
    }

    // 2) ຖ້າຕັ້ງຄ່າ Turso ໄວ້ — ໃຊ້ຖານຂໍ້ມູນຄລາວ
    if (!isConfigured()) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          applyData(JSON.parse(cached));
        } catch (e) {
          /* cache ເສຍ — ໃຊ້ຂໍ້ມູນຕົວຢ່າງ */
        }
      }
      state.mode = "local";
      state.counts = {
        rooms: ROOMS.length,
        tenants: TENANTS.length,
        invoices: Object.values(INVOICE_MONTHS).reduce((s, l) => s + l.length, 0)
      };
      paintStatus();
      readyResolve(state);
      return state;
    }

    state.mode = "cloud";
    try {
      const data = await fetchCloud();
      const empty = !data.rooms.length && !data.tenants.length && !data.invoices.length;
      if (empty) {
        // ຖານຂໍ້ມູນຫວ່າງ — ສະແດງຂໍ້ມູນຕົວຢ່າງ ແລ້ວໃຫ້ຜູ້ໃຊ້ກົດ "ອັບໂຫຼດຂໍ້ມູນ" ໃນໜ້າ database.html
        state.error = "ຖານຂໍ້ມູນຍັງຫວ່າງ — ກົດ 'ອັບໂຫຼດຂໍ້ມູນ' ໃນໜ້າຖານຂໍ້ມູນ";
        state.connected = true;
      } else {
        applyData(data);
        state.connected = true;
        state.error = "";
        state.updatedAt = new Date().toISOString();
      }
    } catch (e) {
      state.connected = false;
      state.error = e.message;
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          applyData(JSON.parse(cached));
        } catch (err) {
          /* ignore */
        }
      }
      state.counts = {
        rooms: ROOMS.length,
        tenants: TENANTS.length,
        invoices: Object.values(INVOICE_MONTHS).reduce((s, l) => s + l.length, 0)
      };
    }
    paintStatus();
    readyResolve(state);
    return state;
  }

  /* ---------------- ຄຳສັ່ງຈາກໜ້າ database.html ---------------- */
  const SCHEMA = [
    `CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, floor INTEGER NOT NULL DEFAULT 1, room_type TEXT NOT NULL DEFAULT '1 ຫ້ອງນອນ', rent INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'vacant', tenant TEXT, phone TEXT, meter_elec INTEGER NOT NULL DEFAULT 0, meter_water INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS tenants (room TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT, contract TEXT, move_in TEXT, people INTEGER NOT NULL DEFAULT 1, deposit INTEGER NOT NULL DEFAULT 0, rent INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, year INTEGER NOT NULL, month INTEGER NOT NULL, room TEXT NOT NULL, tenant TEXT, kwh INTEGER NOT NULL DEFAULT 0, m3 INTEGER NOT NULL DEFAULT 0, rent INTEGER NOT NULL DEFAULT 0, service INTEGER NOT NULL DEFAULT 0, other_fee INTEGER NOT NULL DEFAULT 0, paid INTEGER NOT NULL DEFAULT 0, due TEXT)`,
    `CREATE TABLE IF NOT EXISTS repairs (id TEXT PRIMARY KEY, room TEXT NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'other', priority TEXT NOT NULL DEFAULT 'normal', status TEXT NOT NULL DEFAULT 'open', assignee TEXT, phone TEXT, cost INTEGER NOT NULL DEFAULT 0, reported TEXT, due TEXT, done TEXT, note TEXT)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices (year, month)`,
    `CREATE INDEX IF NOT EXISTS idx_invoices_room ON invoices (room)`,
    `CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs (status)`
  ];

  async function test() {
    if (isSupabase()) {
      const data = await sbRpc("apt_load", {});
      return { ok: true, rooms: (data && data.rooms && data.rooms.length) || 0, rev: (data && data.rev) || 0 };
    }
    const [res] = await exec([sql("SELECT 1 AS ok")]);
    return toObjects(res)[0];
  }

  async function ensureSchema() {
    if (isSupabase())
      throw new Error("Supabase ສ້າງຕາຕະລາງຈາກເວັບບໍ່ໄດ້ — ໃຫ້ run db/supabase-schema.sql ໃນ Supabase → SQL Editor");
    await exec(SCHEMA.map((s) => sql(s)));
    return true;
  }

  async function seed() {
    // ຂຽນຂໍ້ມູນປັດຈຸບັນ (ຕົວຢ່າງ ຫຼື ທີ່ແກ້ໄຂໄວ້) ລົງຖານຂໍ້ມູນ
    state.mode = isSupabase() ? "supabase" : "cloud";
    const ok = await save();
    if (!ok) throw new Error(state.error);
    return true;
  }

  function setConfig(url, token, prov) {
    const u = String(url || "").trim();
    const providerName = prov || (/supabase/i.test(u) ? "supabase" : "turso");
    config = { url: u, token: String(token || "").trim(), provider: providerName };
    localStorage.setItem(CFG_KEY, JSON.stringify(config));
  }

  function clearConfig() {
    localStorage.removeItem(CFG_KEY);
    config = { url: "", token: "", provider: "" };
  }

  const cfg = () => ({ ...config });

  return {
    ready,
    state,
    boot,
    syncRooms,
    save,
    refresh,
    test,
    ensureSchema,
    seed,
    setConfig,
    clearConfig,
    cfg,
    isConfigured,
    provider,
    isSupabase,
    getViewMonth,
    setViewMonth,
    endpoint,
    paintStatus,
    SCHEMA
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  DB.boot();
});
