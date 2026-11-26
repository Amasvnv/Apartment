import {
  Box,
  Card,
  Divider,
  Grid,
  Group,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title
} from "@mantine/core";
import { DonutChart, LineChart, Sparkline } from "@mantine/charts";
import {
  IconBolt,
  IconClock,
  IconDoorEnter,
  IconDroplet,
  IconReceipt,
  IconReceipt2,
  IconTool,
  IconTrendingDown,
  IconTrendingUp,
  IconTrash,
  IconWallet
} from "@tabler/icons-react";
import { useMemo, type ReactNode } from "react";
import MonthSwitcher from "../components/MonthSwitcher";
import StatCard from "../components/StatCard";
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

const SEGMENT_COLORS = ["#1B6FD6", "#FFB454", "#4FC9FF", "#8E9FB5", "#A78BFA", "#34D399", "#F472B6"];

function CostTile({ label, value, note, icon, color }: { label: string; value: string; note: string; icon: ReactNode; color: string }) {
  return (
    <Card padding="md" radius="lg" style={{ borderLeft: `3px solid ${color}` }}>
      <Group gap={8} mb={6} wrap="nowrap">
        <ThemeIcon size={24} radius="md" variant="light" style={{ background: `${color}1A`, color }}>
          {icon}
        </ThemeIcon>
        <Text size="xs" c="#5A7391" fw={500} lineClamp={1}>
          {label}
        </Text>
      </Group>
      <Text fw={700} size="md" c="#0B2545" lh={1.25}>
        {value}
      </Text>
      <Text size="xs" c="#8AA0BB" mt={2} lineClamp={1}>
        {note}
      </Text>
    </Card>
  );
}

