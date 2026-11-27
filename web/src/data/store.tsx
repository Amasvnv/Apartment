import { Box, Group, SimpleGrid, Skeleton, Stack, Text } from "@mantine/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import SkeletonCard from "../components/ui/SkeletonCard";
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
  commit: (mutator: (draft: AppData) => void) => Promise<boolean>;
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

  // ຄືກັບ update ແຕ່ຄືນຄ່າເປັນ promise ເພື່ອໃຫ້ປຸ່ມ ບັນທຶກ / ລຶບ ສະແດງສະຖານະ ແລະ ເສັ້ນໂຫຼດໄດ້
  const commit = useCallback(
    async (mutator: (draft: AppData) => void) => {
      if (!data) return false;
      const draft: AppData = structuredClone(data);
      mutator(draft);
      setData(draft);
      return persist(draft);
    },
    [data, persist]
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
      commit,
      save,
      reload,
      saving
    };
  }, [data, mode, rev, error, month, handleSetMonth, update, commit, save, reload, saving]);

  if (!value) {
    return (
      <Box p={{ base: "md", sm: "lg" }} maw={1200} mx="auto" role="status" aria-live="polite">
        <Group justify="space-between" align="flex-start" mb="lg" wrap="wrap" gap="md">
          <Stack gap={8}>
            <Skeleton height={24} width={230} radius="sm" />
            <Skeleton height={10} width={170} radius="xl" />
          </Stack>
          <Skeleton height={34} width={210} radius="md" />
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" mt="md">
          <SkeletonCard height={240} lines={4} />
          <SkeletonCard height={240} lines={4} />
        </SimpleGrid>
        <Text size="xs" c="var(--text-muted)" mt="md">
          ກຳລັງໂຫຼດຂໍ້ມູນ…
        </Text>
      </Box>
    );
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore ຕ້ອງໃຊ້ພາຍໃນ StoreProvider");
  return value;
}
