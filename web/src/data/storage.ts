import { defaultSettings, seedData } from "./seed";
import type { AppData, DbMode, Invoice, Repair, Room, Tenant } from "./types";

const CFG_KEY = "db.config";
const CACHE_KEY = "db.cache";
const API_STATE = "/api/state";

export interface DbConfig {
  url: string;
  token: string;
  provider?: string;
}

export function readConfig(): DbConfig | null {
  try {
    const raw = JSON.parse(localStorage.getItem(CFG_KEY) || "null") as DbConfig | null;
    if (raw && raw.url && raw.token) {
      return { url: String(raw.url).trim(), token: String(raw.token).trim(), provider: raw.provider };
    }
  } catch {
    /* ignore broken localStorage config */
  }
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const token = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (url && token) return { url, token, provider: "supabase" };
  const shipped = typeof window !== "undefined" ? window.DB_CONFIG : undefined;
  if (shipped && shipped.url && shipped.token) {
    return { url: String(shipped.url), token: String(shipped.token), provider: shipped.provider || "supabase" };
  }
  return null;
}

export function saveConfig(config: DbConfig | null) {
  if (config) localStorage.setItem(CFG_KEY, JSON.stringify(config));
  else localStorage.removeItem(CFG_KEY);
}

function normalizeSettings(raw: Partial<AppData["settings"]> | null | undefined): AppData["settings"] {
  return {
    ...defaultSettings(),
    ...(raw || {}),
    rentByMonth: { ...(raw?.rentByMonth || {}) },
    ratesByMonth: { ...(raw?.ratesByMonth || {}) },
    monthNotes: { ...(raw?.monthNotes || {}) },
    monthNotes2: { ...(raw?.monthNotes2 || {}) },
    extraFeesByMonth: { ...(raw?.extraFeesByMonth || {}) },
    tenantsByMonth: { ...(raw?.tenantsByMonth || {}) },
    meterReadings: { ...(raw?.meterReadings || {}) },
    activity: Array.isArray(raw?.activity) ? raw!.activity! : [],
    users: Array.isArray(raw?.users) && raw!.users!.length ? raw!.users! : defaultSettings().users,
    current: raw?.current || defaultSettings().current
  };
}

export function normalizeData(raw: Partial<AppData> | null | undefined): AppData {
  const base: AppData = {
    settings: normalizeSettings(raw?.settings),
    rooms: Array.isArray(raw?.rooms) ? raw!.rooms! : [],
    tenants: Array.isArray(raw?.tenants) ? raw!.tenants! : [],
    invoices: Array.isArray(raw?.invoices) ? raw!.invoices! : [],
    repairs: Array.isArray(raw?.repairs) ? raw!.repairs! : [],
    rev: Number(raw?.rev) || 0
  };
  return base;
}

/* ---------------- localStorage cache ---------------- */

export function loadCached(): AppData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    if (!parsed || !Array.isArray(parsed.rooms)) return null;
    return normalizeData(parsed);
  } catch {
    return null;
  }
}

export function saveCached(data: AppData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, rev: undefined }));
  } catch {
    /* storage full — keep working in memory */
  }
}

/* ---------------- Supabase (PostgREST RPC) ---------------- */

async function sbRpc(config: DbConfig, name: string, body: unknown): Promise<unknown> {
  const base = config.url.trim().replace(/\/+$/, "");
  const res = await fetch(`${base}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: config.token,
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase HTTP ${res.status}${text ? " · " + text.slice(0, 160) : ""}`);
  return text ? JSON.parse(text) : null;
}

interface SupabaseRows {
  rooms?: Record<string, unknown>[];
  tenants?: Record<string, unknown>[];
  invoices?: Record<string, unknown>[];
  repairs?: Record<string, unknown>[];
  settings?: Partial<AppData["settings"]>;
  rev?: number;
}

function fromRows(rows: SupabaseRows): AppData {
  return normalizeData({
    rooms: (rows.rooms || []).map(
      (r): Room => ({
        no: String(r.id ?? ""),
        floor: Number(r.floor) || 1,
        type: String(r.room_type ?? "1 ຫ້ອງນອນ"),
        rent: Number(r.rent) || 0,
        status: (r.status as Room["status"]) || "vacant",
        tenant: (r.tenant as string | null) ?? null,
        phone: (r.phone as string | null) ?? null,
        meterElec: Number(r.meter_elec) || 0,
        meterWater: Number(r.meter_water) || 0
      })
    ),
    tenants: (rows.tenants || []).map(
      (t): Tenant => ({
        name: String(t.name ?? ""),
        phone: String(t.phone ?? ""),
        room: String(t.room ?? ""),
        contract: String(t.contract ?? ""),
        moveIn: String(t.move_in ?? ""),
        people: Number(t.people) || 1,
        deposit: Number(t.deposit) || 0,
        rent: Number(t.rent) || 0,
        stayStatus: (t.stay_status as Tenant["stayStatus"]) || "resident"
      })
    ),
    invoices: (rows.invoices || []).map(
      (i): Invoice => ({
        no: String(i.id ?? ""),
        room: String(i.room ?? ""),
        tenant: String(i.tenant ?? ""),
        kwh: Number(i.kwh) || 0,
        m3: Number(i.m3) || 0,
        rent: Number(i.rent) || 0,
        service: Number(i.service) || 0,
        other: Number(i.other_fee) || 0,
        paid: !!i.paid,
        due: String(i.due ?? ""),
        year: Number(i.year) || 0,
        month: Number(i.month) || 0
      })
    ),
    repairs: (rows.repairs || []).map(
      (r): Repair => ({
        id: String(r.id ?? ""),
        room: String(r.room ?? ""),
        title: String(r.title ?? ""),
        category: (r.category as Repair["category"]) || "other",
        priority: (r.priority as Repair["priority"]) || "normal",
        status: (r.status as Repair["status"]) || "open",
        assignee: String(r.assignee ?? ""),
        phone: String(r.phone ?? ""),
        cost: Number(r.cost) || 0,
        reported: String(r.reported ?? ""),
        due: String(r.due ?? ""),
        done: String(r.done ?? ""),
        note: String(r.note ?? "")
      })
    ),
    settings: rows.settings as AppData["settings"] | undefined,
    rev: Number(rows.rev) || 0
  });
}

