import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useStore } from "../data/store";
import type { AptUser } from "../data/types";

const SESSION_KEY = "apt.session";

interface Session {
  id: string;
  name: string;
  role: string;
  at: number;
}

function readSession(): Session | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null") as Session | null;
    return parsed && parsed.id ? parsed : null;
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
      const candidate = (data.settings.users || []).find((item) => item.id === userId);
      if (!candidate) return "ບໍ່ພົບຜູ້ໃຊ້";
      if (candidate.active === false) return "ຜູ້ໃຊ້ນີ້ຖືກປິດໃຊ້ງານ";
      if (!candidate.pin) return "ຜູ້ໃຊ້ນີ້ຍັງບໍ່ມີ PIN";
      if (String(pin).replace(/\D/g, "") !== String(candidate.pin)) return "PIN ບໍ່ຖືກ — ລອງໃໝ່ອີກຄັ້ງ";
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
