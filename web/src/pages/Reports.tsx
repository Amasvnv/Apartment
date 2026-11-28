import { Box, Grid, Group, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";
import { DonutChart, LineChart } from "@mantine/charts";
import { useMediaQuery } from "@mantine/hooks";
import { IconBolt, IconChartBar, IconDroplet, IconReceipt2, IconTrendingUp, IconWallet } from "@tabler/icons-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import MonthSwitcher from "../components/MonthSwitcher";
import PageHeader from "../components/PageHeader";
import CardArt, { type CardArtKind } from "../components/ui/CardArt";
import { useStore } from "../data/store";
import {
  ctxOf,
  extraFeesShareFor,
  invoiceRates,
  invoiceStats,
  invoiceTotal,
  monthInvoices,
  ratesForMonth,
  serviceCostFor,
  sortRoomsByNo,
  trashCostFor,
  waterCostFor,
  yearInvoices
} from "../lib/compute";
import { MONTH_SHORT, money, monthLabel, num } from "../lib/format";

const GRADIENTS = {
  blue:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #0a5fd0 0%, #2563eb 55%, #7cbcff 100%)",
  green:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #0e7c5a 0%, #12a06a 52%, #43cf9b 100%)",
  amber:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #c2740c 0%, #f59e0b 52%, #fcd34d 100%)",
  violet:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.32), transparent 62%), linear-gradient(142deg, #5b21b6 0%, #8b5cf6 52%, #c4b5fd 100%)"
} as const;

const DEBT_TONES = ["#f59e0b", "#64748b", "#c2740c", "#2563eb", "#8b5cf6", "#06b6d4", "#ef4444", "#12a06a"];

