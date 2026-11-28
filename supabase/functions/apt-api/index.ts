// apt-api — Supabase Edge Function
// ປະຕູດຽວສຳລັບການອ່ານ/ຂຽນຂໍ້ມູນອາພາດເມັນ. ຖື service_role ຢູ່ຝ່າຍ server ເທົ່ານັ້ນ —
// browser ບໍ່ເຫັນ key ນີ້ ແລະ ບໍ່ສາມາດເອີ້ນ PostgREST ໂດຍກົງໄດ້ຫຼັງ revoke.
//
// actions:
//   login          { userId, pin }                       → { token, expiresAt, user }
//   logout         { token }                             → { ok }
//   load           { token }                             → ຂໍ້ມູນທັງໝົດ (ບໍ່ມີ PIN)
//   save           { token, payload, expectedRev }       → { ok, rev }
//   set_pin        { token, userId, pin }                → { ok }
//   set_view_month { token, year, month }                → { ok }
//   public_bill    { room }                              → ໃບບີນລ່າສຸດຂອງຫ້ອງນັ້ນ
//   bootstrap_users{ }  + header x-bootstrap-secret      → ຍ້າຍ PIN ຈາກ settings ໄປ app_users
//
// ການ deploy ບໍ່ໄດ້ລວມຢູ່ໃນນີ້ — ເບິ່ງ README.md ໃນໂຟນເດີດຽວກັນ.

const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_ORIGINS = (Deno.env.get("APP_ORIGIN") ?? "https://amasvnv.github.io")
  .split(",")
  .map((item) => item.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const BOOTSTRAP_SECRET = Deno.env.get("BOOTSTRAP_SECRET") ?? "";

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 100_000;

const LOGIN_FAIL_WINDOW_MIN = 5;
const LOGIN_FAIL_MAX = 5;
const LOGIN_IP_WINDOW_MIN = 60;
const LOGIN_IP_MAX = 20;
const BILL_WINDOW_MIN = 10;
const BILL_MAX = 60;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("apt-api: ຕ້ອງມີ SUPABASE_URL ແລະ SUPABASE_SERVICE_ROLE_KEY");
}

/* ------------------------------------------------------------------ */
/* HTTP ພື້ນຖານ                                                        */
/* ------------------------------------------------------------------ */

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function isLocalOrigin(origin: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function corsHeaders(origin: string | null): Record<string, string> | null {
  if (!origin) return null;
  if (!APP_ORIGINS.includes(origin) && !isLocalOrigin(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-bootstrap-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400"
  };
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

/* ------------------------------------------------------------------ */
/* PostgREST (service_role)                                            */
/* ------------------------------------------------------------------ */

async function pg(path: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...((init.headers as Record<string, string> | undefined) ?? {})
    }
  });
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await pg(path, init);
  const text = await res.text();
  if (!res.ok) {
    console.error("apt-api: postgrest", path.split("?")[0], res.status, text.slice(0, 300));
    throw new HttpError(502, "ເຊື່ອມຕໍ່ຖານຂໍ້ມູນບໍ່ສຳເລັດ");
  }
  return (text ? JSON.parse(text) : null) as T;
}

async function rpc<T>(name: string, body: unknown): Promise<T> {
  return await rest<T>(`rpc/${name}`, { method: "POST", body: JSON.stringify(body ?? {}) });
}

/** ຄວາມປອດໄພພ້ອມໃຊ້ຫຼືຍັງ: ຕ້ອງມີຜູ້ໃຊ້ຢ່າງໜ້ອຍ 1 ໃນ app_users (ຫຼັງ bootstrap) */
async function securityReady(): Promise<boolean> {
  try {
    return (await countRows("app_users?select=id")) > 0;
  } catch {
    return false;
  }
}

async function countRows(path: string): Promise<number> {
  const res = await pg(path, { method: "HEAD", headers: { Prefer: "count=exact", Range: "0-0" } });
  const total = Number((res.headers.get("content-range") ?? "").split("/")[1]);
  return Number.isFinite(total) ? total : 0;
}

/* ------------------------------------------------------------------ */
/* Crypto: token + PIN hash                                            */
/* ------------------------------------------------------------------ */

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function pbkdf2(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, [
    "deriveBits"
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    key,
    256
  );
  return new Uint8Array(bits);
}

