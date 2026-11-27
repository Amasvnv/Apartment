import {
  Box,
  Button,
  Grid,
  Group,
  Menu,
  Progress,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip
} from "@mantine/core";
import { DonutChart, Sparkline } from "@mantine/charts";
import {
  Area as RechartsArea,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  IconArrowRight,
  IconBolt,
  IconClock,
  IconDoorEnter,
  IconDroplet,
  IconHome,
  IconPlus,
  IconReceipt2,
  IconSparkles,
  IconTool,
  IconTrash,
  IconTrendingUp,
  IconWallet
} from "@tabler/icons-react";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import MonthSwitcher from "../components/MonthSwitcher";
import CardArt, { type CardArtKind } from "../components/ui/CardArt";
import Surface from "../components/ui/Surface";
import { useStore } from "../data/store";
import {
  ctxOf,
  extraFeesShareFor,
  invoiceRates,
  invoiceRepair,
  invoiceStats,
  invoiceTotal,
  monthInvoices,
  pendingRooms,
  ratesForMonth,
  residentPeople,
  residentRoomCount,
  trashCostFor,
  waterCostFor,
  yearInvoices,
  yearTotals
} from "../lib/compute";
import { MONTH_SHORT, money, monthLabel, num } from "../lib/format";

const SPEND_COLORS = {
  rent: "#2563EB",
  elec: "#F97316",
  water: "#06B6D4",
  trash: "#94A3B8",
  repair: "#8B5CF6",
  other: "#475569"
};

type SpendTone = { gradient: string; shadow: string; icon: ReactNode; art: CardArtKind };

const SPEND_TONES: Record<string, SpendTone> = {
  [SPEND_COLORS.rent]: {
    gradient:
      "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #0a5fd0 0%, #2563eb 55%, #7cbcff 100%)",
    shadow: "rgba(37,99,235,0.45)",
    icon: <IconHome size={14} />,
    art: "home"
  },
  [SPEND_COLORS.elec]: {
    gradient:
      "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #d1440a 0%, #f97316 55%, #ffc07a 100%)",
    shadow: "rgba(249,115,22,0.5)",
    icon: <IconBolt size={14} />,
    art: "bolt"
  },
  [SPEND_COLORS.water]: {
    gradient:
      "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #0092c4 0%, #06b6d4 55%, #6de9ff 100%)",
    shadow: "rgba(6,182,212,0.45)",
    icon: <IconDroplet size={14} />,
    art: "droplet"
  },
  [SPEND_COLORS.trash]: {
    gradient:
      "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #66799a 0%, #94a3b8 52%, #c9d7e6 100%)",
    shadow: "rgba(148,163,184,0.45)",
    icon: <IconTrash size={14} />,
    art: "trash"
  },
  [SPEND_COLORS.repair]: {
    gradient:
      "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #6a25e8 0%, #8b5cf6 52%, #cdb8ff 100%)",
    shadow: "rgba(139,92,246,0.45)",
    icon: <IconTool size={14} />,
    art: "wrench"
  },
  [SPEND_COLORS.other]: {
    gradient:
      "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #3b4453 0%, #475569 55%, #7b8798 100%)",
    shadow: "rgba(71,85,105,0.45)",
    icon: <IconSparkles size={14} />,
    art: "sparkles"
  }
};

const TOTAL_TONE: SpendTone = {
  gradient:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.3), transparent 62%), linear-gradient(142deg, #10365f 0%, #1f5f9e 55%, #4a93d8 100%)",
  shadow: "rgba(31,95,158,0.5)",
  icon: <IconWallet size={14} />,
  art: "chart"
};

const SPEND_ICONS: Record<string, ReactNode> = {
  "ຄ່າເຊົ່າ": <IconHome size={11} />,
  "ຄ່າໄຟຟ້າ": <IconBolt size={11} />,
  "ຄ່ານ້ຳປະປາ": <IconDroplet size={11} />,
  "ຄ່າຂີ້ເຫຍື້ອ": <IconTrash size={11} />,
  "ສ້ອມແປງ": <IconTool size={11} />,
  "ຄ່າອື່ນໆ": <IconSparkles size={11} />
};

const SERIES_COLORS = {
  total: "#F5A03C",
  paid: "#8B5CF6"
};

type SpendInvoice = ReturnType<typeof monthInvoices>[number];
type SpendSegment = { name: string; value: number; color: string };
type HealthTone = "emerald" | "indigo" | "amber" | "fuchsia" | "lime" | "teal" | "bronze" | "rose";
type HealthCard = {
  label: string;
  value: string;
  unit?: string;
  note: string;
  tone: HealthTone;
  art: CardArtKind;
  spark?: number[];
  bar?: number;
  footer: string;
  countTo?: number;
  format?: (value: number) => string;
};

