import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useStore } from "../data/store";
import type { AptUser } from "../data/types";

const SESSION_KEY = "apt.session";
const GUARD_KEY = "apt.pinguard";
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

interface Guard {
  fails: number;
  until: number;
}

/* ກັນການເດົາ PIN: ຜິດ 5 ຄັ້ງ → ລ໋ອກ 60 ວິນາທີ (ນັບຕໍ່ session ຂອງເຄື່ອງ) */
function readGuard(): Guard {
  try {
    const raw = JSON.parse(sessionStorage.getItem(GUARD_KEY) || "null") as Guard | null;
    if (raw && typeof raw.fails === "number" && typeof raw.until === "number") return raw;
  } catch {
    /* ignore */
  }
  return { fails: 0, until: 0 };
}

function writeGuard(guard: Guard) {
  sessionStorage.setItem(GUARD_KEY, JSON.stringify(guard));
}

function lockMessage(until: number): string | null {
  const left = Math.ceil((until - Date.now()) / 1000);
  return left > 0 ? `ລອງຜິດຫຼາຍຄັ້ງ — ລໍຖ້າ ${left} ວິນາທີ ແລ້ວລອງໃໝ່` : null;
}

interface Session {
  id: string;
  name: string;
  role: string;
  at: number;
}

/** ຜູ້ໃຊ້ທີ່ login ຢູ່ — ໃຊ້ສຳລັບບັນທຶກວ່າໃຜເປັນຄົນແກ້ໄຂຂໍ້ມູນ */
export function currentSession(): { id: string; name: string; role: string } | null {
  const session = readSession();
  return session ? { id: session.id, name: session.name, role: session.role } : null;
}

/* session ໝົດອາຍຸພາຍໃນ 12 ຊົ່ວໂມງ ເຖິງແມ່ນບໍ່ປິດ browser */
const SESSION_MAX_MS = 12 * 60 * 60 * 1000;

function readSession(): Session | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null") as Session | null;
    if (!parsed || !parsed.id) return null;
    if (!parsed.at || Date.now() - parsed.at > SESSION_MAX_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(user: AptUser) {
  const session: Session = { id: user.id, name: user.name, role: user.role, at: Date.now() };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

interface AuthValue {
  user: AptUser | null;
  roleLabel: string;
  isViewer: boolean;
  login: (userId: string, pin: string) => string | null;
  logout: () => void;
  canEdit: (page: string) => boolean;
  canDelete: (page: string) => boolean;
}

const ROLE_LABELS: Record<string, string> = {
  manager: "ຜູ້ຈັດການ",
  tech: "ຊ່າງ",
  staff: "ພະນັກງານ",
  viewer: "ຜູ້ເບິ່ງ"
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data } = useStore();
  const [session, setSession] = useState<Session | null>(() => readSession());

  const user = useMemo(() => {
    if (!session) return null;
    const found = (data.settings.users || []).find((item) => item.id === session.id);
    if (!found || found.active === false) return null;
    return found;
  }, [session, data.settings.users]);

  const login = useCallback(
    (userId: string, pin: string): string | null => {
      const guard = readGuard();
      const locked = lockMessage(guard.until);
      if (locked) return locked;

      const candidate = (data.settings.users || []).find((item) => item.id === userId);
      if (!candidate) return "ບໍ່ພົບຜູ້ໃຊ້";
      if (candidate.active === false) return "ຜູ້ໃຊ້ນີ້ຖືກປິດໃຊ້ງານ";
      if (!candidate.pin) return "ຜູ້ໃຊ້ນີ້ຍັງບໍ່ມີ PIN";
      if (String(pin).replace(/\D/g, "") !== String(candidate.pin)) {
        const fails = (guard.until ? 0 : guard.fails) + 1;
        if (fails >= MAX_ATTEMPTS) {
          writeGuard({ fails: 0, until: Date.now() + LOCK_MS });
          return `PIN ຜິດ ${MAX_ATTEMPTS} ຄັ້ງ — ລໍຖ້າ 60 ວິນາທີ ແລ້ວລອງໃໝ່`;
        }
        writeGuard({ fails, until: 0 });
        return `PIN ບໍ່ຖືກ — ລອງໃໝ່ອີກຄັ້ງ (ເຫຼືອ ${MAX_ATTEMPTS - fails} ຄັ້ງ)`;
      }
      writeGuard({ fails: 0, until: 0 });
      writeSession(candidate);
      setSession({ id: candidate.id, name: candidate.name, role: candidate.role, at: Date.now() });
      return null;
    },
    [data.settings.users]
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const isViewer = user?.role === "viewer";

  const canEdit = useCallback(
    (page: string) => {
      if (!user) return false;
      if (isViewer) return false;
      const perms = user.perms?.[page];
      if (!perms) return user.role === "manager";
      return perms.includes("edit");
    },
    [isViewer, user]
  );

  const canDelete = useCallback(
    (page: string) => {
      if (!user) return false;
      if (isViewer) return false;
      const perms = user.perms?.[page];
      if (!perms) return user.role === "manager";
      return perms.includes("delete");
    },
    [isViewer, user]
  );

  const value = useMemo<AuthValue>(
    () => ({
      user,
      roleLabel: user ? ROLE_LABELS[user.role] || user.role : "",
      isViewer: !!isViewer,
      login,
      logout,
      canEdit,
      canDelete
    }),
    [user, isViewer, login, logout, canEdit, canDelete]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth ຕ້ອງໃຊ້ພາຍໃນ AuthProvider");
  return value;
}
