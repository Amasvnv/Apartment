import { Badge, Box, Grid, Group, Progress, SimpleGrid, Stack, Text, Tooltip } from "@mantine/core";
import {
  IconBolt,
  IconBuilding,
  IconChevronLeft,
  IconChevronRight,
  IconHistory,
  IconLayersLinked,
  IconReceipt2,
  IconSettings,
  IconTools,
  IconUsers
} from "@tabler/icons-react";
import { useMemo, useState, type CSSProperties } from "react";
import CardArt, { type CardArtKind } from "../components/ui/CardArt";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";

type KindMeta = {
  label: string;
  color: string;
  icon: typeof IconHistory;
  art: CardArtKind;
  hint: string;
};

const KINDS: Record<string, KindMeta> = {
  invoices: { label: "ໃບບີນ", color: "#06b6d4", icon: IconReceipt2, art: "invoice", hint: "ອອກ · ຊຳລະ · ລຶບ" },
  meter: { label: "ຈົດມິເຕີ", color: "#f59e0b", icon: IconBolt, art: "bolt", hint: "ອ່ານມິເຕີໄຟຟ້າ ແລະ ນ້ຳ" },
  settings: { label: "ຕັ້ງຄ່າ", color: "#8b5cf6", icon: IconSettings, art: "chart", hint: "ອັດຕາ ແລະ ຄ່າບໍລິການ" },
  rooms: { label: "ຫ້ອງພັກ", color: "#2563eb", icon: IconBuilding, art: "door", hint: "ເພີ່ມ ແລະ ແກ້ໄຂຫ້ອງ" },
  tenants: { label: "ຜູ້ເຊົ່າ", color: "#db2777", icon: IconUsers, art: "home", hint: "ຜູ້ເຂົ້າຢູ່ ແລະ ສັນຍາ" },
  repairs: { label: "ສ້ອມແປງ", color: "#ef4444", icon: IconTools, art: "wrench", hint: "ແຈ້ງ ແລະ ປິດວຽກ" },
  users: { label: "ຜູ້ໃຊ້", color: "#0ea5e9", icon: IconUsers, art: "sparkles", hint: "ສິດ ແລະ ບັນຊີ" }
};

const FALLBACK: KindMeta = { label: "ອື່ນໆ", color: "#64748b", icon: IconLayersLinked, art: "sparkles", hint: "ລາຍການອື່ນ" };

const ROLE_LABEL: Record<string, string> = {
  manager: "ຜູ້ຈັດການ",
  tech: "ຊ່າງ",
  staff: "ພະນັກງານ",
  viewer: "ຜູ້ເບິ່ງ"
};

const PAGE_SIZE = 10;

const initials = (name: string) => name.trim().slice(0, 1).toUpperCase() || "?";

const metaOf = (kind: string) => KINDS[kind] || FALLBACK;