function spendBreakdown(ctx: ReturnType<typeof ctxOf>, invoices: SpendInvoice[]): SpendSegment[] {
  let rent = 0;
  let elec = 0;
  let water = 0;
  let trash = 0;
  let repair = 0;
  let other = 0;

  invoices.forEach((inv) => {
    const invRates = invoiceRates(ctx, inv);
    rent += Number(inv.rent) || 0;
    elec += (Number(inv.kwh) || 0) * invRates.electricRate;
    water += waterCostFor(ctx, inv.room, invRates);
    trash += trashCostFor(ctx, inv.room, invRates);
    repair += invoiceRepair(ctx, inv);
    other += (Number(inv.service) || 0) + (Number(inv.other) || 0) + extraFeesShareFor(ctx, inv.room, inv.year, inv.month);
  });

  return [
    { name: "ຄ່າເຊົ່າ", value: rent, color: SPEND_COLORS.rent },
    { name: "ຄ່າໄຟຟ້າ", value: elec, color: SPEND_COLORS.elec },
    { name: "ຄ່ານ້ຳປະປາ", value: water, color: SPEND_COLORS.water },
    { name: "ຄ່າຂີ້ເຫຍື້ອ", value: trash, color: SPEND_COLORS.trash },
    { name: "ສ້ອມແປງ", value: repair, color: SPEND_COLORS.repair },
    { name: "ຄ່າອື່ນໆ", value: other, color: SPEND_COLORS.other }
  ].filter((segment) => segment.value > 0);
}

type TrendRow = { label: string; total: number; paid: number };

function RevenueTrend({ rows, highlightIndex }: { rows: TrendRow[]; highlightIndex: number }) {
  const series = [
    { key: "total", color: SERIES_COLORS.total, lineTo: "#F7C46B", fillId: "trend-fill-total", lineId: "trend-line-total" },
    { key: "paid", color: SERIES_COLORS.paid, lineTo: "#C77BEA", fillId: "trend-fill-paid", lineId: "trend-line-paid" }
  ] as const;

  const markedDot = (color: string) =>
    function TrendDot(props: { cx?: number; cy?: number; index?: number }) {
      const { cx, cy, index } = props;
      if (index !== highlightIndex || typeof cx !== "number" || typeof cy !== "number") return <g key={`trend-dot-empty-${index}-${color}`} />;
      return (
        <g key={`trend-dot-${index}-${color}`}>
          <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.18} />
          <circle cx={cx} cy={cy} r={4.5} fill={color} stroke="#fff" strokeWidth={2} />
        </g>
      );
    };

  return (
    <Box mt={6} style={{ marginInline: -4 }}>
      <ResponsiveContainer width="100%" height={100}>
        <RechartsAreaChart data={rows} margin={{ top: 14, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {series.map((item) => (
              <Fragment key={item.key}>
                <linearGradient id={item.fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={item.color} stopOpacity={0.5} />
                  <stop offset="55%" stopColor={item.color} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={item.color} stopOpacity={0} />
                </linearGradient>
                <linearGradient id={item.lineId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={item.color} />
                  <stop offset="100%" stopColor={item.lineTo} />
                </linearGradient>
              </Fragment>
            ))}
          </defs>

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={9}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          />
          <YAxis
            width={32}
            axisLine={false}
            tickLine={false}
            domain={[0, "auto"]}
            tickCount={5}
            tickFormatter={(value) => `${value}`}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          />
          <RechartsTooltip
            cursor={{ stroke: "rgba(27,111,214,0.16)", strokeWidth: 1 }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--hairline)",
              boxShadow: "0 16px 34px -24px rgba(11,37,69,0.55)",
              fontSize: 12,
              padding: "8px 10px"
            }}
            labelStyle={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}
            formatter={(value, name) => [`${Number(value).toFixed(2)} ລ້ານ`, name === "total" ? "ລວມ" : "ເກັບໄດ້"]}
          />

          {series.map((item) => (
            <RechartsArea
              key={`${item.key}-glow`}
              type="monotone"
              dataKey={item.key}
              stroke={item.color}
              strokeWidth={9}
              strokeOpacity={0.24}
              fill="none"
              dot={false}
              activeDot={false}
              isAnimationActive
              animationDuration={900}
              style={{ filter: "blur(6px)" }}
            />
          ))}
          {series.map((item) => (
            <RechartsArea
              key={item.key}
              type="monotone"
              dataKey={item.key}
              stroke={`url(#${item.lineId})`}
              strokeWidth={2.6}
              fill={`url(#${item.fillId})`}
              dot={markedDot(item.color)}
              activeDot={{ r: 5, fill: "#fff", stroke: item.color, strokeWidth: 3 }}
              isAnimationActive
              animationDuration={900}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </Box>
  );
}

function ColorDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <Box
      style={{
        width: size,
        height: size,
        borderRadius: 99,
        background: color,
        flexShrink: 0
      }}
    />
  );
}

function KpiItem({
  label,
  value,
  icon,
  tint,
  background
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tint: string;
  background: string;
}) {
  return (
    <Group className="kpi-item" gap={10} wrap="nowrap">
      <Box className="kpi-icon" style={{ background, color: tint }}>
        {icon}
      </Box>
      <Box style={{ minWidth: 0 }}>
        <Text c="var(--text-muted)" truncate style={{ fontSize: 10.5, lineHeight: 1.3 }}>
          {label}
        </Text>
        <Text fw={600} c="var(--text-strong)" className="tnum" truncate style={{ fontSize: 12.5, lineHeight: 1.3 }}>
          {value}
        </Text>
      </Box>
    </Group>
  );
}

function useEntered(delay = 80) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setEntered(true), delay);
    return () => window.clearTimeout(id);
  }, [delay]);
  return entered;
}