async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(pin, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index++) diff |= a[index] ^ b[index];
  return diff === 0;
}

async function verifyPin(pin: string, stored: unknown): Promise<boolean> {
  const parts = String(stored ?? "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  try {
    const expected = fromBase64(parts[3]);
    const actual = await pbkdf2(pin, fromBase64(parts[2]), iterations);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* ຜູ້ໃຊ້ ແລະ session                                                   */
/* ------------------------------------------------------------------ */

interface DbUser {
  id: string;
  name: string;
  role: string;
  perms: Record<string, string[]>;
  active: boolean;
  pin_hash?: string;
}

interface IncomingUser {
  id: string;
  name: string;
  role: string;
  perms: Record<string, string[]>;
  active: boolean;
  pin?: string;
}

type StoredUser = Omit<IncomingUser, "pin">;

function publicUser(user: DbUser, hasPin = false) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    perms: user.perms ?? {},
    active: user.active !== false,
    hasPin
  };
}

/** ຜູ້ໃຊ້ທີ່ບັນທຶກໃນ settings: ບໍ່ມີ pin ແລະ ບໍ່ມີ hasPin */
function storedUsers(list: IncomingUser[]): StoredUser[] {
  return list.map(({ pin: _pin, ...rest }) => rest);
}

/**
 * ຕັດ pin ອອກຈາກ settings ກ່ອນສົ່ງໃຫ້ client ແລະ ແທນດ້ວຍ hasPin
 * ເພື່ອໃຫ້ UI ຮູ້ວ່າຜູ້ໃຊ້ນີ້ມີ PIN ແລ້ວ ໂດຍບໍ່ເຜີຍຄ່າ PIN.
 */
function stripSettings(
  settings: unknown,
  pinIds: Set<string> = new Set()
): Record<string, unknown> | undefined {
  if (!settings || typeof settings !== "object") return undefined;
  const source = settings as Record<string, unknown>;
  const users = Array.isArray(source.users)
    ? (source.users as DbUser[]).map((user) => {
        const id = String(user?.id ?? "");
        return {
          id,
          name: String(user?.name ?? ""),
          role: String(user?.role ?? "staff"),
          perms: (user?.perms ?? {}) as Record<string, string[]>,
          active: user?.active !== false,
          hasPin: pinIds.has(id) || !!(user as { hasPin?: boolean })?.hasPin
        };
      })
    : [];
  return { ...source, users };
}

async function requireUser(token: unknown): Promise<DbUser> {
  if (typeof token !== "string" || token.length < 32) {
    throw new HttpError(401, "ຕ້ອງເຂົ້າສູ່ລະບົບ");
  }
  const tokenHash = await sha256Hex(token);
  const sessions = await rest<{ user_id: string; expires_at: string }[]>(
    `app_sessions?token_hash=eq.${tokenHash}&select=user_id,expires_at`
  );
  const session = sessions?.[0];
  if (!session) throw new HttpError(401, "session ໝົດອາຍຸ — ເຂົ້າສູ່ລະບົບໃໝ່");

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await pg(`app_sessions?token_hash=eq.${tokenHash}`, { method: "DELETE" }).catch(() => undefined);
    throw new HttpError(401, "session ໝົດອາຍຸ — ເຂົ້າສູ່ລະບົບໃໝ່");
  }

  const users = await rest<DbUser[]>(
    `app_users?id=eq.${encodeURIComponent(session.user_id)}&select=id,name,role,perms,active`
  );
  const user = users?.[0];
  if (!user || user.active === false) throw new HttpError(401, "ຜູ້ໃຊ້ນີ້ຖືກປິດໃຊ້ງານ");
  return user;
}

/* ------------------------------------------------------------------ */
/* Rate limit                                                          */
/* ------------------------------------------------------------------ */

async function recentCount(
  action: string,
  filter: { userId?: string; ip?: string; ok?: boolean },
  windowMinutes: number
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const query = [
    `action=eq.${action}`,
    "select=id",
    `at=gte.${encodeURIComponent(since)}`
  ];
  if (filter.userId) query.push(`user_id=eq.${encodeURIComponent(filter.userId)}`);
  if (filter.ip) query.push(`ip=eq.${encodeURIComponent(filter.ip)}`);
  if (filter.ok === false) query.push("ok=eq.false");
  return await countRows(`auth_attempts?${query.join("&")}`);
}

