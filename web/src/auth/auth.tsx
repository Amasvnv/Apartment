import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ApiError,
  clearCache,
  loginApi,
  logoutApi,
  readConfig
} from "../data/storage";
import { useStore } from "../data/store";
import type { AptUser } from "../data/types";

const SESSION_KEY = "apt.session";

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
  login: (identifier: string, pin: string) => Promise<string | null>;
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
  const { data, reload } = useStore();
  const [session, setSession] = useState<Session | null>(() => readSession());

  const user = useMemo(() => {
    if (!session) return null;
    const found = (data.settings.users || []).find((item) => item.id === session.id);
    if (!found || found.active === false) return null;
    return found;
  }, [session, data.settings.users]);

  // 401 ຈາກ apt-api (session ໝົດອາຍຸ/ຖືກລຶບ) → ອອກຈາກລະບົບທັນທີ
  useEffect(() => {
    const onUnauthorized = () => {
      clearSession();
      setSession(null);
    };
    window.addEventListener("apt:unauthorized", onUnauthorized);
    return () => window.removeEventListener("apt:unauthorized", onUnauthorized);
  }, []);

  const login = useCallback(
    async (identifier: string, pin: string): Promise<string | null> => {
      const config = readConfig();
      if (!config) return "ຍັງບໍ່ໄດ້ເຊື່ອມຕໍ່ຖານຂໍ້ມູນ";
      const digits = String(pin).replace(/\D/g, "");
      if (!identifier.trim()) return "ໃສ່ຊື່ຜູ້ໃຊ້";
      if (digits.length < 4) return "PIN ຕ້ອງມີ 4–6 ໂຕເລກ";

      try {
        const result = await loginApi(config, identifier.trim(), digits);
        writeSession({
          id: result.user.id,
          name: result.user.name,
          phone: "",
          role: result.user.role as AptUser["role"],
          hasPin: true,
          active: true,
          perms: (result.user.perms || {}) as AptUser["perms"]
        });
        setSession({ id: result.user.id, name: result.user.name, role: result.user.role, at: Date.now() });
        await reload();
        return null;
      } catch (error) {
        return error instanceof ApiError ? error.message : "ເຊື່ອມຕໍ່ບໍ່ໄດ້ — ກວດເຄືອຂ່າຍແລ້ວລອງໃໝ່";
      }
    },
    [reload]
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    void (async () => {
      await logoutApi(readConfig());
      clearCache();
      await reload();
    })();
  }, [reload]);

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
