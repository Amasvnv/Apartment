import { Box, Group, Table, Text } from "@mantine/core";
import { useStore } from "../data/store";
import type { Invoice } from "../data/types";
import {
  ctxOf,
  extraFeesShareFor,
  invoiceRates,
  invoiceRepair,
  invoiceTotal,
  serviceCostFor,
  tenantOfRoom,
  trashCostFor,
  waterCostFor
} from "../lib/compute";
import { money, monthLabel, num } from "../lib/format";

export default function BillPaper({ invoice }: { invoice: Invoice }) {
  const { data } = useStore();
  const ctx = ctxOf(data);
  const currency = data.settings.currency;
  const rates = invoiceRates(ctx, invoice);
  const tenant = tenantOfRoom(data.tenants, invoice.room) || data.tenants.find((item) => item.name === invoice.tenant);

  const rows = [
    { label: "ຄ່າເຊົ່າຫ້ອງ", detail: "", value: Number(invoice.rent) || 0 },
    { label: "ຄ່າໄຟຟ້າ", detail: `${num(invoice.kwh)} kWh × ${money(rates.electricRate, currency)}`, value: (Number(invoice.kwh) || 0) * rates.electricRate },
    { label: "ຄ່ານ້ຳປະປາ", detail: "", value: waterCostFor(ctx, invoice.room, rates) },
    { label: "ຄ່າຂີ້ເຫຍື້ອ", detail: "", value: trashCostFor(ctx, invoice.room, rates) },
    { label: "ຄ່າບໍລິການສ່ວນກາງ", detail: "", value: serviceCostFor(ctx, invoice.room, rates) },
    { label: "ຄ່າສ້ອມແປງ", detail: "", value: invoiceRepair(ctx, invoice) },
    { label: "ຄ່າບໍລິການເພີ່ມເຕີມ", detail: "", value: extraFeesShareFor(ctx, invoice.room, invoice.year, invoice.month) },
    { label: "ຄ່າອື່ນໆ", detail: "", value: Number(invoice.other) || 0 }
  ].filter((row) => row.value > 0);

  const total = invoiceTotal(ctx, invoice);
  const note = (data.settings.monthNotes || {})[`${invoice.year}-${Number(invoice.month)}`] || "";
  const note2 = (data.settings.monthNotes2 || {})[`${invoice.year}-${Number(invoice.month)}`] || "";

  return (
    <Box
      className="bill-paper"
      style={{
        background: "#fff",
        border: "1px solid #DCE8FA",
        borderRadius: 14,
        padding: "22px 24px",
        color: "#0B2545",
        maxWidth: 560,
        margin: "0 auto"
      }}
    >
      <Group justify="space-between" align="flex-start" mb={10}>
        <Box>
          <Text fw={700} size="md" lh={1.25}>
            {data.settings.name}
          </Text>
          <Text size="xs" c="#5A7391" maw={320}>
            {data.settings.address}
          </Text>
        </Box>
        <Box ta="right">
          <Text size="xs" c="#5A7391">
            ໃບບີນເກັບເງິນ
          </Text>
          <Text fw={600} size="sm">
            {invoice.no}
          </Text>
        </Box>
      </Group>

      <Box
        style={{
          borderTop: "1px dashed #C9DCF5",
          borderBottom: "1px dashed #C9DCF5",
          padding: "8px 0",
          marginBottom: 10
        }}
      >
        <Group justify="space-between">
          <Text size="xs">
            ຫ້ອງ <b>{invoice.room}</b>
          </Text>
          <Text size="xs">ປະຈຳ {monthLabel(Number(invoice.month), Number(invoice.year))}</Text>
        </Group>
        <Group justify="space-between" mt={2}>
          <Text size="xs">
            ຜູ້ເຊົ່າ <b>{invoice.tenant || tenant?.name || "—"}</b>
          </Text>
          <Text size="xs">ກຳນົດຊຳລະ {invoice.due || "—"}</Text>
        </Group>
      </Box>

      <Table verticalSpacing={4} horizontalSpacing={0} withRowBorders={false}>
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr key={row.label}>
              <Table.Td pl={0}>
                <Text size="xs">{row.label}</Text>
                {row.detail ? (
                  <Text size="xs" c="#8AA0BB" lh={1.2}>
                    {row.detail}
                  </Text>
                ) : null}
              </Table.Td>
              <Table.Td ta="right" pr={0}>
                <Text size="xs">{money(row.value, currency)}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Group
        justify="space-between"
        mt={10}
        pt={8}
        style={{ borderTop: "1px dashed #C9DCF5" }}
      >
        <Text fw={600} size="sm">
          ລວມທັງໝົດ
        </Text>
        <Text fw={700} size="md" c="#1B6FD6">
          {money(total, currency)}
        </Text>
      </Group>

      <Group justify="space-between" mt={6}>
        <Text size="xs" c="#5A7391">
          ສະຖານະ: {invoice.paid ? "ຊຳລະແລ້ວ" : "ຍັງບໍ່ຊຳລະ"}
        </Text>
        <Text size="xs" c="#5A7391">
          ມິເຕີໄຟ {num(invoice.kwh)} kWh · ນ້ຳ {num(invoice.m3)} m³
        </Text>
      </Group>

      {note || note2 ? (
        <Box mt={10} pt={8} style={{ borderTop: "1px dashed #C9DCF5" }}>
          {note ? (
            <Text size="xs" c="#5A7391">
              {note}
            </Text>
          ) : null}
          {note2 ? (
            <Text size="xs" c="#5A7391">
              {note2}
            </Text>
          ) : null}
        </Box>
      ) : null}

      <Text size="xs" c="#8AA0BB" ta="center" mt={10}>
        ຂອບໃຈທີ່ຊຳລະເງິນຕາມກຳນົດ
      </Text>
    </Box>
  );
}