async function recordAttempt(
  action: string,
  userId: string | null,
  ip: string | null,
  ok: boolean
): Promise<void> {
  await rest("auth_attempts", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{ action, user_id: userId, ip, ok }])
  }).catch((error: unknown) => {
    console.error("apt-api: recordAttempt", error instanceof Error ? error.message : error);
  });
}

/* ------------------------------------------------------------------ */
/* actions                                                             */
/* ------------------------------------------------------------------ */

interface Ctx {
  body: Record<string, unknown>;
  ip: string | null;
  bootstrapSecret: string | null;
}

async function login({ body, ip }: Ctx) {
  if (!(await securityReady())) {
    throw new HttpError(503, "ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ app_users — ໃຫ້ run bootstrap_users ກ່ອນ");
  }

  const userId = String(body.userId ?? "").trim();
  const pin = String(body.pin ?? "").replace(/\D/g, "");
  if (!userId || pin.length < 4 || pin.length > 6) {
    throw new HttpError(400, "ຕ້ອງມີຊື່ຜູ້ໃຊ້ ແລະ PIN 4–6 ໂຕເລກ");
  }

  if ((await recentCount("login", { userId, ok: false }, LOGIN_FAIL_WINDOW_MIN)) >= LOGIN_FAIL_MAX) {
    throw new HttpError(429, "ລອງຜິດຫຼາຍຄັ້ງ — ລໍຖ້າ 5 ນາທີ ແລ້ວລອງໃໝ່");
  }
  if (ip && (await recentCount("login", { ip, ok: false }, LOGIN_IP_WINDOW_MIN)) >= LOGIN_IP_MAX) {
    throw new HttpError(429, "ຈາກເຄື່ອງນີ້ຫຼາຍເກີນໄປ — ລໍຖ້າ 1 ຊົ່ວໂມງ");
  }

  const users = await rest<DbUser[]>(
    `app_users?id=eq.${encodeURIComponent(userId)}&select=id,name,role,perms,active,pin_hash`
  );
  const user = users?.[0];
  const ok = !!user && user.active !== false && (await verifyPin(pin, user.pin_hash));

  if (!ok || !user) {
    await recordAttempt("login", userId, ip, false);
    throw new HttpError(401, "ຊື່ຜູ້ໃຊ້ ຫຼື PIN ບໍ່ຖືກ");
  }

  await recordAttempt("login", user.id, ip, true);

  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await rest("app_sessions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([
      { token_hash: await sha256Hex(token), user_id: user.id, expires_at: expiresAt, created_ip: ip }
    ])
  });

  // ເກັບກວາດ attempt ເກົ່າແບບ best-effort (ບໍ່ໃຫ້ໂຕະໃຫຍ່)
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  void pg(`auth_attempts?at=lt.${encodeURIComponent(cutoff)}`, { method: "DELETE" }).catch(() => undefined);

  return { token, expiresAt, user: publicUser(user, true) };
}

async function logout({ body }: Ctx) {
  const token = body.token;
  if (typeof token === "string" && token.length >= 32) {
    const tokenHash = await sha256Hex(token);
    await pg(`app_sessions?token_hash=eq.${tokenHash}`, { method: "DELETE" }).catch(() => undefined);
  }
  return { ok: true };
}

async function load({ body }: Ctx) {
  const user = await requireUser(body.token);
  if (!(await securityReady())) {
    throw new HttpError(503, "ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ app_users — ໃຫ້ run bootstrap_users ກ່ອນ");
  }
  const data = await rpc<Record<string, unknown>>("apt_load", {});

  // ຮູ້ວ່າຜູ້ໃຊ້ໃດມີ PIN ແລ້ວ (ບໍ່ສົ່ງຄ່າ PIN) — ຖ້າຍັງບໍ່ run schema ກໍ່ບໍ່ໃຫ້ load ລົ້ມ
  let pinIds = new Set<string>();
  try {
    const rows = await rest<{ id: string }[]>("app_users?select=id");
    pinIds = new Set((rows ?? []).map((row) => row.id));
  } catch (error) {
    console.error("apt-api: app_users ບໍ່ພ້ອມ", error instanceof Error ? error.message : error);
  }

  return { ...data, settings: stripSettings(data.settings, pinIds), user: publicUser(user, true) };
}

