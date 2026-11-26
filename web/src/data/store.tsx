import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { latestInvoiceMonth, monthInvoices, ctxOf } from "../lib/compute";
import { loadData, readConfig, saveApi, saveCached, saveSupabase } from "./storage";

import type { AppData, DbMode, MonthRef } from "./types";

interface StoreValue {
  data: AppData;
  mode: DbMode;
  rev: number;
  ready: boolean;
  error: string;
  month: MonthRef;
  setMonth: (month: MonthRef) => void;
  update: (mutator: (draft: AppData) => void) => void;
  save: () => Promise<boolean>;
  reload: () => Promise<void>;
  saving: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [mode, setMode] = useState<DbMode>("local");
  const [rev, setRev] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [month, setMonth] = useState<MonthRef>({ year: 2026, month: 11 });
  const monthTouched = useRef(false);

  const boot = useCallback(async () => {
    const loaded = await loadData();
    setData(loaded.data);
    setMode(loaded.mode);
    setRev(loaded.rev);
    setError(loaded.error || "");
    if (!monthTouched.current) {
      const current = loaded.data.settings.current || { year: 2026, month: 11 };
      const ctx = ctxOf(loaded.data);
      const hasInvoices = monthInvoices(ctx, current.month, current.year).length > 0;
      const latest = latestInvoiceMonth(ctx);
      setMonth(hasInvoices || !latest ? current : latest);
    }
  }, []);

  useEffect(() => {
    boot().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ");
    });
  }, [boot]);

  const reload = useCallback(async () => {
    await boot();
  }, [boot]);

  const persist = useCallback(
    async (next: AppData) => {
      setSaving(true);
      try {
        const config = readConfig();
        if (mode === "supabase" && config) {
          const nextRev = await saveSupabase(config, next, rev);
          setRev(nextRev);
        } else if (mode === "server") {
          const nextRev = await saveApi(next, rev);
          setRev(nextRev);
        } else {
          saveCached(next);
        }
        setError("");
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "ບັນທຶກບໍ່ສຳເລັດ";
        setError(message);
        saveCached(next);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [mode, rev]
  );

  const update = useCallback(
    (mutator: (draft: AppData) => void) => {
      setData((current) => {
        if (!current) return current;
        const draft: AppData = structuredClone(current);
        mutator(draft);
        void persist(draft);
        return draft;
      });
    },
    [persist]
  );

  const save = useCallback(async () => {
    if (!data) return false;
    return persist(structuredClone(data));
  }, [data, persist]);

  const handleSetMonth = useCallback((next: MonthRef) => {
    monthTouched.current = true;
    setMonth(next);
  }, []);

  const value = useMemo<StoreValue | null>(() => {
    if (!data) return null;
    return {
      data,
      mode,
      rev,
      ready: true,
      error,
      month,
      setMonth: handleSetMonth,
      update,
      save,
      reload,
      saving
    };
  }, [data, mode, rev, error, month, handleSetMonth, update, save, reload, saving]);

  if (!value) {
    return <div className="app-loading">ກຳລັງໂຫຼດຂໍ້ມູນ…</div>;
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore ຕ້ອງໃຊ້ພາຍໃນ StoreProvider");
  return value;
}