export async function loadSupabase(config: DbConfig): Promise<AppData> {
  const raw = (await sbRpc(config, "apt_load", {})) as SupabaseRows;
  if (!raw || !Array.isArray(raw.rooms)) throw new Error("Supabase ຕອບກັບຂໍ້ມູນບໍ່ຖືກຮູບແບບ");
  return fromRows(raw);
}

function supabasePayload(data: AppData) {
  return {
    rooms: data.rooms.map((r) => ({
      id: String(r.no),
      floor: Number(r.floor) || 1,
      room_type: r.type || "1 ຫ້ອງນອນ",
      rent: Number(r.rent) || 0,
      status: r.status || "vacant",
      tenant: r.tenant ?? null,
      phone: r.phone ?? null,
      meter_elec: Number(r.meterElec) || 0,
      meter_water: Number(r.meterWater) || 0
    })),
    tenants: data.tenants.map((t) => ({
      room: String(t.room),
      name: t.name || "",
      phone: t.phone || null,
      contract: t.contract || null,
      move_in: t.moveIn || null,
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
      tenant: i.tenant || null,
      kwh: Number(i.kwh) || 0,
      m3: Number(i.m3) || 0,
      rent: Number(i.rent) || 0,
      service: Number(i.service) || 0,
      other_fee: Number(i.other) || 0,
      paid: i.paid ? 1 : 0,
      due: i.due || null
    })),
    repairs: data.repairs.map((r) => ({
      id: String(r.id),
      room: String(r.room || ""),
      title: r.title || "",
      category: r.category || "other",
      priority: r.priority || "normal",
      status: r.status || "open",
      assignee: r.assignee || null,
      phone: r.phone || null,
      cost: Number(r.cost) || 0,
      reported: r.reported || null,
      due: r.due || null,
      done: r.done || null,
      note: r.note || null
    })),
    settings: {
      rent: data.settings.rent,
      rentByMonth: data.settings.rentByMonth,
      ratesByMonth: data.settings.ratesByMonth,
      electricRate: data.settings.electricRate,
      waterRate: data.settings.waterRate,
      waterTotal: data.settings.waterTotal,
      serviceFee: data.settings.serviceFee,
      trashFee: data.settings.trashFee,
      trashTotal: data.settings.trashTotal,
      extraFeesByMonth: data.settings.extraFeesByMonth,
      tenantsByMonth: data.settings.tenantsByMonth,
      monthNotes: data.settings.monthNotes,
      monthNotes2: data.settings.monthNotes2,
      meterReadings: data.settings.meterReadings,
      activity: (data.settings.activity || []).slice(0, 500),
      users: data.settings.users
    }
  };
}

export async function saveSupabase(config: DbConfig, data: AppData, rev: number): Promise<number> {
  const response = (await sbRpc(config, "apt_save", {
    payload: supabasePayload(data),
    expected_rev: rev
  })) as { error?: string; rev?: number } | null;
  if (response && response.error === "conflict") {
    throw new Error("ຂໍ້ມູນຖືກແກ້ໄຂຈາກໜ້າອື່ນ — ກຳລັງໂຫຼດຂໍ້ມູນໃໝ່");
  }
  return Number(response?.rev ?? rev + 1);
}

/* ---------------- local python API (SQLite) ---------------- */

export async function loadApi(): Promise<AppData> {
  const res = await fetch(API_STATE, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) throw new Error("API HTTP " + res.status);
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error("ບໍ່ພົບ API");
  const data = (await res.json()) as Partial<AppData>;
  if (!data || !Array.isArray(data.rooms)) throw new Error("ບໍ່ພົບ API");
  return normalizeData(data);
}

export async function saveApi(data: AppData, rev: number): Promise<number> {
  const res = await fetch(API_STATE, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, rev })
  });
  if (res.status === 409) throw new Error("ຂໍ້ມູນຖືກແກ້ໄຂຈາກໜ້າອື່ນ — ກຳລັງໂຫຼດຂໍ້ມູນໃໝ່");
  if (!res.ok) throw new Error("ບັນທຶກບໍ່ສຳເລັດ (HTTP " + res.status + ")");
  const json = (await res.json()) as { rev?: number };
  return Number(json.rev ?? rev + 1);
}

/* ---------------- boot ---------------- */

export interface LoadedData {
  data: AppData;
  mode: DbMode;
  rev: number;
  error?: string;
}

export async function loadData(): Promise<LoadedData> {
  const config = readConfig();
  if (config) {
    try {
      const data = await loadSupabase(config);
      return { data, mode: "supabase", rev: data.rev || 0 };
    } catch (error) {
      const cached = loadCached();
      return {
        data: cached || seedData(),
        mode: "local",
        rev: 0,
        error: error instanceof Error ? error.message : "ເຊື່ອມຕໍ່ Supabase ບໍ່ໄດ້"
      };
    }
  }
  try {
    const data = await loadApi();
    return { data, mode: "server", rev: data.rev || 0 };
  } catch {
    const cached = loadCached();
    if (cached) return { data: cached, mode: "local", rev: 0 };
    return { data: seedData(), mode: "local", rev: 0 };
  }
}