/** ອ່ານລາຍຊື່ຜູ້ໃຊ້ຈາກ payload; null = client ບໍ່ໄດ້ສົ່ງມາ (ບໍ່ຕ້ອງປ່ຽນ) */
function normalizeIncomingUsers(list: unknown, strict = false): IncomingUser[] | null {
  if (!Array.isArray(list)) return null;
  const seen = new Set<string>();
  const users: IncomingUser[] = [];
  for (const raw of list) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const id = String(item.id ?? "").trim();
    if (!id) continue;
    if (seen.has(id)) throw new HttpError(400, `ມີຜູ້ໃຊ້ id ຊ້ຳ: ${id}`);
    seen.add(id);
    let role = String(item.role ?? "staff");
    if (!["manager", "tech", "staff", "viewer"].includes(role)) {
      if (strict) throw new HttpError(400, `ບົດບາດຂອງ ${id} ບໍ່ຖືກຕ້ອງ: ${role}`);
      role = "staff";
    }
    const perms = item.perms;
    const digits = String(item.pin ?? "").replace(/\D/g, "");
    users.push({
      id,
      name: String(item.name ?? "").trim(),
      role,
      perms: perms && typeof perms === "object" && !Array.isArray(perms)
        ? (perms as Record<string, string[]>)
        : {},
      active: item.active !== false,
      pin: digits || undefined
    });
  }
  return users;
}

function userSignature(users: StoredUser[]): string {
  return JSON.stringify(
    users
      .map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role,
        perms: user.perms,
        active: user.active
      }))
      .sort((a, b) => a.id.localeCompare(b.id))
  );
}

interface UserSyncPlan {
  rows: Record<string, unknown>[];
  deactivate: string[];
  dropSessions: string[];
  created: string[];
  pins: number;
}

/** ກວດ ແລະ ກະກຽມການອັບເດດ app_users ຈາກ settings.users (ກ່ອນຂຽນຖານ) */
async function planUserSync(
  incoming: IncomingUser[],
  actor: DbUser,
  previousIds: Set<string>
): Promise<UserSyncPlan> {
  const existing = await rest<{ id: string; role: string; active: boolean }[]>(
    "app_users?select=id,role,active"
  );
  const byId = new Map((existing ?? []).map((row) => [row.id, row]));

  for (const item of incoming) {
    if (item.pin) {
      if (item.pin.length < 4 || item.pin.length > 6) {
        throw new HttpError(400, `PIN ຂອງ ${item.name || item.id} ຕ້ອງເປັນ 4–6 ໂຕເລກ`);
      }
      if (item.id !== actor.id && actor.role !== "manager") {
        throw new HttpError(403, "ປ່ຽນ PIN ຂອງຄົນອື່ນໄດ້ສະເພາະຜູ້ຈັດການ");
      }
    } else if (!byId.has(item.id)) {
      // ຜູ້ໃຊ້ໃໝ່ ຫຼື ຜູ້ທີ່ bootstrap ຂ້າມ (ຍັງບໍ່ມີ PIN ໃນລະບົບ)
      throw new HttpError(400, `ຜູ້ໃຊ້ ${item.name || item.id} ຍັງບໍ່ມີ PIN — ໃສ່ PIN 4–6 ໂຕເລກ`);
    }
  }

  const self = incoming.find((item) => item.id === actor.id);
  if (!self || !self.active) {
    throw new HttpError(400, "ບໍ່ສາມາດລຶບ ຫຼື ປິດຜູ້ໃຊ້ທີ່ກຳລັງໃຊ້ຢູ່");
  }
  if (!incoming.some((item) => item.active && item.role === "manager")) {
    throw new HttpError(400, "ຕ້ອງມີຜູ້ຈັດການຢ່າງໜ້ອຍ 1 ຄົນທີ່ເປີດໃຊ້ງານ");
  }

  const rows: Record<string, unknown>[] = [];
  const dropSessions: string[] = [];
  const created: string[] = [];
  let pins = 0;

  for (const item of incoming) {
    const before = byId.get(item.id);
    const changed = !before || before.role !== item.role || before.active !== item.active || !!item.pin;
    const row: Record<string, unknown> = {
      id: item.id,
      name: item.name,
      role: item.role,
      perms: item.perms,
      active: item.active,
      updated_at: new Date().toISOString()
    };
    if (item.pin) {
      row.pin_hash = await hashPin(item.pin);
      pins += 1;
    }
    rows.push(row);
    if (!before) created.push(item.id);
    if (changed && item.id !== actor.id) dropSessions.push(item.id);
  }

  // ປິດສະເພາະຜູ້ທີ່ເຄີຍຢູ່ໃນ settings.users ແລ້ວຖືກລຶບອອກ — ບໍ່ແຕະບັນຊີທີ່ສ້າງຈາກທາງນອກ
  const kept = new Set(incoming.map((item) => item.id));
  const deactivate = (existing ?? [])
    .filter((row) => previousIds.has(row.id) && !kept.has(row.id))
    .map((row) => row.id);

  return { rows, deactivate, dropSessions, created, pins };
}

