import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  Tooltip
} from "@mantine/core";
import { IconFilePlus, IconPrinter, IconReceipt2, IconTrash, IconWallet } from "@tabler/icons-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MonthSwitcher from "../components/MonthSwitcher";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";
import type { Invoice, Tenant } from "../data/types";
import { ctxOf, invoiceStats, invoiceTotal, monthInvoices } from "../lib/compute";
import { emptyInvoice, logActivity, removeInvoice, upsertInvoice } from "../lib/dataOps";
import { money, monthLabel, num } from "../lib/format";

export default function Invoices() {
  const { data, update, month } = useStore();
  const { canEdit, canDelete } = useAuth();
  const navigate = useNavigate();
  const ctx = useMemo(() => ctxOf(data), [data]);
  const currency = data.settings.currency;
  const { year, month: monthNumber } = month;

  const list = [...monthInvoices(ctx, monthNumber, year)].sort((a, b) => a.room.localeCompare(b.room, "lo", { numeric: true }));
  const stats = invoiceStats(ctx, list);
  const missing = data.rooms.filter((room) => room.status === "occupied" && !list.some((invoice) => invoice.room === room.no));

  const togglePaid = (invoice: Invoice) => {
    update((draft) => {
      const target = draft.invoices.find((item) => item.no === invoice.no);
      if (target) target.paid = !target.paid;
      logActivity(draft, "invoices", invoice.paid ? "ຍົກເລີກການຊຳລະ" : "ບັນທຶກການຊຳລະ", `${invoice.no} · ຫ້ອງ ${invoice.room}`);
    });
  };

  const remove = (invoice: Invoice) => {
    if (!window.confirm(`ລຶບໃບບີນ ${invoice.no} ອອກ?`)) return;
    update((draft) => {
      removeInvoice(draft, invoice.no);
      logActivity(draft, "invoices", "ລຶບໃບບີນ", invoice.no);
    });
  };

  const generate = () => {
    if (!missing.length) return;
    update((draft) => {
      missing.forEach((room) => {
        const tenant = draft.tenants.find((item): item is Tenant => String(item.room) === String(room.no)) || null;
        upsertInvoice(draft, emptyInvoice(year, monthNumber, room.no, tenant));
      });
      logActivity(draft, "invoices", "ສ້າງໃບບີນ", `${missing.length} ຫ້ອງ · ${monthLabel(monthNumber, year)}`);
    });
  };

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ໃບບີນເກັບເງິນ"
        subtitle={`ໃບບີນປະຈຳເດືອນ ${monthLabel(monthNumber, year)}`}
        actions={<MonthSwitcher />}
      />

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <StatCard label="ລວມທັງໝົດ" value={money(stats.total, currency)} note={`${list.length} ໃບ`} icon={<IconReceipt2 size={15} />} />
        <StatCard label="ເກັບໄດ້ແລ້ວ" value={money(stats.paid, currency)} note={`${stats.paidCount} ໃບ`} icon={<IconWallet size={15} />} tone="green" />
        <StatCard label="ຍັງຄ້າງ" value={money(stats.unpaid, currency)} note={`${stats.unpaidCount} ໃບ`} icon={<IconReceipt2 size={15} />} tone="red" />
        <StatCard label="ອັດຕາເກັບເງິນໄດ້" value={`${stats.rate}%`} note={`${num(stats.kwh)} kWh · ${num(stats.m3)} m³`} icon={<IconWallet size={15} />} tone="cyan" progress={stats.rate} />
      </SimpleGrid>

      <Card padding="lg">
        <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
          <Group gap="sm">
            <Text fw={600} c="#0B2545">
              ລາຍການໃບບີນ
            </Text>
            {missing.length ? (
              <Badge color="amber" variant="light">
                ຍັງຂາດ {missing.length} ຫ້ອງ
              </Badge>
            ) : null}
          </Group>
          {canEdit("invoices") && missing.length ? (
            <Button variant="light" leftSection={<IconFilePlus size={16} />} onClick={generate}>
              ສ້າງໃບບີນທີ່ຂາດ
            </Button>
          ) : null}
        </Group>

        <Table.ScrollContainer minWidth={980}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ເລກທີ</Table.Th>
                <Table.Th>ຫ້ອງ</Table.Th>
                <Table.Th>ຜູ້ເຊົ່າ</Table.Th>
                <Table.Th ta="right">ໄຟຟ້າ</Table.Th>
                <Table.Th ta="right">ນ້ຳ</Table.Th>
                <Table.Th ta="right">ລວມ</Table.Th>
                <Table.Th ta="center">ຊຳລະ</Table.Th>
                <Table.Th ta="right">ຈັດການ</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {list.map((invoice) => (
                <Table.Tr key={invoice.no}>
                  <Table.Td>
                    <Text size="xs" c="#5A7391">
                      {invoice.no}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color="brand">
                      {invoice.room}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{invoice.tenant || "—"}</Table.Td>
                  <Table.Td ta="right">{num(invoice.kwh)}</Table.Td>
                  <Table.Td ta="right">{num(invoice.m3)}</Table.Td>
                  <Table.Td ta="right">
                    <Text fw={600}>{money(invoiceTotal(ctx, invoice), currency)}</Text>
                  </Table.Td>
                  <Table.Td ta="center">
                    <Switch
                      checked={invoice.paid}
                      onChange={() => togglePaid(invoice)}
                      disabled={!canEdit("invoices")}
                      color="green"
                      size="sm"
                      aria-label="ສະຖານະຊຳລະ"
                    />
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end">
                      <Tooltip label="ພິມໃບບີນ">
                        <ActionIcon variant="subtle" color="brand" onClick={() => navigate(`/invoices/${invoice.no}/print`)}>
                          <IconPrinter size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="ລຶບ">
                        <ActionIcon variant="subtle" color="red" disabled={!canDelete("invoices")} onClick={() => remove(invoice)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {!list.length ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text size="sm" c="#7C93B0" ta="center" py="md">
                      ຍັງບໍ່ມີໃບບີນໃນເດືອນນີ້
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}
