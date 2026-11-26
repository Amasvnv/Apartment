import { Card, Grid, Group, SimpleGrid, Stack, Table, Text } from "@mantine/core";
import { BarChart, DonutChart } from "@mantine/charts";
import { useMemo } from "react";
import MonthSwitcher from "../components/MonthSwitcher";
import PageHeader from "../components/PageHeader";
import { useStore } from "../data/store";
import {
  ctxOf,
  extraFeesShareFor,
  invoiceRates,
  invoiceStats,
  invoiceTotal,
  monthInvoices,
  serviceCostFor,
  trashCostFor,
  waterCostFor,
  yearInvoices
} from "../lib/compute";
import { MONTH_SHORT, money, monthLabel, num } from "../lib/format";

export default function Reports() {
  const { data, month } = useStore();
  const ctx = useMemo(() => ctxOf(data), [data]);
  const currency = data.settings.currency;
  const { year, month: monthNumber } = month;

  const months = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const monthIndexValue = year * 12 + (monthNumber - 1) - (5 - index);
      return { year: Math.floor(monthIndexValue / 12), month: (monthIndexValue % 12) + 1 };
    });
  }, [year, monthNumber]);

  const usageRows = months.map((entry) => {
    const stats = invoiceStats(ctx, monthInvoices(ctx, entry.month, entry.year));
    return {
      label: MONTH_SHORT[entry.month - 1],
      kwh: stats.kwh,
      m3: stats.m3,
      total: Math.round(stats.total / 1000000)
    };
  });

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

  const currentStats = invoiceStats(ctx, monthInvoices(ctx, monthNumber, year));

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader title="ສະຖິຕິການໃຊ້ມິເຕີ ແລະ ລາຍຮັບ" subtitle={`6 ເດືອນຫຼ້າສຸດ ຮອດ ${monthLabel(monthNumber, year)}`} actions={<MonthSwitcher />} />

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <Card padding="md">
          <Text size="xs" c="#5A7391">
            ລາຍຮັບເດືອນນີ້
          </Text>
          <Text fw={700} size="lg">
            {money(currentStats.total, currency)}
          </Text>
        </Card>
        <Card padding="md">
          <Text size="xs" c="#5A7391">
            ເກັບໄດ້
          </Text>
          <Text fw={700} size="lg" c="#12A06A">
            {money(currentStats.paid, currency)}
          </Text>
        </Card>
        <Card padding="md">
          <Text size="xs" c="#5A7391">
            ຍັງຄ້າງ
          </Text>
          <Text fw={700} size="lg" c="#E5484D">
            {money(currentStats.unpaid, currency)}
          </Text>
        </Card>
        <Card padding="md">
          <Text size="xs" c="#5A7391">
            ອັດຕາເກັບເງິນໄດ້
          </Text>
          <Text fw={700} size="lg" c="#1B6FD6">
            {currentStats.rate}%
          </Text>
        </Card>
      </SimpleGrid>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Card padding="lg" h="100%">
            <Text fw={600} mb="sm">
              ການໃຊ້ໄຟຟ້າ 6 ເດືອນ (kWh)
            </Text>
            <BarChart h={220} data={usageRows} dataKey="label" series={[{ name: "kwh", label: "kWh", color: "#E8A33D" }]} barProps={{ radius: 4 }} />
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 6 }}>
          <Card padding="lg" h="100%">
            <Text fw={600} mb="sm">
              ການໃຊ້ນ້ຳປະປາ 6 ເດືອນ (m³)
            </Text>
            <BarChart h={220} data={usageRows} dataKey="label" series={[{ name: "m3", label: "m³", color: "#0EA5C6" }]} barProps={{ radius: 4 }} />
          </Card>
        </Grid.Col>
      </Grid>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Card padding="lg" h="100%">
            <Text fw={600} mb="sm">
              ລາຍຮັບແຍກຕາມປະເພດ · ປີ {year}
            </Text>
            {typeTotals.length ? (
              <Group align="center" gap="lg" wrap="wrap">
                <DonutChart data={typeTotals} size={170} thickness={26} withTooltip tooltipDataSource="segment" />
                <Stack gap={6} style={{ flex: 1, minWidth: 180 }}>
                  {typeTotals.map((item) => {
                    const total = typeTotals.reduce((sum, seg) => sum + seg.value, 0);
                    return (
                      <Group key={item.name} justify="space-between" gap="xs">
                        <Group gap={6}>
                          <span style={{ width: 8, height: 8, borderRadius: 99, background: item.color }} />
                          <Text size="xs">{item.name}</Text>
                        </Group>
                        <Text size="xs" c="#5A7391">
                          {money(item.value, currency)} · {total ? Math.round((item.value / total) * 100) : 0}%
                        </Text>
                      </Group>
                    );
                  })}
                </Stack>
              </Group>
            ) : (
              <Text size="sm" c="#7C93B0" py="lg" ta="center">
                ຍັງບໍ່ມີຂໍ້ມູນ
              </Text>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card padding="lg" h="100%">
            <Group justify="space-between" mb="sm">
              <Text fw={600}>ຫ້ອງທີ່ມີຍອດຄ້າງສູງສຸດ · ປີ {year}</Text>
              <Text size="xs" c="#7C93B0">
                {debts.length} ຫ້ອງ
              </Text>
            </Group>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ຫ້ອງ</Table.Th>
                  <Table.Th>ຜູ້ເຊົ່າ</Table.Th>
                  <Table.Th ta="center">ໃບຄ້າງ</Table.Th>
                  <Table.Th ta="right">ຍອດຄ້າງ</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {debts.map((debt) => (
                  <Table.Tr key={debt.room}>
                    <Table.Td>{debt.room}</Table.Td>
                    <Table.Td>{debt.tenant}</Table.Td>
                    <Table.Td ta="center">{num(debt.count)}</Table.Td>
                    <Table.Td ta="right">{money(debt.amount, currency)}</Table.Td>
                  </Table.Tr>
                ))}
                {!debts.length ? (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Text size="sm" c="#7C93B0" ta="center" py="md">
                        ບໍ່ມີຍອດຄ້າງ
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : null}
              </Table.Tbody>
            </Table>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