const pad = (value: number) => String(value).padStart(2, "0");
const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const timeLabel = (value: number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const dayLabel = (value: number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  const key = dayKey(date);
  if (key === dayKey(today)) return "ມື້ນີ້";
  if (key === dayKey(yesterday)) return "ມື້ວານນີ້";
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};

const relLabel = (value: number) => {
  const diff = Date.now() - value;
  if (!Number.isFinite(diff) || diff < 0) return "";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ຕອນນີ້";
  if (minutes < 60) return `${minutes} ນາທີກ່ອນ`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ຊົ່ວໂມງກ່ອນ`;
  return "";
};

const GRADIENTS = {
  blue:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #0a5fd0 0%, #2563eb 55%, #7cbcff 100%)",
  cyan:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #0e7490 0%, #06b6d4 55%, #67e8f9 100%)",
  amber:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #c2740c 0%, #f59e0b 52%, #fcd34d 100%)",
  violet:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #6d28d9 0%, #8b5cf6 52%, #d8b4fe 100%)"
} as const;

export default function Activity() {
  const { data } = useStore();
  const { user } = useAuth();
  const [kind, setKind] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const all = useMemo(() => {
    const list = Array.isArray(data.settings.activity) ? data.settings.activity : [];
    return [...list].sort((a, b) => Number(b.t) - Number(a.t));
  }, [data.settings.activity]);

  const filtered = useMemo(() => (kind ? all.filter((item) => item.kind === kind) : all).slice(0, 200), [all, kind]);
  // ແບ່ງເປັນໜ້າໜລະ 10 ລາຍການ — ແຖບເລກໜ້າ 1 2 3 4 …
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const items = useMemo(
    () => filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [filtered, current]
  );

  const pickKind = (value: string | null) => {
    setKind(value);
    setPage(1);
  };

  const countOf = (value: string) => all.filter((item) => item.kind === value).length;
  const otherCount = all.filter((item) => !KINDS[item.kind]).length;

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: typeof items }[] = [];
    items.forEach((item) => {
      const date = new Date(Number(item.t));
      const key = Number.isNaN(date.getTime()) ? "unknown" : dayKey(date);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(item);
      else out.push({ key, label: dayLabel(Number(item.t)), items: [item] });
    });
    return out;
  }, [items]);

  const kindStats = Object.entries(KINDS)
    .map(([key, meta]) => ({ key, meta, count: countOf(key) }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...kindStats.map((row) => row.count));

  const tiles = [
    {
      label: "ການເຄື່ອນໄຫວທັງໝົດ",
      value: all.length,
      note: all.length ? `ລ່າສຸດ ${timeLabel(Number(all[0].t))} · ${dayLabel(Number(all[0].t))}` : "ຍັງບໍ່ມີຂໍ້ມູນ",
      icon: <IconHistory size={14} />,
      art: "clock" as CardArtKind,
      gradient: GRADIENTS.blue,
      shadow: "rgba(37,99,235,0.45)"
    },
    {
      label: "ໃບບີນ",
      value: countOf("invoices"),
      note: "ອອກ · ຊຳລະ · ລຶບ",
      icon: <IconReceipt2 size={14} />,
      art: "invoice" as CardArtKind,
      gradient: GRADIENTS.cyan,
      shadow: "rgba(6,182,212,0.45)"
    },
    {
      label: "ຈົດມິເຕີ",
      value: countOf("meter"),
      note: "ອ່ານໄຟຟ້າ ແລະ ນ້ຳ",
      icon: <IconBolt size={14} />,
      art: "bolt" as CardArtKind,
      gradient: GRADIENTS.amber,
      shadow: "rgba(245,158,11,0.5)"
    },
    {
      label: "ຕັ້ງຄ່າ ແລະ ອື່ນໆ",
      value: countOf("settings") + otherCount,
      note: "ອັດຕາ · ຄ່າບໍລິການ",
      icon: <IconSettings size={14} />,
      art: "chart" as CardArtKind,
      gradient: GRADIENTS.violet,
      shadow: "rgba(139,92,246,0.45)"
    }
  ];

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ການເຄື່ອນໄຫວ"
        subtitle="ບັນທຶກການແກ້ໄຂຂໍ້ມູນລ່າສຸດ · ທັງໝົດ"
        actions={
          <Badge variant="light" radius="xl" size="lg" leftSection={<IconHistory size={13} />}>
            {filtered.length} ລາຍການ
          </Badge>
        }
      />

      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
        {tiles.map((tile) => (
          <Box
            key={tile.label}
            className="tile lift rep-stat"
            style={{ background: tile.gradient, boxShadow: `0 18px 34px -26px ${tile.shadow}` }}
          >
            <CardArt kind={tile.art} />
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap={8}>
              <Text className="tile-label">{tile.label}</Text>
              <Box className="spend-ico">{tile.icon}</Box>
            </Group>
            <Text className="tile-value tnum" mt={10}>
              {tile.value}
            </Text>
            <Text className="tile-note" mt={6}>
              {tile.note}
            </Text>
          </Box>
        ))}
      </SimpleGrid>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="md">
            <Box className="surface act-chips-wrap">
              <Box className="act-chips">
                <button
                  type="button"
                  className={`act-chip${kind === null ? " is-active" : ""}`}
                  style={{ "--tone": "#1b6fd6" } as CSSProperties}
                  onClick={() => pickKind(null)}
                >
                  ທັງໝົດ
                  <span className="act-chip-count">{all.length}</span>
                </button>
                {Object.entries(KINDS).map(([key, meta]) => (
                  <Tooltip key={key} label={meta.hint} withArrow>
                    <button
                      type="button"
                      className={`act-chip${kind === key ? " is-active" : ""}`}
                      style={{ "--tone": meta.color } as CSSProperties}
                      onClick={() => pickKind(kind === key ? null : key)}
                    >
                      <span className="act-chip-dot" />
                      {meta.label}
                      <span className="act-chip-count">{countOf(key)}</span>
                    </button>
                  </Tooltip>
                ))}
              </Box>
            </Box>

            {groups.length ? (
              groups.map((group) => (
                <Box key={group.key} className="act-day">
                  <Group justify="space-between" align="center" className="act-day-head">
                    <Group gap={8} wrap="nowrap">
                      <span className="act-day-dot" />
                      <Text className="act-day-label">{group.label}</Text>
                    </Group>
                    <Text className="act-day-count">{group.items.length} ລາຍການ</Text>
                  </Group>

                  <Stack gap={8}>
                    {group.items.map((item, index) => {
                      const meta = metaOf(item.kind);
                      const Icon = meta.icon;
                      const rel = relLabel(Number(item.t));
                      // ຜູ້ເຮັດ: ໃຊ້ຊື່ທີ່ບັນທຶກໄວ້; ລາຍການເກົ່າທີ່ບໍ່ມີ ໃຫ້ໃຊ້ຜູ້ໃຊ້ທີ່ login ຢູ່
                      const actorName = item.by || user?.name || "";
                      const actorRole = item.byRole || user?.role || "";
                      return (
                        <Box
                          key={`${item.t}-${index}`}
                          className="act-row lift"
                          style={{ "--tone": meta.color } as CSSProperties}
                        >
                          <Box className="act-ico">
                            <Icon size={17} />
                          </Box>
                          <Box className="act-main">
                            <Group gap={8} wrap="wrap" align="center">
                              <Text className="act-title">{item.title}</Text>
                              <span className="act-tag">{meta.label}</span>
                            </Group>
                            <Group gap={8} wrap="wrap" align="center" className="act-sub">
                              <span className="act-user" style={{ "--tone": meta.color } as CSSProperties}>
                                <span className="act-avatar">{initials(actorName)}</span>
                                <span className="act-user-name">{actorName || "ບໍ່ລະບຸຜູ້ໃຊ້"}</span>
                                {actorRole ? (
                                  <span className="act-user-role">{ROLE_LABEL[actorRole] || actorRole}</span>
                                ) : null}
                              </span>
                              {item.detail ? <span className="act-detail">{item.detail}</span> : null}
                            </Group>
                          </Box>
                          <Box className="act-time">
                            <Text className="act-time-main tnum">{timeLabel(Number(item.t))}</Text>
                            {rel ? <Text className="act-time-sub">{rel}</Text> : null}
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              ))
            ) : (
              <Box className="surface rep-empty">
                <Box className="rep-ico rep-ico--empty">
                  <IconHistory size={20} />
                </Box>
                <Text fw={600} c="var(--text-strong)" mt="sm">
                  ຍັງບໍ່ມີການເຄື່ອນໄຫວ
                </Text>
                <Text size="xs" c="var(--text-muted)" mt={4}>
                  ແກ້ໄຂຂໍ້ມູນແລ້ວ ລາຍການຈະສະແດງຢູ່ນີ້
                </Text>
              </Box>
            )}

            {pageCount > 1 ? (
              <Box className="act-pager">
                <Text className="act-pager-info">
                  ສະແດງ {(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, filtered.length)} ຈາກ {filtered.length} ລາຍການ
                </Text>
                <Group gap={6} wrap="nowrap" className="act-pages">
                  <button
                    type="button"
                    className="act-page act-page--nav"
                    disabled={current === 1}
                    onClick={() => setPage(current - 1)}
                    aria-label="ໜ້າກ່ອນ"
                  >
                    <IconChevronLeft size={15} />
                  </button>
                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((no) => (
                    <button
                      key={no}
                      type="button"
                      className={`act-page${no === current ? " is-active" : ""}`}
                      onClick={() => setPage(no)}
                      aria-current={no === current ? "page" : undefined}
                    >
                      {no}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="act-page act-page--nav"
                    disabled={current === pageCount}
                    onClick={() => setPage(current + 1)}
                    aria-label="ໜ້າຕໍ່ໄປ"
                  >
                    <IconChevronRight size={15} />
                  </button>
                </Group>
              </Box>
            ) : null}
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Stack gap="md">
            <Box className="surface act-side">
              <Group justify="space-between" align="center" mb={12}>
                <Text className="act-side-title">ສະຫຼຸບຕາມປະເພດ</Text>
                <Text className="act-side-hint">{all.length} ລາຍການ</Text>
              </Group>

              {kindStats.length ? (
                <Stack gap={10}>
                  {kindStats.map(({ key, meta, count }) => {
                    const Icon = meta.icon;
                    return (
                      <Box key={key} className="act-stat" style={{ "--tone": meta.color } as CSSProperties}>
                        <Group gap={10} wrap="nowrap" align="center">
                          <Box className="act-stat-ico">
                            <Icon size={15} />
                          </Box>
                          <Box style={{ minWidth: 0, flex: 1 }}>
                            <Group justify="space-between" gap={8} wrap="nowrap">
                              <Text className="act-stat-label" truncate>
                                {meta.label}
                              </Text>
                              <Text className="act-stat-value tnum">{count}</Text>
                            </Group>
                            <Progress
                              value={(count / maxCount) * 100}
                              size={5}
                              radius="xl"
                              mt={5}
                              styles={{
                                root: { background: "var(--hairline)" },
                                section: { background: meta.color }
                              }}
                            />
                          </Box>
                        </Group>
                      </Box>
                    );
                  })}
                </Stack>
              ) : (
                <Text size="sm" c="var(--text-muted)" ta="center" py="md">
                  ຍັງບໍ່ມີຂໍ້ມູນ
                </Text>
              )}
            </Box>

            <Box className="surface act-side act-side--latest">
              <Text className="act-side-title" mb={10}>
                ລ່າສຸດ
              </Text>
              {all.slice(0, 3).map((item, index) => {
                const meta = metaOf(item.kind);
                return (
                  <Box key={`${item.t}-${index}`} className="act-mini" style={{ "--tone": meta.color } as CSSProperties}>
                    <span className="act-mini-dot" />
                    <Box style={{ minWidth: 0 }}>
                      <Text className="act-mini-title" truncate>
                        {item.title}
                      </Text>
                      <Text className="act-mini-sub" truncate>
                        {meta.label} · {item.by || user?.name || "ບໍ່ລະບຸ"} · {timeLabel(Number(item.t))}
                      </Text>
                    </Box>
                  </Box>
                );
              })}
              {!all.length ? (
                <Text size="xs" c="var(--text-muted)">
                  —
                </Text>
              ) : null}
            </Box>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