function useCountUp(target: number, duration = 950) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(target)) {
      setValue(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function CountUp({ value, format, duration }: { value: number; format: (value: number) => string; duration?: number }) {
  const animated = useCountUp(value, duration);
  return <>{format(animated)}</>;
}

function HealthTile({ tone, art, label, value, unit, note, spark, bar, footer, countTo, format }: HealthCard) {
  const entered = useEntered();
  return (
    <Box className={`tile lift tile--${tone} health-tile`}>
      <CardArt kind={art} />
      <Text className="tile-label">{label}</Text>

      <Group gap={5} align="baseline" wrap="nowrap" mt={2}>
        <Text className="tile-value tnum">
          {typeof countTo === "number" && format ? <CountUp value={countTo} format={format} /> : value}
        </Text>
        {unit ? (
          <Text size="xs" fw={600} style={{ color: "rgba(255,255,255,0.86)", fontSize: 11 }}>
            {unit}
          </Text>
        ) : null}
      </Group>

      <Text className="tile-note">{note}</Text>

      {typeof bar === "number" ? (
        <Box className="health-bar">
          <Progress
            value={entered ? bar : 0}
            transitionDuration={900}
            size={8}
            radius="xl"
            styles={{ root: { background: "rgba(255,255,255,0.26)" }, section: { background: "#fff" } }}
          />
        </Box>
      ) : spark && spark.length > 1 ? (
        <Box className="health-spark">
          <Sparkline data={spark} h={56} color="#ffffff" fillOpacity={0} strokeWidth={2} curveType="monotone" />
        </Box>
      ) : null}

      <Text className="tile-foot health-foot">{footer}</Text>
    </Box>
  );
}

export default function Overview() {
  const { data, month, setMonth } = useStore();
  const navigate = useNavigate();
  const [spendScope, setSpendScope] = useState<"month" | "year">("month");
  const entered = useEntered();

  const ctx = useMemo(() => ctxOf(data), [data]);
  const currency = data.settings.currency;
  const { year, month: monthNumber } = month;

  const list = monthInvoices(ctx, monthNumber, year);
  const stats = invoiceStats(ctx, list);
  const rates = ratesForMonth(data.settings, year, monthNumber);

  const yearList = yearInvoices(ctx, year);
  const yearStats = invoiceStats(ctx, yearList);
  const prevStats = invoiceStats(ctx, yearInvoices(ctx, year - 1));
  const change = prevStats.total ? ((yearStats.total - prevStats.total) / prevStats.total) * 100 : undefined;

  const occupied = data.rooms.filter((room) => room.status === "occupied").length;
  const totalRooms = data.rooms.length;
  const occupancyRate = totalRooms ? Math.round((occupied / totalRooms) * 100) : 0;
  const pending = pendingRooms(ctx, monthNumber, year).length;
  const extraTotal = list.reduce((sum, inv) => sum + extraFeesShareFor(ctx, inv.room, inv.year, inv.month), 0);

  const yt = yearTotals(ctx, year);
  const monthlyAverage = yt.months ? yt.kwh / yt.months : 0;
  const spendTotal = yt.elecCost + yt.waterCost + yt.trash;

  const utilBy = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const segments = spendBreakdown(ctx, monthInvoices(ctx, index + 1, year));
        return segments
          .filter(
            (segment) =>
              segment.name === "ຄ່າໄຟຟ້າ" || segment.name === "ຄ່ານ້ຳປະປາ" || segment.name === "ຄ່າຂີ້ເຫຍື້ອ"
          )
          .reduce((sum, segment) => sum + segment.value, 0);
      }),
    [ctx, year]
  );

  const monthSpend = useMemo(() => spendBreakdown(ctx, list), [ctx, list]);
  const yearSpend = useMemo(() => spendBreakdown(ctx, yearList), [ctx, yearList]);
  const activeSpend = spendScope === "month" ? monthSpend : yearSpend;
  const activeSpendTotal = activeSpend.reduce((sum, segment) => sum + segment.value, 0);
  const yearSpendTotal = yearSpend.reduce((sum, segment) => sum + segment.value, 0);

  const rentOf = (segments: SpendSegment[]) => segments.find((segment) => segment.name === "ຄ່າເຊົ່າ")?.value ?? 0;
  const yearCost = yearSpendTotal - rentOf(yearSpend);
  const yearProfit = yearStats.paid - yearCost;

  const monthSeries = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const invoices = monthInvoices(ctx, index + 1, year);
        let total = 0;
        let paid = 0;
        invoices.forEach((inv) => {
          const amount = invoiceTotal(ctx, inv);
          total += amount;
          if (inv.paid) paid += amount;
        });
        const segments = spendBreakdown(ctx, invoices);
        const rent = segments.find((segment) => segment.name === "ຄ່າເຊົ່າ")?.value ?? 0;
        const spend = segments.reduce((sum, segment) => sum + segment.value, 0);
        return {
          label: MONTH_SHORT[index],
          total,
          paid,
          unpaid: total - paid,
          spend,
          pending: pendingRooms(ctx, index + 1, year).length,
          extra: invoices.reduce(
            (sum, inv) => sum + extraFeesShareFor(ctx, inv.room, inv.year, inv.month),
            0
          ),
          profit: paid - (spend - rent)
        };
      }),
    [ctx, year]
  );

  const chartRows = useMemo(
    () =>
      monthSeries.map((row) => ({
        label: row.label,
        total: Math.round((row.total / 1000000) * 100) / 100,
        paid: Math.round((row.paid / 1000000) * 100) / 100
      })),
    [monthSeries]
  );

  const monthCounts = useMemo(
    () => Array.from({ length: 12 }, (_, index) => monthInvoices(ctx, index + 1, year).length),
    [ctx, year]
  );
  const maxMonthCount = Math.max(...monthCounts, 0);
  const fullMonthCount = useMemo(() => {
    if (!maxMonthCount) return 0;
    let end = 12;
    while (end > 0 && monthCounts[end - 1] < maxMonthCount) end -= 1;
    return end;
  }, [monthCounts, maxMonthCount]);
  const lastMonthCount = monthCounts[11];
  const lastMonthIncomplete = lastMonthCount > 0 && lastMonthCount < maxMonthCount;

  const cumSpendRows = useMemo(() => {
    let running = 0;
    return utilBy.map((value, index) => {
      running += value;
      return { label: MONTH_SHORT[index], total: Math.round((running / 1000000) * 100) / 100 };
    });
  }, [utilBy]);

  const monthUnpaidBy = monthSeries.map((row) => row.unpaid);
  const monthPendingBy = monthSeries.map((row) => row.pending);
  const monthExtraBy = monthSeries.map((row) => row.extra);

  const healthCards: HealthCard[] = [
    {
      label: "ສຸຂະພາບເດືອນນີ້",
      value: `${occupancyRate}`,
      countTo: occupancyRate,
      format: (value) => `${Math.round(value)}`,
      unit: "%",
      note: `${occupied}/${totalRooms} ຫ້ອງມີຜູ້ເຊົ່າ`,
      tone: "emerald",
      art: "apartments",
      bar: occupancyRate,
      footer: monthLabel(monthNumber, year)
    },
    {
      label: "ໃບບີນຄ້າງ",
      value: `${stats.unpaidCount}`,
      countTo: stats.unpaidCount,
      format: (value) => `${Math.round(value)}`,
      unit: "ໃບ",
      note: money(stats.unpaid, currency),
      tone: "indigo",
      art: "invoice",
      spark: monthUnpaidBy,
      footer: monthLabel(monthNumber, year)
    },
    {
      label: "ລໍຖ້າຈັດມິເຕີ",
      value: `${pending}`,
      countTo: pending,
      format: (value) => `${Math.round(value)}`,
      unit: "ຫ້ອງ",
      note: `${Math.max(0, list.length - pending)} ຈົດແລ້ວ`,
      tone: "amber",
      art: "clock",
      spark: monthPendingBy,
      footer: monthLabel(monthNumber, year)
    },
    {
      label: "ຄ່າບໍລິການເພີ່ມເຕີມ",
      value: money(extraTotal, currency),
      countTo: extraTotal,
      format: (value) => money(value, currency),
      note: "ເກັບເພີ່ມ",
      tone: "fuchsia",
      art: "wallet",
      spark: monthExtraBy,
      footer: monthLabel(monthNumber, year)
    }
  ];

  const quickActions = [
    { label: "ຈົດມິເຕີ", icon: <IconBolt size={15} />, path: "/meter" },
    { label: "ອອກໃບບີນ", icon: <IconReceipt2 size={15} />, path: "/invoices" },
    { label: "ເພີ່ມຜູ້ເຊົ່າ", icon: <IconPlus size={15} />, path: "/tenants" }
  ];

  return (
    <Stack gap="lg" pb="xl">
      <Box className="context-bar">
        <Box style={{ minWidth: 0 }}>
          <Text size="xs" fw={700} tt="uppercase" c="var(--brand)" style={{ fontSize: 10.5, letterSpacing: "0.12em" }}>
            ພາບລວມ
          </Text>
          <Title order={1} mt={2}>
            ສະບາຍດີ, ຜູ້ຈັດການ
          </Title>
          <Text size="sm" c="var(--text-body)" mt={2}>
            ລາຍຮັບ ແລະ ການໃຊ້ຈ່າຍ · {monthLabel(monthNumber, year)}
          </Text>
        </Box>

        <Group gap={8} wrap="nowrap">
          <Group gap={8} wrap="nowrap" visibleFrom="md">
            {quickActions.map((action) => (
              <Button
                key={action.path}
                size="compact-md"
                variant="light"
                leftSection={action.icon}
                onClick={() => navigate(action.path)}
              >
                {action.label}
              </Button>
            ))}
          </Group>
          <Menu shadow="md" width={200} radius="md" position="bottom-end">
            <Menu.Target>
              <Button size="compact-md" variant="light" leftSection={<IconSparkles size={15} />} hiddenFrom="md">
                ລັດ
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {quickActions.map((action) => (
                <Menu.Item key={action.path} leftSection={action.icon} onClick={() => navigate(action.path)}>
                  {action.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
          <MonthSwitcher />
        </Group>
      </Box>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 5 }} className="bento-hero">
          <Surface style={{ height: "100%" }} p={14}>
            <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
              <Box style={{ minWidth: 0 }}>
                <Text fw={600} c="var(--text-strong)" style={{ fontSize: 15, lineHeight: 1.4 }}>
                  ລາຍຮັບທັງໝົດ
                </Text>
                <Text size="xs" c="var(--text-muted)" mt={2}>
                  ປີ {year} · ລວມທັງປີ · ລ້ານກີບ
                </Text>
              </Box>
            </Group>

            <Group gap={16} mt={6} wrap="nowrap">
              <Group gap={6} wrap="nowrap">
                <ColorDot color={SERIES_COLORS.total} />
                <Text size="xs" c="var(--text-muted)">
                  ລວມ
                </Text>
              </Group>
              <Group gap={6} wrap="nowrap">
                <ColorDot color={SERIES_COLORS.paid} />
                <Text size="xs" c="var(--text-muted)">
                  ເກັບໄດ້
                </Text>
              </Group>
            </Group>

            <Group align="flex-end" gap={32} mt={6} wrap="wrap">
              <Box>
                <Text className="tnum" fw={700} c="var(--text-strong)" style={{ fontSize: 27, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
                  <CountUp value={yearStats.total} format={(value) => money(value, currency)} />
                </Text>
                <Text size="xs" c="var(--text-muted)" mt={4}>
                  ລາຍຮັບລວມ · ປີ {year}
                  {typeof change === "number"
                    ? ` · ${change >= 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(1)}%`
                    : ""}
                </Text>
              </Box>
              <Box>
                <Text className="tnum" fw={700} c="var(--text-strong)" style={{ fontSize: 21, lineHeight: 1.2 }}>
                  <CountUp value={yearList.length} format={num} />
                </Text>
                <Text size="xs" c="var(--text-muted)" mt={4}>
                  ໃບບີນໃນປີ
                </Text>
              </Box>
            </Group>

            <Button
              className="btn-grad"
              size="compact-md"
              mt={8}
              rightSection={<IconArrowRight size={14} />}
              onClick={() => navigate("/reports")}
            >
              ສະຫຼຸບປີ
            </Button>

            <RevenueTrend rows={chartRows} highlightIndex={monthNumber - 1} />

            <Box className="kpi-strip" mt={10}>
              <KpiItem
                label="ເກັບໄດ້ແລ້ວ"
                value={<CountUp value={yearStats.paid} format={(value) => money(value, currency)} />}
                icon={<IconWallet size={15} />}
                tint="#1B6FD6"
                background="rgba(27,111,214,0.12)"
              />
              <KpiItem
                label="ຍັງຄ້າງຊຳລະ"
                value={<CountUp value={yearStats.unpaid} format={(value) => money(value, currency)} />}
                icon={<IconClock size={15} />}
                tint="#7C5CE0"
                background="rgba(124,92,224,0.12)"
              />
              <KpiItem
                label="ຄ່າໃຊ້ຈ່າຍ (ບໍ່ລວມເຊົ່າ)"
                value={<CountUp value={yearCost} format={(value) => money(value, currency)} />}
                icon={<IconReceipt2 size={15} />}
                tint="#0EA5C6"
                background="rgba(14,165,198,0.12)"
              />
              <KpiItem
                label="ກຳໄລ"
                value={<CountUp value={yearProfit} format={(value) => money(value, currency)} />}
                icon={<IconTrendingUp size={15} />}
                tint="#D08A21"
                background="rgba(232,163,61,0.16)"
              />
            </Box>
          </Surface>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 3 }} className="bento-donut">
          <Surface
            title="ໂຄງສ້າງລາຍຈ່າຍ"
            hint={`ລວມທັງປີ ${year} · ${num(yearList.length)} ໃບ`}
            p="md"
            style={{ height: "100%" }}
          >
            {yearSpend.length ? (
              <Stack gap={5}>
                <Box style={{ display: "flex", justifyContent: "center" }}>
                  <DonutChart
                    data={yearSpend}
                    size={112}
                    thickness={18}
                    withTooltip
                    tooltipDataSource="segment"
                    chartLabel={`${(yearSpendTotal / 1000000).toFixed(1)} ລ້ານ`}
                    pieProps={{
                      paddingAngle: 2,
                      cornerRadius: 3,
                      isAnimationActive: true,
                      animationDuration: 900,
                      animationBegin: 0
                    }}
                  />
                </Box>

                {yearSpend.map((segment) => {
                  const percent = yearSpendTotal ? (segment.value / yearSpendTotal) * 100 : 0;
                  return (
                    <Box key={segment.name}>
                      <Group justify="space-between" gap={6} wrap="nowrap">
                        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                          <Box
                            style={{
                              flex: "none",
                              display: "grid",
                              placeItems: "center",
                              width: 18,
                              height: 18,
                              borderRadius: 6,
                              background: `color-mix(in srgb, ${segment.color} 14%, transparent)`,
                              color: segment.color
                            }}
                          >
                            {SPEND_ICONS[segment.name] ?? <IconSparkles size={11} />}
                          </Box>
                          <Text c="var(--text-body)" truncate style={{ fontSize: 11.5 }}>
                            {segment.name}
                          </Text>
                        </Group>

                        <Group gap={6} wrap="nowrap">
                          <Text className="tnum" fw={600} c="var(--text-strong)" style={{ fontSize: 11 }}>
                            <CountUp value={segment.value} format={(value) => money(value, currency)} />
                          </Text>
                          <Box
                            style={{
                              flex: "none",
                              minWidth: 28,
                              textAlign: "center",
                              padding: "1px 5px",
                              borderRadius: 999,
                              background: `color-mix(in srgb, ${segment.color} 16%, transparent)`,
                              color: segment.color,
                              fontSize: 10,
                              fontWeight: 700
                            }}
                          >
                            {Math.round(percent)}%
                          </Box>
                        </Group>
                      </Group>

                      <Progress
                        value={entered ? percent : 0}
                        transitionDuration={900}
                        size={4}
                        radius="xl"
                        mt={3}
                        styles={{
                          root: { background: "var(--hairline)" },
                          section: { background: segment.color }
                        }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Text size="sm" c="var(--text-muted)" py="xl" ta="center">
                ຍັງບໍ່ມີຂໍ້ມູນລາຍຈ່າຍ
              </Text>
            )}
          </Surface>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 4 }} className="bento-health">
          <Box className="health-grid">
            {healthCards.map((card) => (
              <HealthTile key={card.label} {...card} />
            ))}
          </Box>
        </Grid.Col>
      </Grid>

      <Box>
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm" mb="md">
          <Box style={{ minWidth: 0 }}>
            <Text fw={600} c="var(--text-strong)" style={{ fontSize: 15, lineHeight: 1.4 }}>
              ຄ່າໃຊ້ຈ່າຍ
            </Text>
            <Text size="xs" c="var(--text-muted)" mt={2} style={{ lineHeight: 1.5 }}>
              {spendScope === "month"
                ? `${monthLabel(monthNumber, year)} · ${list.length} ຫ້ອງ`
                : `ລວມປີ ${year} · ${yt.months} ເດືອນທີ່ມີໃບບີນ`}
            </Text>
          </Box>
          <Box style={{ flexShrink: 0 }}>
            <SegmentedControl
              size="xs"
              radius="md"
              value={spendScope}
              onChange={(value) => setSpendScope(value as "month" | "year")}
              data={[
                { value: "month", label: "ເດືອນນີ້" },
                { value: "year", label: "ປີນີ້" }
              ]}
            />
          </Box>
        </Group>

        {activeSpend.length ? (
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="md">
            {activeSpend.map((segment) => {
              const percent = activeSpendTotal ? (segment.value / activeSpendTotal) * 100 : 0;
              return (
                <Box
                  key={segment.name}
                  className="tile lift spend-card"
                  style={{
                    background: (SPEND_TONES[segment.color] ?? TOTAL_TONE).gradient,
                    boxShadow: `0 18px 32px -26px ${(SPEND_TONES[segment.color] ?? TOTAL_TONE).shadow}`
                  }}
                >
                  <CardArt kind={(SPEND_TONES[segment.color] ?? TOTAL_TONE).art} />
                  <Group justify="space-between" align="flex-start" wrap="nowrap" gap={6}>
                    <Text className="tile-label" truncate>
                      {segment.name}
                    </Text>
                    <Box className="spend-ico">{(SPEND_TONES[segment.color] ?? TOTAL_TONE).icon}</Box>
                  </Group>

                  <Text className="tile-value tnum" mt={10} style={{ fontSize: 18, whiteSpace: "normal" }}>
                    <CountUp value={segment.value} format={(value) => money(value, currency)} />
                  </Text>

                  <Box mt="auto" pt={14}>
                    <Group justify="space-between" gap={6} wrap="nowrap" mb={6}>
                      <Text className="tile-foot">ສ່ວນແບ່ງ</Text>
                      <Text className="tile-foot tnum" fw={600} style={{ color: "#fff" }}>
                        {Math.round(percent)}%
                      </Text>
                    </Group>
                    <Progress
                      value={entered ? percent : 0}
                      transitionDuration={900}
                      size={5}
                      radius="xl"
                      styles={{ root: { background: "rgba(255,255,255,0.28)" }, section: { background: "#fff" } }}
                    />
                  </Box>
                </Box>
              );
            })}

            <Box
              className="tile lift spend-card"
              style={{ background: TOTAL_TONE.gradient, boxShadow: `0 20px 34px -26px ${TOTAL_TONE.shadow}` }}
            >
              <CardArt kind={TOTAL_TONE.art} />
              <Group justify="space-between" align="flex-start" wrap="nowrap" gap={6}>
                <Text className="tile-label" truncate>
                  ລວມທັງໝົດ
                </Text>
                <Box className="spend-ico">{TOTAL_TONE.icon}</Box>
              </Group>

              <Text className="tile-value tnum" mt={10} style={{ fontSize: 18, whiteSpace: "normal" }}>
                <CountUp value={activeSpendTotal} format={(value) => money(value, currency)} />
              </Text>

              <Box mt="auto" pt={14}>
                <Group justify="space-between" gap={6} wrap="nowrap" mb={6}>
                  <Text className="tile-foot">ສ່ວນແບ່ງ</Text>
                  <Text className="tile-foot tnum" fw={600} style={{ color: "#fff" }}>
                    100%
                  </Text>
                </Group>
                <Progress
                  value={entered ? 100 : 0}
                  transitionDuration={900}
                  size={5}
                  radius="xl"
                  styles={{ root: { background: "rgba(255,255,255,0.28)" }, section: { background: "#fff" } }}
                />
              </Box>
            </Box>
          </SimpleGrid>
        ) : (
          <Text size="sm" c="var(--text-muted)" py="md" ta="center">
            ຍັງບໍ່ມີຂໍ້ມູນຄ່າໃຊ້ຈ່າຍ{spendScope === "month" ? "ໃນເດືອນນີ້" : "ໃນປີນີ້"}
          </Text>
        )}

        {activeSpend.length ? (
          <Text size="xs" c="var(--text-muted)" mt={10}>
            ສະເລ່ຍ{" "}
            {money(activeSpendTotal / Math.max(1, spendScope === "month" ? list.length : yt.months), currency)}
            {spendScope === "month" ? " / ຫ້ອງ" : " / ເດືອນ"} · ຄ່າໄຟຟ້າ {num(stats.kwh)} kWh ×{" "}
            {money(rates.electricRate, currency)}
          </Text>
        ) : null}
      </Box>

      <Box>
        <Group justify="space-between" mb={10}>
          <Text fw={600} c="var(--text-strong)" style={{ fontSize: 15 }}>
            ການໃຊ້ຈ່າຍ 1 ປີ · {year}
          </Text>
          <Text size="xs" c="var(--text-muted)">
            {yt.months} ເດືອນທີ່ມີໃບບີນ
            {lastMonthIncomplete ? ` · ${MONTH_SHORT[11]} ມີ ${lastMonthCount}/${maxMonthCount} ຫ້ອງ` : ""}
          </Text>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <HealthTile
            label="ການໃຊ້ໄຟຟ້າ"
            value={num(yt.kwh)}
            countTo={yt.kwh}
            format={num}
            unit="kWh"
            note={`ສະເລ່ຍ ${num(Math.round(monthlyAverage))} kWh/ເດືອນ`}
            tone="lime"
            art="bolt"
            spark={yt.kwhBy.slice(0, fullMonthCount)}
            footer={`ປີ ${year} · ${yt.months} ເດືອນ`}
          />
          <HealthTile
            label="ຄ່ານ້ຳປະປາ"
            value={money(yt.waterCost, currency)}
            countTo={yt.waterCost}
            format={(value) => money(value, currency)}
            note={`ສະເລ່ຍ ${money(yt.months ? yt.waterCost / yt.months : 0, currency)}/ເດືອນ`}
            tone="teal"
            art="droplet"
            spark={yt.waterBy.slice(0, fullMonthCount)}
            footer={`ປີ ${year} · ${yt.months} ເດືອນ`}
          />
          <HealthTile
            label="ຄ່າຂີ້ເຫຍື້ອ"
            value={money(yt.trash, currency)}
            countTo={yt.trash}
            format={(value) => money(value, currency)}
            note={`ສະເລ່ຍ ${money(yt.months ? yt.trash / yt.months : 0, currency)}/ເດືອນ`}
            tone="bronze"
            art="trash"
            spark={yt.trashBy.slice(0, fullMonthCount)}
            footer={`ປີ ${year} · ${yt.months} ເດືອນ`}
          />
          <HealthTile
            label="ລວມຄ່າໃຊ້ຈ່າຍ"
            value={money(spendTotal, currency)}
            countTo={spendTotal}
            format={(value) => money(value, currency)}
            note={`ໄຟຟ້າ ${money(yt.elecCost, currency)} · ນ້ຳ ${money(yt.waterCost, currency)}`}
            tone="rose"
            art="wallet"
            spark={utilBy.slice(0, fullMonthCount)}
            footer={`ປີ ${year} · ${yt.months} ເດືອນ`}
          />
        </SimpleGrid>
      </Box>

      <Box className="tile lift tile--graphite cum-card">
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
          <Box style={{ minWidth: 0 }}>
            <Text className="tile-label">ລາຍຈ່າຍສະສົມ · {year}</Text>
            <Text className="tile-value tnum" mt={6} style={{ fontSize: 27 }}>
              <CountUp value={spendTotal} format={(value) => money(value, currency)} />
            </Text>
            <Text className="tile-note" mt={3}>
              ໄຟຟ້າ + ນ້ຳປະປາ + ຂີ້ເຫຍື້ອ ສະສົມລາຍເດືອນ · ສະເລ່ຍ{" "}
              {money(yt.months ? spendTotal / yt.months : 0, currency)}/ເດືອນ
            </Text>
          </Box>
          <Box className="spend-ico">
            <IconTrendingUp size={14} />
          </Box>
        </Group>

        {spendTotal ? (
          <Box mt="md" style={{ marginInline: -6 }}>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsAreaChart data={cumSpendRows} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cum-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#67E8F9" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#67E8F9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cum-line" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#67E8F9" />
                    <stop offset="100%" stopColor="#C4B5FD" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.16)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 10.5, fill: "rgba(255,255,255,0.72)" }}
                />
                <YAxis
                  width={40}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10.5, fill: "rgba(255,255,255,0.72)" }}
                />
                <RechartsTooltip
                  cursor={{ stroke: "rgba(255,255,255,0.35)", strokeWidth: 1 }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(15,23,42,0.94)",
                    boxShadow: "0 16px 34px -24px rgba(0,0,0,0.6)",
                    fontSize: 12,
                    padding: "8px 10px"
                  }}
                  labelStyle={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 2 }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value) => [`${Number(value).toFixed(2)} ລ້ານ`, "ສະສົມ"]}
                />
                <RechartsArea
                  type="monotone"
                  dataKey="total"
                  stroke="url(#cum-line)"
                  strokeWidth={2.6}
                  fill="url(#cum-fill)"
                  dot={false}
                  activeDot={{ r: 5, fill: "#fff", stroke: "#67E8F9", strokeWidth: 3 }}
                  isAnimationActive
              animationDuration={900}
                />
              </RechartsAreaChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Text size="sm" mt="md" ta="center" style={{ color: "rgba(255,255,255,0.78)" }}>
            ຍັງບໍ່ມີຂໍ້ມູນລາຍຈ່າຍໃນປີນີ້
          </Text>
        )}
      </Box>

      {!list.length ? (
        <Surface>
          <Group justify="space-between" wrap="wrap" gap="sm">
            <Group gap={10} wrap="nowrap">
              <IconDoorEnter size={18} color="var(--brand)" />
              <Text size="sm" c="var(--text-body)">
                ຍັງບໍ່ມີຂໍ້ມູນຄ່າໃຊ້ຈ່າຍໃນເດືອນນີ້ — ຈົດມິເຕີ ຫຼື ເລືອກເດືອນອື່ນ
              </Text>
            </Group>
            <Group gap={8}>
              <Tooltip label="ຈົດມິເຕີເດືອນນີ້" withArrow>
                <Button size="compact-sm" variant="light" onClick={() => navigate("/meter")}>
                  ຈົດມິເຕີ
                </Button>
              </Tooltip>
              <Button
                size="compact-sm"
                variant="subtle"
                rightSection={<IconArrowRight size={14} />}
                onClick={() => {
                  const latest = yearList[0];
                  if (latest) setMonth({ year: latest.year, month: latest.month });
                }}
              >
                ໄປເດືອນທີ່ມີຂໍ້ມູນ
              </Button>
            </Group>
          </Group>
        </Surface>
      ) : null}

      <Group gap="xs" visibleFrom="sm">
        <IconTool size={13} color="var(--text-muted)" />
        <Text size="xs" c="var(--text-muted)">
          ຂໍ້ມູນຄຳນວນຈາກອັດຕາເດືອນ {monthLabel(monthNumber, year)} · {residentPeople(ctx.tenants)} ຄົນ /{" "}
          {residentRoomCount(ctx.tenants)} ຫ້ອງ
        </Text>
      </Group>
    </Stack>
  );
}
