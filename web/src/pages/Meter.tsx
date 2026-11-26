import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  Title
} from "@mantine/core";
import { IconBolt, IconDeviceFloppy, IconDroplet, IconInfoCircle } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import MonthSwitcher from "../components/MonthSwitcher";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";
import {
  ctxOf,
  extraFeesShareFor,
  invoiceTotal,
  monthInvoices,
  ratesForMonth,
  repairCostFor,
  serviceCostFor,
  tenantOfRoom,
  trashCostFor,
  waterCostFor
} from "../lib/compute";
import { emptyInvoice, logActivity, upsertInvoice } from "../lib/dataOps";
import { money, monthKey, monthLabel, num } from "../lib/format";

export default function Meter() {
  const { data, update, month } = useStore();
  const { canEdit } = useAuth();
  const ctx = useMemo(() => ctxOf(data), [data]);
  const { year, month: monthNumber } = month;
  const currency = data.settings.currency;

  const rooms = data.rooms;
  const [roomNo, setRoomNo] = useState<string>(rooms[0]?.no || "");
  const room = rooms.find((item) => item.no === roomNo) || rooms[0];
  const tenant = room ? tenantOfRoom(data.tenants, room.no) : null;

  const rates = ratesForMonth(data.settings, year, monthNumber);
  const invoices = monthInvoices(ctx, monthNumber, year);
  const existing = invoices.find((invoice) => invoice.room === room?.no);

  const prevMonthIndex = year * 12 + (monthNumber - 1) - 1;
  const prevYear = Math.floor(prevMonthIndex / 12);
  const prevMonth = (prevMonthIndex % 12) + 1;
  const readings = data.settings.meterReadings?.[room?.no || ""] || {};
  const prevElecReading = Number(readings[monthKey(prevYear, prevMonth)] ?? room?.meterElec ?? 0);
  const prevWaterReading = Number(room?.meterWater ?? 0);

  const [elecReading, setElecReading] = useState<number>(prevElecReading + (existing?.kwh || 0));
  const [waterReading, setWaterReading] = useState<number>(prevWaterReading + (existing?.m3 || 0));
  const [otherFee, setOtherFee] = useState<number>(existing?.other || 0);

  useEffect(() => {
    setElecReading(prevElecReading + (existing?.kwh || 0));
    setWaterReading(prevWaterReading + (existing?.m3 || 0));
    setOtherFee(existing?.other || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomNo, monthNumber, year, existing?.no]);

  const elecUsage = Math.max(0, Number(elecReading || 0) - prevElecReading);
  const waterUsage = Math.max(0, Number(waterReading || 0) - prevWaterReading);

  const rent = Number(tenant?.rent ?? rates.rent) || 0;
  const elecCost = elecUsage * rates.electricRate;
  const waterCost = room ? waterCostFor(ctx, room.no, rates) : 0;
  const trashCost = room ? trashCostFor(ctx, room.no, rates) : 0;
  const serviceCost = room ? serviceCostFor(ctx, room.no, rates) : 0;
  const repairCost = room ? repairCostFor(ctx, room.no, `${year}-${String(monthNumber).padStart(2, "0")}`) : 0;
  const extraShare = room ? extraFeesShareFor(ctx, room.no, year, monthNumber) : 0;
  const total = rent + elecCost + waterCost + trashCost + serviceCost + repairCost + extraShare + Number(otherFee || 0);

  const save = () => {
    if (!room) return;
    update((draft) => {
      const invoice = existing
        ? { ...draft.invoices.find((item) => item.no === existing.no)! }
        : emptyInvoice(year, monthNumber, room.no, tenant);
      invoice.kwh = elecUsage;
      invoice.m3 = waterUsage;
      invoice.rent = rent;
      invoice.service = serviceCost;
      invoice.other = Number(otherFee) || 0;
      invoice.tenant = tenant?.name || invoice.tenant;
      upsertInvoice(draft, invoice);
      if (!draft.settings.meterReadings) draft.settings.meterReadings = {};
      if (!draft.settings.meterReadings[room.no]) draft.settings.meterReadings[room.no] = {};
      draft.settings.meterReadings[room.no][monthKey(year, monthNumber)] = Number(elecReading) || 0;
      const targetRoom = draft.rooms.find((item) => item.no === room.no);
      if (targetRoom) {
        targetRoom.meterElec = Number(elecReading) || 0;
        targetRoom.meterWater = Number(waterReading) || 0;
      }
      logActivity(draft, "meter", "ຈົດມິເຕີ", `ຫ້ອງ ${room.no} · ${monthLabel(monthNumber, year)} · ${num(elecUsage)} kWh`);
    });
  };

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ຈົດມິເຕີ ແລະ ຄິດໄລ່ຄ່າບໍລິການ"
        subtitle="ບັນທຶກເລກມິເຕີ ແລ້ວລະບົບຄິດໄລ່ໃບບີນໃຫ້ອັດຕະໂນມັດ"
        actions={<MonthSwitcher />}
      />

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card padding="lg">
            <Stack gap="md">
              <Group grow align="flex-end">
                <Select
                  label="ຫ້ອງ"
                  data={rooms.map((item) => ({ value: item.no, label: `ຫ້ອງ ${item.no}${item.tenant ? " · " + item.tenant : ""}` }))}
                  value={room?.no || null}
                  onChange={(value) => setRoomNo(value || "")}
                  searchable
                  allowDeselect={false}
                />
                <Stack gap={2}>
                  <Text size="xs" c="#5A7391">
                    ຜູ້ເຊົ່າ
                  </Text>
                  <Text size="sm" fw={500}>
                    {tenant?.name || "ຫ້ອງວ່າງ"}
                  </Text>
                  <Text size="xs" c="#8AA0BB">
                    {tenant ? `${tenant.phone} · ${tenant.people} ຄົນ` : "ບໍ່ມີຜູ້ເຊົ່າ"}
                  </Text>
                </Stack>
              </Group>

              <Divider />

              <Grid gutter="md">
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Card withBorder radius="md" padding="md" bg="#F7FAFF">
                    <Group gap={6} mb={6}>
                      <IconBolt size={15} color="#E8A33D" />
                      <Text size="sm" fw={600}>
                        ມິເຕີໄຟຟ້າ
                      </Text>
                    </Group>
                    <Text size="xs" c="#7C93B0">
                      ເລກເກົ່າ {num(prevElecReading)}
                    </Text>
                    <NumberInput
                      mt={6}
                      label="ເລກໃໝ່"
                      value={elecReading}
                      onChange={(value) => setElecReading(Number(value) || 0)}
                      min={0}
                      thousandSeparator=","
                      disabled={!canEdit("meter")}
                    />
                    <Text size="xs" c="#1B6FD6" fw={600} mt={6}>
                      ໃຊ້ {num(elecUsage)} kWh
                    </Text>
                  </Card>
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Card withBorder radius="md" padding="md" bg="#F7FAFF">
                    <Group gap={6} mb={6}>
                      <IconDroplet size={15} color="#0EA5C6" />
                      <Text size="sm" fw={600}>
                        ມິເຕີນ້ຳປະປາ
                      </Text>
                    </Group>
                    <Text size="xs" c="#7C93B0">
                      ເລກເກົ່າ {num(prevWaterReading)}
                    </Text>
                    <NumberInput
                      mt={6}
                      label="ເລກໃໝ່"
                      value={waterReading}
                      onChange={(value) => setWaterReading(Number(value) || 0)}
                      min={0}
                      thousandSeparator=","
                      disabled={!canEdit("meter")}
                    />
                    <Text size="xs" c="#1B6FD6" fw={600} mt={6}>
                      ໃຊ້ {num(waterUsage)} m³
                    </Text>
                  </Card>
                </Grid.Col>
              </Grid>

              <NumberInput
                label="ຄ່າອື່ນໆ (₭)"
                description="ຄ່າບໍລິການເພີ່ມເຕີມທີ່ບໍ່ຢູ່ໃນອັດຕາຫຼັກ"
                value={otherFee}
                onChange={(value) => setOtherFee(Number(value) || 0)}
                min={0}
                thousandSeparator=","
                disabled={!canEdit("meter")}
              />

              <Group justify="space-between">
                <Alert variant="light" color="brand" icon={<IconInfoCircle size={16} />} p="xs">
                  <Text size="xs">
                    ຄ່ານ້ຳ / ຂີ້ເຫຍື້ອ / ບໍລິການ ຄິດຕາມຈຳນວນຫ້ອງ ແລະ ຄົນຢູ່ປະຈຳ
                  </Text>
                </Alert>
                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={save} disabled={!canEdit("meter") || !room}>
                  ບັນທຶກ
                </Button>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Card padding="lg" h="100%">
            <Group justify="space-between" mb="sm">
              <Title order={3}>ສະຫຼຸບໃບບີນ</Title>
              <Badge variant="light" color={existing?.paid ? "green" : "gray"}>
                {existing ? (existing.paid ? "ຊຳລະແລ້ວ" : "ຍັງບໍ່ຊຳລະ") : "ຍັງບໍ່ມີໃບບີນ"}
              </Badge>
            </Group>
            <Text size="xs" c="#7C93B0" mb="sm">
              ຫ້ອງ {room?.no} · {monthLabel(monthNumber, year)}
            </Text>
            <Table verticalSpacing={6} withRowBorders={false}>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>ຄ່າເຊົ່າ</Table.Td>
                  <Table.Td ta="right">{money(rent, currency)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>ຄ່າໄຟຟ້າ ({num(elecUsage)} kWh)</Table.Td>
                  <Table.Td ta="right">{money(elecCost, currency)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>ຄ່ານ້ຳປະປາ</Table.Td>
                  <Table.Td ta="right">{money(waterCost, currency)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>ຄ່າຂີ້ເຫຍື້ອ</Table.Td>
                  <Table.Td ta="right">{money(trashCost, currency)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>ຄ່າບໍລິການສ່ວນກາງ</Table.Td>
                  <Table.Td ta="right">{money(serviceCost, currency)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>ຄ່າສ້ອມແປງ</Table.Td>
                  <Table.Td ta="right">{money(repairCost, currency)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>ຄ່າບໍລິການເພີ່ມເຕີມ</Table.Td>
                  <Table.Td ta="right">{money(extraShare, currency)}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>ຄ່າອື່ນໆ</Table.Td>
                  <Table.Td ta="right">{money(Number(otherFee) || 0, currency)}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
            <Divider my="sm" />
            <Group justify="space-between">
              <Text fw={600}>ລວມທັງໝົດ</Text>
              <Text fw={700} size="lg" c="#1B6FD6">
                {money(total, currency)}
              </Text>
            </Group>
            {existing ? (
              <Text size="xs" c="#7C93B0" mt="xs">
                ໃບບີນທີ່ບັນທຶກໄວ້: {money(invoiceTotal(ctx, existing), currency)}
              </Text>
            ) : null}
          </Card>
        </Grid.Col>
      </Grid>

      <Card padding="lg">
        <Group justify="space-between" mb="sm">
          <Text fw={600}>ສະຖານະການຈົດມິເຕີ · {monthLabel(monthNumber, year)}</Text>
          <Text size="xs" c="#7C93B0">
            {invoices.length}/{data.rooms.length} ຫ້ອງ
          </Text>
        </Group>
        <Table.ScrollContainer minWidth={640}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ຫ້ອງ</Table.Th>
                <Table.Th>ຜູ້ເຊົ່າ</Table.Th>
                <Table.Th ta="right">ໄຟຟ້າ (kWh)</Table.Th>
                <Table.Th ta="right">ນ້ຳ (m³)</Table.Th>
                <Table.Th ta="right">ລວມ</Table.Th>
                <Table.Th>ສະຖານະ</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.rooms.map((item) => {
                const invoice = invoices.find((entry) => entry.room === item.no);
                return (
                  <Table.Tr key={item.no}>
                    <Table.Td>{item.no}</Table.Td>
                    <Table.Td>{item.tenant || "—"}</Table.Td>
                    <Table.Td ta="right">{invoice ? num(invoice.kwh) : "—"}</Table.Td>
                    <Table.Td ta="right">{invoice ? num(invoice.m3) : "—"}</Table.Td>
                    <Table.Td ta="right">{invoice ? money(invoiceTotal(ctx, invoice), currency) : "—"}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={invoice ? (invoice.paid ? "green" : "amber") : "gray"}>
                        {invoice ? (invoice.paid ? "ຊຳລະແລ້ວ" : "ລໍຖ້າຊຳລະ") : "ຍັງບໍ່ຈົດ"}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}
