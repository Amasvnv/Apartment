import { defaultSettings, seedData } from "./seed";
import type { AppData, DbMode, Invoice, Repair, Room, Tenant } from "./types";

const CFG_KEY = "db.config";
const CACHE_KEY = "db.cache";
const TOKEN_KEY = "apt.token";
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

/* ---------------- session token (apt-api) ---------------- */

let tokenCache: string | null = null;

export function readToken(): string | null {
  if (tokenCache !== null) return tokenCache;
  try {
    tokenCache = sessionStorage.getItem(TOKEN_KEY);
  } catch {
    tokenCache = null;
  }
  return tokenCache;
}

export function saveToken(token: string | null) {
  tokenCache = token;
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** apt-api ຍັງບໍ່ມີ / ບໍ່ພ້ອມ — ໃຫ້ໃຊ້ເສັ້ນທາງເກົ່າ (PostgREST) ໄປກ່ອນ */
export class ApiUnavailableError extends Error {}

const LEGACY_KEY = "apt.legacy";
const LEGACY_TTL_MS = 3 * 60 * 1000;
const API_RETRY_MS = 60 * 1000;

let apiState: "unknown" | "ok" | "down" = "unknown";
let apiRetryAt = 0;

/** ກຳລັງໃຊ້ເສັ້ນທາງເກົ່າ (ບໍ່ດົນກວ່າ 10 ນາທີ ແລ້ວລອງ apt-api ຄືນ) */
export function isLegacyMode(): boolean {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at) || Date.now() - at > LEGACY_TTL_MS) {
      localStorage.removeItem(LEGACY_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function setLegacyMode(on: boolean) {
  try {
    if (on) localStorage.setItem(LEGACY_KEY, String(Date.now()));
    else localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

function markApiOk() {
  apiState = "ok";
  apiRetryAt = 0;
  setLegacyMode(false);
}

function markApiDown(latchToLegacy = true) {
  apiState = "down";
  apiRetryAt = Date.now() + API_RETRY_MS;
  // latch ເສັ້ນທາງເກົ່າສະເພາະຕອນຮູ້ແນ່ນອນວ່າ function ບໍ່ມີ (404/503 ຯລ)”
  if (latchToLegacy) setLegacyMode(true);
}

function apiUsable(): boolean {
  if (isLegacyMode()) return false;
  if (apiState === "down" && Date.now() < apiRetryAt) return false;
  return true;
}

function notifyUnauthorized() {
  saveToken(null);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("apt:unauthorized"));
}

/* ---------------- Edge Function apt-api ---------------- */

function apiUrl(config: DbConfig): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return `${config.url.trim().replace(/\/+$/, "")}/functions/v1/apt-api`;
}

/* ສະຖານະທີ່ໝາຍວ່າ Edge Function ຍັງບໍ່ມີ / ບໍ່ພ້ອມ (ບໍ່ໄດ້ຮັບ request ແນ່ນອນ) */
const UNAVAILABLE_STATUS = new Set([404, 405, 501, 503, 504]);

async function apiCall<T>(config: DbConfig, action: string, body: Record<string, unknown> = {}): Promise<T> {
  if (!apiUsable()) throw new ApiUnavailableError("apt-api ຍັງບໍ່ພ້ອມ");

  const token = readToken();
  let res: Response;
  try {
    res = await fetch(apiUrl(config), {
      method: "POST",
      headers: {
        apikey: config.token,
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ action, ...(token ? { token } : {}), ...body })
    });
  } catch {
    // ບໍ່ມີ function (CORS/404 preflight) ຫຼື ເຄືອຂ່າຍລົ້ມ → ລອງເສັ້ນທາງເກົ່າໄດ້ ແຕ່ບໍ່ latch
    markApiDown(false);
    throw new ApiUnavailableError("apt-api ເຊື່ອມຕໍ່ບໍ່ໄດ້");
  }

  if (UNAVAILABLE_STATUS.has(res.status)) {
    markApiDown();
    throw new ApiUnavailableError(`apt-api ຍັງບໍ່ພ້ອມ (HTTP ${res.status})`);
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  const message = (data as { error?: string } | null)?.error;

  if (res.status === 401) {
    notifyUnauthorized();
    throw new ApiError(401, message || "session ໝົດອາຍຸ — ເຂົ້າສູ່ລະບົບໃໝ່");
  }
  if (res.status === 409 && message === "conflict") {
    throw new ApiError(409, "ຂໍ້ມູນຖືກແກ້ໄຂຈາກໜ້າອື່ນ — ກຳລັງໂຫຼດຂໍ້ມູນໃໝ່");
  }
  if (!res.ok) {
    throw new ApiError(res.status, message || `apt-api HTTP ${res.status}`);
  }
  markApiOk();
  return data as T;
}

/* ---------------- ເສັ້ນທາງເກົ່າ (PostgREST RPC) — ໃຊ້ຈົນກວ່າ apt-api ຈະພ້ອມ ---------------- */

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

export function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

/* ---------------- apt-api: load / save ---------------- */

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

async function legacyLoad(config: DbConfig): Promise<AppData> {
  const raw = (await sbRpc(config, "apt_load", {})) as SupabaseRows;
  if (!raw || !Array.isArray(raw.rooms)) throw new Error("Supabase ຕອບກັບຂໍ້ມູນບໍ່ຖືກຮູບແບບ");
  return fromRows(raw);
}

export async function loadSupabase(config: DbConfig): Promise<AppData> {
  if (isLegacyMode()) return await legacyLoad(config);
  try {
    const raw = await apiCall<SupabaseRows>(config, "load");
    if (!raw || !Array.isArray(raw.rooms)) throw new Error("apt-api ຕອບກັບຂໍ້ມູນບໍ່ຖືກຮູບແບບ");
    return fromRows(raw);
  } catch (error) {
    if (error instanceof ApiUnavailableError) return await legacyLoad(config);
    throw error;
  }
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
  // ເສັ້ນທາງເກົ່າ: ຖ້າ apt-api ຍັງບໍ່ມີ (login ຕົກລົງມານີ້ແລ້ວ)
  if (isLegacyMode()) return await legacySave(config, data, rev);

  try {
    const response = await apiCall<{ rev?: number }>(config, "save", {
      payload: supabasePayload(data),
      expectedRev: rev
    });
    return Number(response?.rev ?? rev + 1);
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      // apt_save ມີ rev guard ຢູ່ແລ້ວ — ຖ້າ request ກ່ອນໜ້າໄດ້ຂຽນໄປແລ້ວ ການຂຽນຊ້ຳຈະໄດ້ conflict ແລະ ບໍ່ທັບ
      return await legacySave(config, data, rev);
    }
    throw error;
  }
}

async function legacySave(config: DbConfig, data: AppData, rev: number): Promise<number> {
  const response = (await sbRpc(config, "apt_save", {
    payload: supabasePayload(data),
    expected_rev: rev
  })) as { error?: string; rev?: number } | null;
  if (response?.error === "conflict") {
    throw new ApiError(409, "ຂໍ້ມູນຖືກແກ້ໄຂຈາກໜ້າອື່ນ — ກຳລັງໂຫຼດຂໍ້ມູນໃໝ່");
  }
  return Number(response?.rev ?? rev + 1);
}

/* ---------------- apt-api: login / logout / public bill ---------------- */

export interface ApiUser {
  id: string;
  name: string;
  role: string;
  perms: Record<string, string[]>;
  active: boolean;
  hasPin?: boolean;
}

export interface LoginResult {
  token: string;
  expiresAt: string;
  user: ApiUser;
}

/** ເຂົ້າສູ່ລະບົບເສັ້ນທາງເກົ່າ: ກວດ PIN ຈາກ settings.users (ໃຊ້ຈົນກວ່າ apt-api ຈະ deploy) */
async function loginLegacy(config: DbConfig, identifier: string, pin: string): Promise<LoginResult> {
  const raw = (await sbRpc(config, "apt_load", {})) as {
    settings?: { users?: (ApiUser & { pin?: string })[] };
  };
  const users = raw?.settings?.users ?? [];
  const needle = identifier.trim().toLowerCase();
  const user =
    users.find((item) => item.id === identifier) ||
    users.find((item) => String(item.name || "").trim().toLowerCase() === needle);

  if (!user) throw new ApiError(401, "ບໍ່ພົບຜູ້ໃຊ້");
  if (user.active === false) throw new ApiError(403, "ຜູ້ໃຊ້ນີ້ຖືກປິດໃຊ້ງານ");
  if (!user.pin) throw new ApiError(401, "ຜູ້ໃຊ້ນີ້ຍັງບໍ່ມີ PIN — ໃຫ້ຜູ້ຈັດການຕັ້ງ PIN");
  if (String(pin).replace(/\D/g, "") !== String(user.pin)) {
    throw new ApiError(401, "ຊື່ຜູ້ໃຊ້ ຫຼື PIN ບໍ່ຖືກ");
  }

  setLegacyMode(true);
  saveToken(null);
  return {
    token: "",
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    user: { ...user, hasPin: true }
  };
}

export async function loginApi(config: DbConfig, identifier: string, pin: string): Promise<LoginResult> {
  if (isLegacyMode()) return await loginLegacy(config, identifier, pin);

  let result: LoginResult;
  try {
    result = await apiCall<LoginResult>(config, "login", { user: identifier, pin });
  } catch (error) {
    // ຍັງບໍ່ມີ function → ໃຫ້ເວັບທີ່ deploy ແລ້ວຍັງ login ໄດ້ແບບເກົ່າ
    if (error instanceof ApiUnavailableError) return await loginLegacy(config, identifier, pin);
    throw error;
  }
  if (!result?.token) throw new ApiError(502, "apt-api ບໍ່ໄດ້ສົ່ງ token");
  saveToken(result.token);
  return result;
}

export async function logoutApi(config: DbConfig | null): Promise<void> {
  const token = readToken();
  if (config && token && !isLegacyMode()) {
    try {
      await apiCall(config, "logout", {});
    } catch {
      /* token ໝົດອາຍຸ ຫຼື ເຄືອຂ່າຍລົ້ມ — ລຶບຝ່າຍ client ຕໍ່ */
    }
  }
  saveToken(null);
  setLegacyMode(false);
}

export interface PublicBillRoom {
  id: string;
  room_type: string;
  floor: number;
}

export interface PublicBillPayload {
  found: boolean;
  invoice?: Record<string, unknown> | null;
  invoices?: Record<string, unknown>[];
  room?: PublicBillRoom | null;
  tenant_name?: string | null;
  tenants?: { room: string; people: number; stay_status: string }[];
  repairs?: Record<string, unknown>[];
  settings?: Partial<AppData["settings"]>;
}

/** ເສັ້ນທາງເກົ່າ: ດຶງຜ່ານ apt_load ແລ້ວເລືອກສະເພາະຫ້ອງ (ໃຊ້ຈົນກວ່າ apt-api ຈະ deploy) */
async function legacyPublicBill(config: DbConfig, room: string): Promise<PublicBillPayload> {
  const raw = (await sbRpc(config, "apt_load", {})) as SupabaseRows & {
    settings?: AppData["settings"];
  };
  const roomInvoices = (raw.invoices || [])
    .filter((item) => String(item.room) === room)
    .sort(
      (a, b) =>
        Number(b.year) * 12 + Number(b.month) - (Number(a.year) * 12 + Number(a.month))
    );
  if (!roomInvoices.length) return { found: false };

  const toRow = (item: Record<string, unknown>) => ({
    id: item.id,
    year: item.year,
    month: item.month,
    room: item.room,
    tenant: item.tenant,
    kwh: item.kwh,
    m3: item.m3,
    rent: item.rent,
    service: item.service,
    other: item.other_fee,
    paid: item.paid,
    due: item.due
  });
  const roomRow = (raw.rooms || []).find((item) => String(item.id) === room);

  return {
    found: true,
    invoice: toRow(roomInvoices[0]),
    invoices: roomInvoices.map(toRow),
    room: roomRow
      ? {
          id: String(roomRow.id ?? room),
          room_type: String(roomRow.room_type ?? "1 ຫ້ອງນອນ"),
          floor: Number(roomRow.floor) || 1
        }
      : null,
    tenant_name: String((raw.tenants || []).find((item) => String(item.room) === room)?.name ?? ""),
    tenants: (raw.tenants || []).map((item) => ({
      room: String(item.room ?? ""),
      people: Number(item.people) || 1,
      stay_status: String(item.stay_status ?? "resident")
    })),
    repairs: (raw.repairs || [])
      .filter((item) => String(item.room) === room)
      .map((item) => ({
        id: item.id,
        room: item.room,
        title: item.title,
        status: item.status,
        reported: item.reported
      })),
    settings: raw.settings as Partial<AppData["settings"]>
  };
}

export async function fetchPublicBill(config: DbConfig, room: string): Promise<PublicBillPayload> {
  if (isLegacyMode()) return await legacyPublicBill(config, room);
  try {
    return await apiCall<PublicBillPayload>(config, "public_bill", { room });
  } catch (error) {
    if (error instanceof ApiUnavailableError) return await legacyPublicBill(config, room);
    throw error;
  }
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
    // ບໍ່ມີ token ແລະ ບໍ່ໄດ້ຢູ່ໃນເສັ້ນທາງເກົ່າ → ຍັງບໍ່ຕ້ອງຍິງ request (apt-api ຈະຕອບ 401)
    if (!readToken() && !isLegacyMode()) {
      return { data: loadCached() || seedData(), mode: "local", rev: 0 };
    }
    try {
      const data = await loadSupabase(config);
      return { data, mode: "supabase", rev: data.rev || 0 };
    } catch (error) {
      const cached = loadCached();
      return {
        data: cached || seedData(),
        mode: "local",
        rev: 0,
        error: error instanceof Error ? error.message : "ເຊື່ອມຕໍ່ apt-api ບໍ່ໄດ້"
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