async function applyUserSync(plan: UserSyncPlan): Promise<void> {
  await rest("app_users", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(plan.rows)
  });

  for (const id of plan.deactivate) {
    await rest(`app_users?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ active: false, updated_at: new Date().toISOString() })
    });
  }

  // ຜູ້ທີ່ຖືກປິດ/ປ່ຽນສິດ/ປ່ຽນ PIN ຕ້ອງເຂົ້າສູ່ລະບົບໃໝ່
  for (const id of new Set([...plan.deactivate, ...plan.dropSessions])) {
    await pg(`app_sessions?user_id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }).catch(
      () => undefined
    );
  }
}

async function save({ body }: Ctx) {
  const actor = await requireUser(body.token);
  if (actor.role === "viewer") throw new HttpError(403, "ຜູ້ເບິ່ງບໍ່ມີສິດແກ້ໄຂຂໍ້ມູນ");
  if (!(await securityReady())) {
    throw new HttpError(503, "ຍັງບໍ່ໄດ້ຕັ້ງຄ່າ app_users — ໃຫ້ run bootstrap_users ກ່ອນ");
  }

  const payload = body.payload;
  if (!payload || typeof payload !== "object") {
    throw new HttpError(400, "ຂໍ້ມູນທີ່ຈະບັນທຶກບໍ່ຖືກຮູບແບບ");
  }

  const next = payload as Record<string, unknown>;
  const nextSettings = (next.settings ?? {}) as Record<string, unknown>;
  const incoming = normalizeIncomingUsers(nextSettings.users, true);

  const current = await rpc<Record<string, unknown>>("apt_load", {});
  const currentSettings = (current.settings ?? {}) as Record<string, unknown>;
  const currentUsers = normalizeIncomingUsers(currentSettings.users) ?? [];

  const usersChanged = incoming
    ? userSignature(storedUsers(currentUsers)) !== userSignature(storedUsers(incoming))
    : false;

  if (usersChanged && actor.role !== "manager") {
    throw new HttpError(403, "ສະເພາະຜູ້ຈັດການປ່ຽນຜູ້ໃຊ້ ແລະ ສິດໄດ້");
  }

  // PIN ທີ່ຖືກແກ້ໃນໜ້າ Users ຈະຖືກ hash ລົງ app_users — ບໍ່ຕັດຖິ້ມງຽບໆ
  const pinEdits = (incoming ?? []).filter((item) => !!item.pin).length;
  const previousIds = new Set(currentUsers.map((item) => item.id));
  const plan =
    incoming && (usersChanged || pinEdits)
      ? await planUserSync(incoming, actor, previousIds)
      : null;

  // settings ເກັບສະເພາະ id/name/role/perms/active — ບໍ່ມີ pin
  next.settings = {
    ...nextSettings,
    users: storedUsers(incoming ?? currentUsers)
  };

  const expectedRev = typeof body.expectedRev === "number" ? body.expectedRev : null;
  const result = await rpc<Record<string, unknown>>("apt_save", { payload: next, expected_rev: expectedRev });

  if (result && result.error === "conflict") {
    return new Response(
      JSON.stringify({ error: "conflict", rev: result.rev }),
      {
        status: 409,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
      }
    );
  }

  if (plan && (plan.rows.length || plan.deactivate.length)) {
    try {
      await applyUserSync(plan);
    } catch (error) {
      console.error("apt-api: user sync", error instanceof Error ? error.message : error);
      return new Response(
        JSON.stringify({
          error: "ບັນທຶກຂໍ້ມູນແລ້ວ ແຕ່ອັບເດດຜູ້ໃຊ້/PIN ບໍ່ສຳເລັດ — ກະລຸນາບັນທຶກຄືນ",
          rev: result?.rev
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
        }
      );
    }
  }

  return {
    ...(result ?? { ok: true }),
    users: plan ? { updated: plan.rows.length - plan.created.length, created: plan.created.length, deactivated: plan.deactivate.length, pins: plan.pins } : null
  };
}

async function setPin({ body }: Ctx) {
  const user = await requireUser(body.token);
  const targetId = String(body.userId ?? "").trim();
  const pin = String(body.pin ?? "").replace(/\D/g, "");
  if (!targetId || pin.length < 4 || pin.length > 6) {
    throw new HttpError(400, "ຕ້ອງມີຜູ້ໃຊ້ ແລະ PIN 4–6 ໂຕເລກ");
  }
  if (user.id !== targetId && user.role !== "manager") {
    throw new HttpError(403, "ປ່ຽນ PIN ຂອງຄົນອື່ນໄດ້ສະເພາະຜູ້ຈັດການ");
  }

  const hash = await hashPin(pin);
  const rows = await rest<{ id: string }[]>(`app_users?id=eq.${encodeURIComponent(targetId)}&select=id`);
  if (!rows?.length) throw new HttpError(404, "ບໍ່ພົບຜູ້ໃຊ້");

  await rest(`app_users?id=eq.${encodeURIComponent(targetId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ pin_hash: hash, updated_at: new Date().toISOString() })
  });

  // ປ່ຽນ PIN ແລ້ວ ໃຫ້ session ເກົ່າອອກທັງໝົດ ຍົກເວັ້ນ session ທີ່ກຳລັງໃຊ້ຢູ່ນີ້
  const currentHash = await sha256Hex(String(body.token));
  await pg(
    `app_sessions?user_id=eq.${encodeURIComponent(targetId)}&token_hash=neq.${currentHash}`,
    { method: "DELETE" }
  ).catch(() => undefined);
  return { ok: true };
}

async function setViewMonth({ body }: Ctx) {
  await requireUser(body.token);
  const year = Number(body.year);
  const month = Number(body.month);
  if (!Number.isInteger(year) || !Number.isInteger(month) || year < 2026 || year > 2100 || month < 1 || month > 12) {
    throw new HttpError(400, "ເດືອນ 1–12 ແລະ ປີ 2026–2100");
  }
  return await rpc("apt_set_view_month", { p_year: year, p_month: month });
}

async function publicBill({ body, ip }: Ctx) {
  const room = String(body.room ?? "").trim();
  if (!room || room.length > 20) throw new HttpError(400, "ຕ້ອງມີເລກຫ້ອງ");

  if (ip && (await recentCount("public_bill", { ip }, BILL_WINDOW_MIN)) >= BILL_MAX) {
    throw new HttpError(429, "ເປີດເບິ່ງຫຼາຍເກີນໄປ — ລໍຖ້າໜ້ອຍໜຶ່ງ");
  }
  await recordAttempt("public_bill", null, ip, true);

  // ເກັບກວາດ attempt ເກົ່າແບບສຸ່ມ 5% (ບໍ່ໃຫ້ຕາຕະລະໃຫຍ່ຂຶ້ນເລື້ອຍໆ)
  if (Math.random() < 0.05) {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    void pg(`auth_attempts?at=lt.${encodeURIComponent(cutoff)}`, { method: "DELETE" }).catch(() => undefined);
  }

  const result = await rpc<Record<string, unknown>>("apt_public_bill", { p_room: room });
  if (!result || result.found !== true) return { found: false };
  return { ...result, settings: stripSettings(result.settings) };
}

async function bootstrapUsers({ bootstrapSecret }: Ctx) {
  if (!BOOTSTRAP_SECRET || !bootstrapSecret || !safeEqual(bootstrapSecret, BOOTSTRAP_SECRET)) {
    throw new HttpError(403, "ບໍ່ມີສິດ");
  }

  const current = await rpc<Record<string, unknown>>("apt_load", {});
  const settings = (current.settings ?? {}) as Record<string, unknown>;
  const users = Array.isArray(settings.users) ? (settings.users as Record<string, unknown>[]) : [];
  if (!users.length) return { imported: 0, message: "ບໍ່ມີຜູ້ໃຊ້ໃນ settings" };

  const rows: Record<string, unknown>[] = [];
  const skipped: string[] = [];
  for (const item of users) {
    const id = String(item?.id ?? "").trim();
    const pin = String(item?.pin ?? "").replace(/\D/g, "");
    if (!id) continue;
    if (pin.length < 4 || pin.length > 6) {
      skipped.push(id);
      continue;
    }
    const role = String(item.role ?? "staff");
    rows.push({
      id,
      name: String(item.name ?? ""),
      role: ["manager", "tech", "staff", "viewer"].includes(role) ? role : "staff",
      perms: (item.perms ?? {}) as Record<string, string[]>,
      active: item.active !== false,
      pin_hash: await hashPin(pin),
      updated_at: new Date().toISOString()
    });
  }

  if (rows.length) {
    await rest("app_users", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows)
    });
  }

  // ລຶບ pin ອອກຈາກ settings (ເກັບສະເພາະ id/name/role/perms/active)
  const cleaned = users.map((item) => {
    const role = String(item.role ?? "staff");
    return {
      id: String(item.id ?? ""),
      name: String(item.name ?? ""),
      role: ["manager", "tech", "staff", "viewer"].includes(role) ? role : "staff",
      perms: (item.perms ?? {}) as Record<string, string[]>,
      active: item.active !== false
    };
  });
  const result = await rpc<Record<string, unknown>>("apt_save", {
    payload: {
      rooms: current.rooms,
      tenants: current.tenants,
      invoices: current.invoices,
      repairs: current.repairs,
      settings: { ...settings, users: cleaned }
    },
    expected_rev: typeof current.rev === "number" ? current.rev : null
  });

  return { imported: rows.length, skipped, result };
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);
  if (!cors) {
    return new Response(JSON.stringify({ error: "origin ບໍ່ອະນຸຍາດ" }), {
      status: 403,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method ບໍ່ອະນຸຍາດ" }, 405, cors);

  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "body ບໍ່ຖືກຮູບແບບ" }, 400, cors);
  }

  const ctx: Ctx = {
    body,
    ip: clientIp(req),
    bootstrapSecret: req.headers.get("x-bootstrap-secret")
  };

  try {
    const action = String(body.action ?? "");
    let result: unknown;
    switch (action) {
      case "login":
        result = await login(ctx);
        break;
      case "logout":
        result = await logout(ctx);
        break;
      case "load":
        result = await load(ctx);
        break;
      case "save":
        result = await save(ctx);
        break;
      case "set_pin":
        result = await setPin(ctx);
        break;
      case "set_view_month":
        result = await setViewMonth(ctx);
        break;
      case "public_bill":
        result = await publicBill(ctx);
        break;
      case "bootstrap_users":
        result = await bootstrapUsers(ctx);
        break;
      default:
        throw new HttpError(400, "action ບໍ່ຮູ້ຈັກ");
    }

    if (result instanceof Response) {
      const res = result as Response;
      const headers = new Headers(res.headers);
      for (const [key, value] of Object.entries(cors)) headers.set(key, value);
      return new Response(res.body, { status: res.status, headers });
    }
    return json(result ?? { ok: true }, 200, cors);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status, cors);
    console.error("apt-api:", error instanceof Error ? error.message : String(error));
    return json({ error: "ເກີດຂໍ້ຜິດພາດພາຍໃນ" }, 500, cors);
  }
});