/** ໃຫ້ຕົວເລກ“ວິ່ງ”ຈາກ 0 ຫາ ຄ່າສຸດທ້າຍ (ໃຊ້ຮ່ວມກັບກຣາຟ/ວົງກົມ/ແທ່ງ) */
function CountUp({
  value,
  format,
  duration = 900
}: {
  value: number;
  format: (value: number) => string;
  duration?: number;
}) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(value)) {
      setShown(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(value * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format(shown)}</>;
}

export default function Reports() {
  const { data, month } = useStore();
  const ctx = useMemo(() => ctxOf(data), [data]);
  const currency = data.settings.currency;
  const { year, month: monthNumber } = month;

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const monthIndexValue = year * 12 + (monthNumber - 1) - (11 - index);
      return { year: Math.floor(monthIndexValue / 12), month: (monthIndexValue % 12) + 1 };
    });
  }, [year, monthNumber]);

  // ຕັດເດືອນທ້າຍທີ່ຍັງບໍ່ມີໃບບີນເລີຍອອກ ເພື່ອບໍ່ໃຫ້ເສັ້ນກຣາຟຕົກລົງ 0 ຢ່າງຜິດທີ່
  const monthsInChart = useMemo(() => {
    let end = months.length;
    while (end > 0 && monthInvoices(ctx, months[end - 1].month, months[end - 1].year).length === 0) end--;
    return end ? months.slice(0, end) : months;
  }, [ctx, months]);

  const usageRows = monthsInChart.map((entry) => {
    const stats = invoiceStats(ctx, monthInvoices(ctx, entry.month, entry.year));
    return {
      label: MONTH_SHORT[entry.month - 1],
      kwh: stats.kwh,
      m3: stats.m3,
      total: Math.round(stats.total / 1000000)
    };
  });

  const kwhTotal = usageRows.reduce((sum, row) => sum + row.kwh, 0);
  const m3Total = usageRows.reduce((sum, row) => sum + row.m3, 0);
  const kwhMax = Math.max(...usageRows.map((row) => row.kwh), 0);

  const waterRows = monthsInChart.map((entry) => {
    const rates = ratesForMonth(ctx.settings, entry.year, entry.month);
    const cost = monthInvoices(ctx, entry.month, entry.year).reduce(
      (sum, invoice) => sum + waterCostFor(ctx, invoice.room, rates),
      0
    );
    return { label: MONTH_SHORT[entry.month - 1], costK: Math.round(cost / 1000) };
  });

  const waterCostTotal = waterRows.reduce((sum, row) => sum + row.costK, 0) * 1000;
  const waterCostMaxK = Math.max(...waterRows.map((row) => row.costK), 0);
  const waterBest = waterRows.find((row) => row.costK === waterCostMaxK);

  const typeTotals = useMemo(() => {
    const totals = { rent: 0, electric: 0, water: 0, trash: 0, service: 0, extra: 0 };
    yearInvoices(ctx, year).forEach((invoice) => {
      const rates = invoiceRates(ctx, invoice);
      totals.rent += Number(invoice.rent) || 0;
      totals.electric += (Number(invoice.kwh) || 0) * rates.electricRate;
      totals.water += waterCostFor(ctx, invoice.room, rates);
      totals.trash += trashCostFor(ctx, invoice.room, rates);
      totals.service += serviceCostFor(ctx, invoice.room, rates);
      totals.extra += (Number(invoice.other) || 0) + extraFeesShareFor(ctx, invoice.room, invoice.year, invoice.month);
    });
    return [
      { name: "ຄ່າເຊົ່າ", value: totals.rent, color: "#1B6FD6" },
      { name: "ຄ່າໄຟຟ້າ", value: totals.electric, color: "#FFB454" },
      { name: "ຄ່ານ້ຳປະປາ", value: totals.water, color: "#4FC9FF" },
      { name: "ຄ່າຂີ້ເຫຍື້ອ", value: totals.trash, color: "#8E9FB5" },
      { name: "ຄ່າບໍລິການ", value: totals.service, color: "#34D399" },
      { name: "ຄ່າເພີ່ມເຕີມ", value: totals.extra, color: "#F472B6" }
    ].filter((item) => item.value > 0);
  }, [ctx, year]);

  const typeTotal = typeTotals.reduce((sum, item) => sum + item.value, 0);

  const debts = data.rooms
    .map((room) => {
      const unpaid = yearInvoices(ctx, year).filter((invoice) => invoice.room === room.no && !invoice.paid);
      return {
        room: room.no,
        tenant: room.tenant || "—",
        count: unpaid.length,
        amount: unpaid.reduce((sum, invoice) => sum + invoiceTotal(ctx, invoice), 0)
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const debtTotal = debts.reduce((sum, item) => sum + item.amount, 0);
  const debtMax = Math.max(...debts.map((item) => item.amount), 1);

  const currentStats = invoiceStats(ctx, monthInvoices(ctx, monthNumber, year));

  const [roomSort, setRoomSort] = useState<"usage" | "no">("usage");
  const isNarrow = useMediaQuery("(max-width: 48em)");
  const monthLabels = months.map((entry) => MONTH_SHORT[entry.month - 1]);
  const currentRates = ratesForMonth(ctx.settings, year, monthNumber);

  const allRoomUsage = sortRoomsByNo(ctx.rooms)
    .map((room) => {
      const series = months.map((entry) => {
        const invoice = monthInvoices(ctx, entry.month, entry.year).find(
          (item) => String(item.room) === String(room.no)
        );
        return Number(invoice?.kwh) || 0;
      });
      const kwh = series[series.length - 1] || 0;
      const prevKwh = series[series.length - 2] || 0;
      return {
        no: room.no,
        tenant: room.tenant || room.type,
        series,
        kwh,
        prevKwh,
        cost: Math.round(kwh * currentRates.electricRate)
      };
    })
    .filter((row) => row.series.some((value) => value > 0));

  // ສະເພາະຫ້ອງທີ່ມີການຈົດມິເຕີໃນເດືອນທີ່ເລືອກ ສ່ວນຫ້ອງທີ່ຍັງບໍ່ຈົດນັບແຍກ
  const roomUsage = allRoomUsage.filter((row) => row.kwh > 0);
  const roomPendingCount = allRoomUsage.filter((row) => !row.kwh).length;

  const roomRows = [...roomUsage].sort((a, b) =>
    roomSort === "usage" ? b.kwh - a.kwh || a.no.localeCompare(b.no) : 0
  );
  const roomKwhTotal = roomUsage.reduce((sum, row) => sum + row.kwh, 0);
  const roomCostTotal = roomUsage.reduce((sum, row) => sum + row.cost, 0);
  const roomMax = Math.max(...roomUsage.map((row) => row.kwh), 1);
  const roomSparkMax = Math.max(...roomUsage.flatMap((row) => row.series), 1);
  const roomTop = [...roomUsage].sort((a, b) => b.kwh - a.kwh)[0];
  const roomPrevTotal = roomUsage.reduce((sum, row) => sum + row.prevKwh, 0);
  const roomDelta = roomPrevTotal
    ? Math.round(((roomKwhTotal - roomPrevTotal) / roomPrevTotal) * 100)
    : null;

  const tiles: {
    label: string;
    value: string;
    count?: number;
    format?: (value: number) => string;
    note: string;
    icon: ReactNode;
    art: CardArtKind;
    gradient: string;
    shadow: string;
  }[] = [
    {
      label: "ລາຍຮັບເດືອນນີ້",
      value: money(currentStats.total, currency),
      count: currentStats.total,
      format: (value) => money(Math.round(value), currency),
      note: `${num(monthInvoices(ctx, monthNumber, year).length)} ໃບບີນ · ${monthLabel(monthNumber, year)}`,
      icon: <IconReceipt2 size={14} />,
      art: "invoice",
      gradient: GRADIENTS.blue,
      shadow: "rgba(37,99,235,0.45)"
    },
    {
      label: "ເກັບໄດ້",
      value: money(currentStats.paid, currency),
      count: currentStats.paid,
      format: (value) => money(Math.round(value), currency),
      note: `${num(currentStats.paidCount)} ໃບຊຳລະແລ້ວ`,
      icon: <IconWallet size={14} />,
      art: "check",
      gradient: GRADIENTS.green,
      shadow: "rgba(18,160,106,0.45)"
    },
    {
      label: "ຍັງຄ້າງ",
      value: money(currentStats.unpaid, currency),
      count: currentStats.unpaid,
      format: (value) => money(Math.round(value), currency),
      note: `${num(currentStats.unpaidCount)} ໃບ ລໍຖ້າເກັບ`,
      icon: <IconTrendingUp size={14} />,
      art: "clock",
      gradient: GRADIENTS.amber,
      shadow: "rgba(245,158,11,0.5)"
    },
    {
      label: "ອັດຕາເກັບເງິນໄດ້",
      value: `${currentStats.rate}%`,
      count: currentStats.rate,
      format: (value) => `${Math.round(value)}%`,
      note: `${num(currentStats.kwh)} kWh · ${num(currentStats.m3)} m³`,
      icon: <IconChartBar size={14} />,
      art: "chart",
      gradient: GRADIENTS.violet,
      shadow: "rgba(139,92,246,0.45)"
    }
  ];

  const kwhChips = (() => {
    const best = usageRows.find((row) => row.kwh === kwhMax);
    return [
      {
        label: "ລວມ 12 ເດືອນ",
        count: kwhTotal,
        format: (value: number) => `${num(Math.round(value))} kWh`
      },
      {
        label: "ສະເລ່ຍ/ເດືອນ",
        count: kwhTotal / 12,
        format: (value: number) => `${num(Math.round(value))} kWh`
      },
      {
        label: "ສູງສຸດ",
        count: kwhMax,
        format: (value: number) => `${num(Math.round(value))} kWh · ${best?.label ?? "—"}`
      }
    ];
  })();

  const waterChips = [
    {
      label: "ລວມ 12 ເດືອນ",
      count: waterCostTotal,
      format: (value: number) => money(Math.round(value), currency)
    },
    {
      label: "ສະເລ່ຍ/ເດືອນ",
      count: waterCostTotal / 12,
      format: (value: number) => money(Math.round(value), currency)
    },
    {
      label: "ສູງສຸດ",
      count: waterCostMaxK * 1000,
      format: (value: number) => `${money(Math.round(value), currency)} · ${waterBest?.label ?? "—"}`
    },
    ...(m3Total
      ? [
          {
            label: "ລວມ m³",
            count: m3Total,
            format: (value: number) => `${num(Math.round(value))} m³`
          }
        ]
      : [])
  ];

  const chartProps = {
    h: 210,
    dataKey: "label",
    gridAxis: "y" as const,
    withTooltip: true,
    tooltipAnimationDuration: 150,
    curveType: "monotone" as const,
    strokeWidth: 3,
    withDots: true,
    dotProps: { r: 3, strokeWidth: 2 },
    activeDotProps: { r: 5, strokeWidth: 2 },
    xAxisProps: {
      tickLine: false,
      interval: isNarrow ? 1 : 0,
      minTickGap: 4,
      tick: { fontSize: 10.5 }
    },
    yAxisProps: { tickLine: false, width: 38, tick: { fontSize: 10.5 } }
  };

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ສະຖິຕິການໃຊ້ມິເຕີ ແລະ ລາຍຮັບ"
        subtitle={`12 ເດືອນຫຼ້າສຸດ ຮອດ ${monthLabel(monthNumber, year)} · ພາບລວມການເກັບເງິນ ແລະ ການໃຊ້ສິ່ງອຳນວຍຄວາມສະດວກ`}
        actions={<MonthSwitcher />}
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
            <Text className="tile-value tnum" mt={10} style={{ fontSize: 22 }}>
              {typeof tile.count === "number" && tile.format ? (
                <CountUp value={tile.count} format={tile.format} />
              ) : (
                tile.value
              )}
            </Text>
            <Text className="tile-note" mt={6}>
              {tile.note}
            </Text>
          </Box>
        ))}
      </SimpleGrid>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Box className="surface rp-card">
            <Group justify="space-between" align="flex-start" gap="sm" mb={10}>
              <Group gap={10} wrap="nowrap">
                <Box className="rp-ico" style={{ "--tone": "#f59e0b" } as CSSProperties}>
                  <IconBolt size={15} />
                </Box>
                <Box>
                  <Text className="rp-title">ການໃຊ້ໄຟຟ້າ</Text>
                  <Text className="rp-sub">12 ເດືອນຫຼ້າສຸດ · kWh</Text>
                </Box>
              </Group>
              <span className="rp-badge" style={{ "--tone": "#f59e0b" } as CSSProperties}>
                ລວມ <CountUp value={kwhTotal} format={(value) => `${num(Math.round(value))} kWh`} />
              </span>
            </Group>

            <Group gap={6} wrap="wrap" mb={8}>
              {kwhChips.map((chip) => (
                <span key={chip.label} className="rp-chip">
                  <span className="rp-chip-label">{chip.label}</span>
                  <span className="rp-chip-value tnum">
                    <CountUp value={chip.count} format={chip.format} />
                  </span>
                </span>
              ))}
            </Group>

            <LineChart
              {...chartProps}
              data={usageRows}
              series={[{ name: "kwh", label: "kWh", color: "#f59e0b" }]}
              lineProps={{ isAnimationActive: true, animationDuration: 1100, animationEasing: "ease-out" }}
            />
            {!kwhTotal ? <Text className="rp-empty">ຍັງບໍ່ມີການຈົດມິເຕີໄຟໃນ 12 ເດືອນນີ້</Text> : null}
          </Box>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Box className="surface rp-card">
            <Group justify="space-between" align="flex-start" gap="sm" mb={10}>
              <Group gap={10} wrap="nowrap">
                <Box className="rp-ico" style={{ "--tone": "#06b6d4" } as CSSProperties}>
                  <IconDroplet size={15} />
                </Box>
                <Box>
                  <Text className="rp-title">ຄ່ານ້ຳປະປາແຕ່ລະເດືອນ</Text>
                  <Text className="rp-sub">12 ເດືອນຫຼ້າສຸດ · ຄ່ານ້ຳທີ່ເກັບໄດ້ (ພັນ ₭)</Text>
                </Box>
              </Group>
              <span className="rp-badge" style={{ "--tone": "#06b6d4" } as CSSProperties}>
                ລວມ <CountUp value={waterCostTotal} format={(value) => money(Math.round(value), currency)} />
              </span>
            </Group>

            <Group gap={6} wrap="wrap" mb={8}>
              {waterChips.map((chip) => (
                <span key={chip.label} className="rp-chip">
                  <span className="rp-chip-label">{chip.label}</span>
                  <span className="rp-chip-value tnum">
                    <CountUp value={chip.count} format={chip.format} />
                  </span>
                </span>
              ))}
            </Group>

            <Box style={{ position: "relative" }}>
              <LineChart
                {...chartProps}
                data={waterRows}
                series={[{ name: "costK", label: "ຄ່ານ້ຳ", color: "#06b6d4" }]}
                lineProps={{ isAnimationActive: true, animationDuration: 1100, animationEasing: "ease-out" }}
                valueFormatter={(value) => money(Number(value) * 1000, currency)}
                yAxisProps={{
                  tickLine: false,
                  width: 44,
                  tickFormatter: (value: number) => `${num(Number(value))}K`
                }}
              />
              {!waterCostTotal ? (
                <Box className="rp-chart-empty">
                  <IconDroplet size={16} />
                  <Text className="rp-empty">ຍັງບໍ່ມີຄ່ານ້ຳປະປາໃນ 12 ເດືອນນີ້</Text>
                </Box>
              ) : null}
            </Box>
          </Box>
        </Grid.Col>
      </Grid>

      <Box className="surface rp-card">
        <Group justify="space-between" align="flex-start" gap="md" mb={10} wrap="wrap">
          <Group gap={10} wrap="nowrap">
            <Box className="rp-ico" style={{ "--tone": "#f59e0b" } as CSSProperties}>
              <IconBolt size={15} />
            </Box>
            <Box>
              <Text className="rp-title">ການໃຊ້ໄຟຟ້າແຍກຕາມຫ້ອງ</Text>
              <Text className="rp-sub">
                {monthLabel(monthNumber, year)} · ໜ່ວຍທີ່ໃຊ້ ແລະ ຄ່າໄຟຟ້າຂອງແຕ່ລະຫ້ອງ
              </Text>
            </Box>
          </Group>
          <SegmentedControl
            size="xs"
            radius="xl"
            fullWidth={!!isNarrow}
            style={isNarrow ? { width: "100%" } : undefined}
            value={roomSort}
            onChange={(value) => setRoomSort(value as "usage" | "no")}
            data={[
              { label: "ໃຊ້ຫຼາຍ→ໜ້ອຍ", value: "usage" },
              { label: "ຕາມເລກຫ້ອງ", value: "no" }
            ]}
          />
        </Group>

        <Group gap={6} wrap="wrap" mb={10}>
          <span className="rp-chip">
            <span className="rp-chip-label">ລວມເດືອນນີ້</span>
            <span className="rp-chip-value tnum">
              <CountUp value={roomKwhTotal} format={(value) => `${num(Math.round(value))} kWh`} />
            </span>
          </span>
          <span className="rp-chip">
            <span className="rp-chip-label">ສະເລ່ຍ/ຫ້ອງ</span>
            <span className="rp-chip-value tnum">
              <CountUp
                value={roomUsage.length ? roomKwhTotal / roomUsage.length : 0}
                format={(value) => `${num(Math.round(value))} kWh`}
              />
            </span>
          </span>
          {roomTop && roomTop.kwh ? (
            <span className="rp-chip">
              <span className="rp-chip-label">ຫ້ອງສູງສຸດ</span>
              <span className="rp-chip-value tnum">
                ຫ້ອງ {roomTop.no} · <CountUp value={roomTop.kwh} format={(value) => `${num(Math.round(value))} kWh`} />
              </span>
            </span>
          ) : null}
          <span className="rp-chip">
            <span className="rp-chip-label">ຄ່າໄຟຟ້າລວມ</span>
            <span className="rp-chip-value tnum">
              <CountUp value={roomCostTotal} format={(value) => money(Math.round(value), currency)} />
            </span>
          </span>
          {roomPendingCount ? (
            <span className="rp-chip">
              <span className="rp-chip-label">ຍັງບໍ່ຈົດເດືອນນີ້</span>
              <span className="rp-chip-value tnum">{num(roomPendingCount)} ຫ້ອງ</span>
            </span>
          ) : null}
          {roomDelta !== null ? (
            <span className={`rp-chip rp-chip-delta ${roomDelta > 0 ? "up" : roomDelta < 0 ? "down" : "flat"}`}>
              <span className="rp-chip-label">ທຽບເດືອນກ່ອນ</span>
              <span className="rp-chip-value tnum">
                {roomDelta > 0 ? "▲" : roomDelta < 0 ? "▼" : "–"} {Math.abs(roomDelta)}%
              </span>
            </span>
          ) : null}
        </Group>

        {roomRows.length ? (
          <Box className="rp-rooms" key={`${year}-${monthNumber}`}>
            {roomRows.map((row) => {
              const delta = row.prevKwh ? Math.round(((row.kwh - row.prevKwh) / row.prevKwh) * 100) : null;
              return (
                <Box key={row.no} className="rp-room" style={{ "--tone": "#f59e0b" } as CSSProperties}>
                  <span className="rp-room-no">{row.no}</span>
                  <Box style={{ minWidth: 0 }}>
                    <Group gap={8} wrap="nowrap">
                      <Text className="rp-room-name">ຫ້ອງ {row.no}</Text>
                      <Text className="rp-room-tenant" truncate>
                        {row.tenant}
                      </Text>
                    </Group>
                    <Box className="rp-room-bar">
                      <span style={{ width: `${Math.max(row.kwh ? 2 : 0, (row.kwh / roomMax) * 100)}%` }} />
                    </Box>
                  </Box>
                  <Box className="rp-room-spark">
                    {row.series.map((value, index) => (
                      <span
                        key={monthLabels[index]}
                        className={`${index === row.series.length - 1 ? "on" : ""} ${value ? "" : "zero"}`.trim()}
                        title={`${monthLabels[index]} · ${num(value)} kWh`}
                        style={{ height: `${value ? Math.max(12, (value / roomSparkMax) * 100) : 8}%` }}
                      />
                    ))}
                  </Box>
                  <Box className="rp-room-kwh">
                    {row.kwh ? (
                      <>
                        <b className="tnum">
                          <CountUp value={row.kwh} format={(value) => `${num(Math.round(value))} kWh`} />
                        </b>
                        <small>
                          <CountUp value={row.cost} format={(value) => money(Math.round(value), currency)} />
                        </small>
                      </>
                    ) : (
                      <>
                        <b>—</b>
                        <small>ຍັງບໍ່ຈົດມິເຕີ</small>
                      </>
                    )}
                  </Box>
                  <span
                    className={`rp-delta ${delta === null ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat"}`}
                    title={`ເດືອນກ່ອນ ${num(row.prevKwh)} kWh`}
                  >
                    {delta === null ? "ໃໝ່" : `${delta > 0 ? "▲" : delta < 0 ? "▼" : "–"} ${Math.abs(delta)}%`}
                  </span>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Text className="rp-empty">ຍັງບໍ່ມີການຈົດມິເຕີໄຟໃນເດືອນນີ້ — ເລືອກເດືອນອື່ນ ຫຼື ຈົດມິເຕີກ່ອນ</Text>
        )}
      </Box>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Box className="surface rp-card" style={{ height: "100%" }}>
            <Group justify="space-between" align="flex-start" mb={10}>
              <Group gap={10} wrap="nowrap">
                <Box className="rp-ico" style={{ "--tone": "#1b6fd6" } as CSSProperties}>
                  <IconReceipt2 size={15} />
                </Box>
                <Box>
                  <Text className="rp-title">ລາຍຮັບແຍກຕາມປະເພດ</Text>
                  <Text className="rp-sub">ປີ {year} · ລວມ {num(yearInvoices(ctx, year).length)} ໃບ</Text>
                </Box>
              </Group>
              <span className="rp-badge" style={{ "--tone": "#1b6fd6" } as CSSProperties}>
                <CountUp value={typeTotal} format={(value) => money(Math.round(value), currency)} />
              </span>
            </Group>

            {typeTotals.length ? (
              <Group align="center" gap="lg" wrap="wrap">
                <Box className="rp-donut-wrap" style={{ justifyContent: "center" }}>
                  <DonutChart
                    data={typeTotals}
                    size={158}
                    thickness={24}
                    withTooltip
                    tooltipDataSource="segment"
                    pieProps={{ paddingAngle: 2, cornerRadius: 3, isAnimationActive: true, animationDuration: 900 }}
                  />
                  <div className="rp-donut-label">
                    <CountUp
                      value={typeTotal / 1000000}
                      format={(value) => `${value.toFixed(1)} ລ້ານ`}
                      duration={950}
                    />
                  </div>
                </Box>
                <Stack gap={9} style={{ flex: 1, minWidth: 190 }}>
                  {typeTotals.map((item) => {
                    const percent = typeTotal ? (item.value / typeTotal) * 100 : 0;
                    return (
                      <Box key={item.name} className="rp-legend-row" style={{ "--tone": item.color } as CSSProperties}>
                        <Group justify="space-between" gap={8} wrap="nowrap">
                          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                            <span className="rp-dot" />
                            <Text className="rp-legend-name" truncate>
                              {item.name}
                            </Text>
                          </Group>
                          <Group gap={7} wrap="nowrap">
                            <Text className="rp-legend-value tnum">
                              <CountUp value={item.value} format={(value) => money(Math.round(value), currency)} />
                            </Text>
                            <span className="rp-legend-pct">
                              <CountUp value={percent} format={(value) => `${Math.round(value)}%`} />
                            </span>
                          </Group>
                        </Group>
                        <Box className="rp-legend-bar">
                          <span style={{ width: `${percent}%` }} />
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Group>
            ) : (
              <Text size="sm" c="var(--text-muted)" py="lg" ta="center">
                ຍັງບໍ່ມີຂໍ້ມູນ
              </Text>
            )}
          </Box>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Box className="surface rp-card" style={{ height: "100%" }}>
            <Group justify="space-between" align="flex-start" mb={12}>
              <Group gap={10} wrap="nowrap">
                <Box className="rp-ico" style={{ "--tone": "#ef4444" } as CSSProperties}>
                  <IconTrendingUp size={15} />
                </Box>
                <Box>
                  <Text className="rp-title">ຫ້ອງທີ່ມີຍອດຄ້າງສູງສຸດ</Text>
                  <Text className="rp-sub">
                    ປີ {year} · ລວມ <CountUp value={debtTotal} format={(value) => money(Math.round(value), currency)} />
                  </Text>
                </Box>
              </Group>
              <span className="rp-badge" style={{ "--tone": "#ef4444" } as CSSProperties}>
                {debts.length} ຫ້ອງ
              </span>
            </Group>

            {debts.length ? (
              <Stack gap={8}>
                {debts.map((debt, index) => {
                  const tone = DEBT_TONES[index % DEBT_TONES.length];
                  return (
                    <Box key={debt.room} className="rp-debt" style={{ "--tone": tone } as CSSProperties}>
                      <span className="rp-rank">{index + 1}</span>
                      <Box style={{ minWidth: 0, flex: 1 }}>
                        <Group gap={8} wrap="nowrap">
                          <Text className="rp-debt-room">ຫ້ອງ {debt.room}</Text>
                          <span className="rp-debt-count">{num(debt.count)} ໃບ</span>
                        </Group>
                        <Text className="rp-debt-tenant" truncate>
                          {debt.tenant}
                        </Text>
                        <Box className="rp-debt-bar">
                          <span style={{ width: `${Math.max(6, (debt.amount / debtMax) * 100)}%` }} />
                        </Box>
                      </Box>
                      <Text className="rp-debt-amount tnum">
                        <CountUp value={debt.amount} format={(value) => money(Math.round(value), currency)} />
                      </Text>
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Box className="rp-debt-empty">
                <Box className="rp-debt-empty-ico">
                  <IconReceipt2 size={17} />
                </Box>
                <Text fw={600} c="var(--text-strong)" mt={8}>
                  ບໍ່ມີຍອດຄ້າງ
                </Text>
                <Text size="xs" c="var(--text-muted)" mt={3}>
                  ທຸກຫ້ອງຊຳລະຄົບແລ້ວໃນປີ {year}
                </Text>
              </Box>
            )}
          </Box>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