export default function Overview() {
  const { data, month, setMonth } = useStore();
  const ctx = useMemo(() => ctxOf(data), [data]);
  const currency = data.settings.currency;

  const { year, month: monthNumber } = month;
  const list = monthInvoices(ctx, monthNumber, year);
  const stats = invoiceStats(ctx, list);
  const rates = ratesForMonth(data.settings, year, monthNumber);

  const yearList = yearInvoices(ctx, year);
  const yearStats = invoiceStats(ctx, yearList);
  const prevStats = invoiceStats(ctx, yearInvoices(ctx, year - 1));
  const change = prevStats.total ? ((yearStats.total - prevStats.total) / prevStats.total) * 100 : 0;

  const occupied = data.rooms.filter((room) => room.status === "occupied").length;
  const totalRooms = data.rooms.length;
  const occupancyRate = totalRooms ? Math.round((occupied / totalRooms) * 100) : 0;
  const pending = pendingRooms(ctx, monthNumber, year).length;
  const extraTotal = list.reduce((sum, inv) => sum + extraFeesShareFor(ctx, inv.room, inv.year, inv.month), 0);

  let rentSum = 0;
  let elecSum = 0;
  let waterSum = 0;
  let trashSum = 0;
  let repairSum = 0;
  list.forEach((inv) => {
    const invRates = invoiceRates(ctx, inv);
    rentSum += Number(inv.rent) || 0;
    elecSum += (Number(inv.kwh) || 0) * invRates.electricRate;
    waterSum += waterCostFor(ctx, inv.room, invRates);
    trashSum += trashCostFor(ctx, inv.room, invRates);
    repairSum += invoiceRepair(ctx, inv);
  });

  const yt = yearTotals(ctx, year);
  const monthlyAverage = yt.months ? yt.kwh / yt.months : 0;
  const spendTotal = yt.elecCost + yt.waterCost + yt.trash;

  const revenueRows = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const monthNo = index + 1;
        const invoices = monthInvoices(ctx, monthNo, year);
        if (!invoices.length) return null;
        const total = invoices.reduce((sum, inv) => sum + invoiceTotal(ctx, inv), 0);
        return { label: MONTH_SHORT[index], total: Math.round((total / 1000000) * 100) / 100 };
      }).filter((row): row is { label: string; total: number } => row !== null),
    [ctx, year]
  );

  const segments = useMemo(() => {
    let rent = 0;
    let elec = 0;
    let water = 0;
    let trash = 0;
    let repair = 0;
    let service = 0;
    let extra = 0;
    yearList.forEach((inv) => {
      const invRates = invoiceRates(ctx, inv);
      rent += Number(inv.rent) || 0;
      elec += (Number(inv.kwh) || 0) * invRates.electricRate;
      water += waterCostFor(ctx, inv.room, invRates);
      trash += trashCostFor(ctx, inv.room, invRates);
      repair += invoiceRepair(ctx, inv);
      service += Number(inv.service) || 0;
      extra += (Number(inv.other) || 0) + extraFeesShareFor(ctx, inv.room, inv.year, inv.month);
    });
    return [
      { name: "ຄ່າເຊົ່າ", value: rent, color: SEGMENT_COLORS[0] },
      { name: "ຄ່າໄຟຟ້າ", value: elec, color: SEGMENT_COLORS[1] },
      { name: "ຄ່ານ້ຳປະປາ", value: water, color: SEGMENT_COLORS[2] },
      { name: "ຄ່າຂີ້ເຫຍື້ອ", value: trash, color: SEGMENT_COLORS[3] },
      { name: "ສ້ອມແປງ", value: repair, color: SEGMENT_COLORS[4] },
      { name: "ຄ່າບໍລິການ", value: service, color: SEGMENT_COLORS[5] },
      { name: "ຄ່າເພີ່ມເຕີມ", value: extra, color: SEGMENT_COLORS[6] }
    ].filter((segment) => segment.value > 0);
  }, [ctx, yearList]);

  const donutTotal = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <Stack gap="lg" pb="xl">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
        <Box>
          <Title order={1}>ສະບາຍດີ, ຜູ້ຈັດການ</Title>
          <Text size="sm" c="#5A7391" mt={4}>
            ພາບລວມລາຍຮັບ ແລະ ການໃຊ້ຈ່າຍ · {monthLabel(monthNumber, year)}
          </Text>
        </Box>
        <MonthSwitcher />
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="sm">
        <CostTile label="ຄ່າເຊົ່າ" value={money(rentSum, currency)} note={`${list.length} ຫ້ອງ`} icon={<IconDoorEnter size={14} />} color="#1B6FD6" />
        <CostTile
          label="ຄ່າໄຟຟ້າ"
          value={money(elecSum, currency)}
          note={`${num(stats.kwh)} kWh × ${money(rates.electricRate, currency)}`}
          icon={<IconBolt size={14} />}
          color="#E8A33D"
        />
        <CostTile
          label="ຄ່ານ້ຳປະປາ"
          value={money(waterSum, currency)}
          note={`${money(rates.waterTotal, currency)} ÷ ${residentPeople(ctx.tenants)} ຄົນ`}
          icon={<IconDroplet size={14} />}
          color="#0EA5C6"
        />
        <CostTile
          label="ຄ່າຂີ້ເຫຍື້ອ"
          value={money(trashSum, currency)}
          note={`${money(rates.trashTotal, currency)} ÷ ${residentRoomCount(ctx.tenants)} ຫ້ອງ`}
          icon={<IconTrash size={14} />}
          color="#8E9FB5"
        />
        <CostTile
          label="ຄ່າສ້ອມແປງ"
          value={money(repairSum, currency)}
          note="ລວມຄ່າຊ່ອມຕາມຫ້ອງ"
          icon={<IconTool size={14} />}
          color="#E5484D"
        />
        <CostTile
          label="ລວມທັງໝົດ"
          value={money(stats.total, currency)}
          note={`ຊຳລະ ${stats.paidCount} · ຄ້າງ ${stats.unpaidCount} ໃບ`}
          icon={<IconReceipt size={14} />}
          color="#12A06A"
        />
      </SimpleGrid>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Card
            padding="xl"
            radius="lg"
            style={{
              height: "100%",
              border: "none",
              background: "linear-gradient(135deg, #1B6FD6 0%, #155CB4 58%, #1E4F9C 100%)",
              color: "#fff",
              boxShadow: "0 18px 40px -22px rgba(21,92,180,0.65)"
            }}
          >
            <Group justify="space-between" align="flex-start">
              <Box>
                <Text size="xs" style={{ color: "rgba(255,255,255,0.78)", letterSpacing: "0.04em" }}>
                  ລາຍຮັບລວມ · ປີ {year}
                </Text>
                <Text fw={700} mt={8} style={{ fontSize: 30, lineHeight: 1.2 }}>
                  {money(yearStats.total, currency)}
                </Text>
              </Box>
              {prevStats.total ? (
                <Group
                  gap={4}
                  px={9}
                  py={5}
                  style={{
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.16)",
                    fontSize: 12,
                    fontWeight: 600
                  }}
                >
                  {change >= 0 ? <IconTrendingUp size={13} /> : <IconTrendingDown size={13} />}
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(1)}%
                </Group>
              ) : null}
            </Group>

            <SimpleGrid cols={2} spacing="sm" mt="lg">
              <Box p="10px 12px" style={{ background: "rgba(255,255,255,0.14)", borderRadius: 12 }}>
                <Text size="xs" style={{ color: "rgba(255,255,255,0.76)" }}>
                  ເກັບໄດ້ແລ້ວ
                </Text>
                <Text fw={600} mt={2}>
                  {money(yearStats.paid, currency)}
                </Text>
              </Box>
              <Box p="10px 12px" style={{ background: "rgba(255,255,255,0.14)", borderRadius: 12 }}>
                <Text size="xs" style={{ color: "rgba(255,255,255,0.76)" }}>
                  ຍັງຄ້າງຊຳລະ
                </Text>
                <Text fw={600} mt={2}>
                  {money(yearStats.unpaid, currency)}
                </Text>
              </Box>
            </SimpleGrid>

            <Box mt="lg">
              <Group justify="space-between" mb={6}>
                <Text size="xs" style={{ color: "rgba(255,255,255,0.78)" }}>
                  ອັດຕາເກັບເງິນໄດ້
                </Text>
                <Text size="xs" fw={600}>
                  {yearStats.rate}%
                </Text>
              </Group>
              <Progress
                value={yearStats.rate}
                size="md"
                radius="xl"
                styles={{ root: { background: "rgba(255,255,255,0.22)" }, section: { background: "#9CD0FF" } }}
              />
            </Box>

            <Divider my="md" color="rgba(255,255,255,0.2)" />
            <Group justify="space-between">
              <Text size="xs" style={{ color: "rgba(255,255,255,0.78)" }}>
                {prevStats.total ? `ທຽບກັບປີ ${year - 1}` : "ບໍ່ມີຂໍ້ມູນປຽບທຽບ"}
              </Text>
              <Text size="xs" style={{ color: "rgba(255,255,255,0.78)" }}>
                {yearList.length} ໃບ · {yt.months} ເດືອນ
              </Text>
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 7 }}>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" h="100%">
            <StatCard
              label="ຫ້ອງທີ່ມີຜູ້ເຊົ່າ"
              value={`${occupied}/${totalRooms}`}
              note={`ອັດຕາການເຊົ່າ ${occupancyRate}%`}
              icon={<IconDoorEnter size={15} />}
              progress={occupancyRate}
            />
            <StatCard
              label="ຄ່າບໍລິການເພີ່ມເຕີມ"
              value={money(extraTotal, currency)}
              note={`ຄ່າອື່ນໆ ÷ ${residentRoomCount(ctx.tenants)} ຫ້ອງ · ${monthLabel(monthNumber, year)}`}
              icon={<IconWallet size={15} />}
              tone="violet"
            />
            <StatCard
              label="ລໍຖ້າຈົດມິເຕີ"
              value={pending}
              note={`ຫ້ອງທີ່ຍັງບໍ່ມີໃບບີນ · ${monthLabel(monthNumber, year)}`}
              icon={<IconClock size={15} />}
              tone="amber"
            />
            <StatCard
              label="ໃບບີນເກັບເງິນຄ້າງ"
              value={stats.unpaidCount}
              note={stats.unpaid ? money(stats.unpaid, currency) : "ບໍ່ມີຍອດຄ້າງ"}
              icon={<IconReceipt2 size={15} />}
              tone="red"
            />
          </SimpleGrid>
        </Grid.Col>
      </Grid>

      <Box>
        <Group justify="space-between" mb={10}>
          <Text fw={600} c="#0B2545">
            ການໃຊ້ຈ່າຍ 1 ປີ · {year}
          </Text>
          <Text size="xs" c="#7C93B0">
            {yt.months} ເດືອນທີ່ມີໃບບີນ
          </Text>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <Card padding="md">
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="#5A7391" fw={500}>
                ການໃຊ້ໄຟຟ້າ
              </Text>
              <ThemeIcon size={24} radius="md" variant="light" color="amber">
                <IconBolt size={14} />
              </ThemeIcon>
            </Group>
            <Text fw={700} c="#0B2545">
              {num(yt.kwh)} <Text component="span" size="xs" c="#7C93B0">kWh</Text>
            </Text>
            <Text size="xs" c="#8AA0BB" mb={6}>
              ສະເລ່ຍ {num(Math.round(monthlyAverage))} kWh/ເດືອນ
            </Text>
            <Sparkline data={yt.kwhBy} h={46} color="#E8A33D" fillOpacity={0.16} strokeWidth={2} curveType="monotone" />
          </Card>
          <Card padding="md">
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="#5A7391" fw={500}>
                ຄ່ານ້ຳປະປາ
              </Text>
              <ThemeIcon size={24} radius="md" variant="light" color="cyan">
                <IconDroplet size={14} />
              </ThemeIcon>
            </Group>
            <Text fw={700} c="#0B2545">
              {money(yt.waterCost, currency)}
            </Text>
            <Text size="xs" c="#8AA0BB" mb={6}>
              ສະເລ່ຍ {money(yt.months ? yt.waterCost / yt.months : 0, currency)}/ເດືອນ
            </Text>
            <Sparkline data={yt.waterBy} h={46} color="#0EA5C6" fillOpacity={0.16} strokeWidth={2} curveType="monotone" />
          </Card>
          <Card padding="md">
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="#5A7391" fw={500}>
                ຄ່າຂີ້ເຫຍື້ອ
              </Text>
              <ThemeIcon size={24} radius="md" variant="light" color="gray">
                <IconTrash size={14} />
              </ThemeIcon>
            </Group>
            <Text fw={700} c="#0B2545">
              {money(yt.trash, currency)}
            </Text>
            <Text size="xs" c="#8AA0BB" mb={6}>
              ສະເລ່ຍ {money(yt.months ? yt.trash / yt.months : 0, currency)}/ເດືອນ
            </Text>
            <Sparkline data={yt.trashBy} h={46} color="#8E9FB5" fillOpacity={0.16} strokeWidth={2} curveType="monotone" />
          </Card>
          <Card padding="md">
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="#5A7391" fw={500}>
                ລວມຄ່າໃຊ້ຈ່າຍ
              </Text>
              <ThemeIcon size={24} radius="md" variant="light" color="brand">
                <IconWallet size={14} />
              </ThemeIcon>
            </Group>
            <Text fw={700} c="#0B2545">
              {money(spendTotal, currency)}
            </Text>
            <Text size="xs" c="#8AA0BB">
              ໄຟຟ້າ {money(yt.elecCost, currency)} · ນ້ຳ {money(yt.waterCost, currency)}
            </Text>
          </Card>
        </SimpleGrid>
      </Box>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card padding="lg" h="100%">
            <Group justify="space-between" mb="md">
              <Box>
                <Text fw={600} c="#0B2545">
                  ລາຍຮັບ 1 ປີ · {year}
                </Text>
                <Text size="xs" c="#7C93B0" mt={2}>
                  ລວມຄ່າເຊົ່າ, ຄ່າໄຟຟ້າ, ຄ່ານ້ຳ ແລະ ຄ່າບໍລິການ
                </Text>
              </Box>
            </Group>
            {revenueRows.length ? (
              <LineChart
                h={280}
                data={revenueRows}
                dataKey="label"
                series={[{ name: "total", label: "ລາຍຮັບ (ລ້ານກີບ)", color: "#1B6FD6" }]}
                curveType="monotone"
                withDots
                dotProps={{ r: 3, strokeWidth: 1 }}
                gridAxis="y"
                valueFormatter={(value) => `${Number(value).toFixed(2)} ລ້ານ`}
              />
            ) : (
              <Text size="sm" c="#7C93B0" py="xl" ta="center">
                ຍັງບໍ່ມີຂໍ້ມູນໃບບີນໃນປີນີ້
              </Text>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Card padding="lg" h="100%">
            <Box mb="sm">
              <Text fw={600} c="#0B2545">
                ໂຄງສ້າງລາຍຮັບ
              </Text>
              <Text size="xs" c="#7C93B0" mt={2}>
                ແຍກຕາມປະເພດ ລວມທັງປີ {year}
              </Text>
            </Box>
            {segments.length ? (
              <Group align="center" gap="lg" wrap="nowrap">
                <DonutChart
                  data={segments}
                  size={170}
                  thickness={26}
                  withTooltip
                  tooltipDataSource="segment"
                  chartLabel={money(donutTotal, currency)}
                  pieProps={{ paddingAngle: 1 }}
                />
                <Stack gap={7} style={{ flex: 1, minWidth: 0 }}>
                  {segments.map((segment) => {
                    const percent = donutTotal ? Math.round((segment.value / donutTotal) * 100) : 0;
                    return (
                      <Box key={segment.name}>
                        <Group justify="space-between" gap={8} wrap="nowrap">
                          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                            <Box style={{ width: 8, height: 8, borderRadius: 99, background: segment.color, flexShrink: 0 }} />
                            <Text size="xs" c="#2C4262" truncate>
                              {segment.name}
                            </Text>
                          </Group>
                          <Text size="xs" c="#7C93B0" style={{ flexShrink: 0 }}>
                            {percent}%
                          </Text>
                        </Group>
                        <Progress value={percent} size={3} radius="xl" color={segment.color} mt={3} />
                      </Box>
                    );
                  })}
                </Stack>
              </Group>
            ) : (
              <Text size="sm" c="#7C93B0" py="xl" ta="center">
                ຍັງບໍ່ມີຂໍ້ມູນລາຍຮັບ
              </Text>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      {!list.length ? (
        <Card padding="lg">
          <Text size="sm" c="#7C93B0" ta="center">
            ຍັງບໍ່ມີຂໍ້ມູນຄ່າໃຊ້ຈ່າຍໃນເດືອນນີ້ — ເລືອກເດືອນອື່ນ ຫຼື ຈົດມິເຕີກ່ອນ
            <Text
              component="button"
              type="button"
              size="sm"
              c="#1B6FD6"
              fw={500}
              ml={6}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
              onClick={() => {
                const latest = yearList[0];
                if (latest) setMonth({ year: latest.year, month: latest.month });
              }}
            >
              ໄປເດືອນທີ່ມີຂໍ້ມູນ
            </Text>
          </Text>
        </Card>
      ) : null}
    </Stack>
  );
}
