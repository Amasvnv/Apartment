import { Box, Group, Table, Text } from "@mantine/core";
import logoUrl from "../assets/souvannahvong-logo-cut.webp";
import qrUrl from "../assets/lao-qr.webp";
import BillCheckQr from "./BillCheckQr";
import BillNote from "./BillNote";
import { useStore } from "../data/store";
import type { Invoice } from "../data/types";
import { arrearsDetail, arrearsItems } from "../lib/arrears";
import {
  ctxOf,
  extraFeesShareFor,
  invoiceMonthKey,
  invoiceRates,
  invoiceRepair,
  invoiceTotal,
  repairItemsFor,
  residentPeople,
  residentRoomCount,
  serviceCostFor,
  tenantOfRoom,
  tenantPeople,
  trashCostFor,
  waterCostFor
} from "../lib/compute";
import { invoiceNoLabel, money, monthLabel, num, shortMonth } from "../lib/format";

const today = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
};

export default function ReceiptPaper({ invoice, copy }: { invoice: Invoice; copy: string }) {
  const { data } = useStore();
  const ctx = ctxOf(data);
  const currency = data.settings.currency;
  const rates = invoiceRates(ctx, invoice);
  const tenant = tenantOfRoom(data.tenants, invoice.room) || data.tenants.find((item) => item.name === invoice.tenant);
  const people = residentPeople(data.tenants);
  const rooms = residentRoomCount(data.tenants);
  const roomPeople = tenant ? tenantPeople(tenant) : 0;
  const away = !!tenant && (tenant.stayStatus || "resident") === "away";
  const perUnit = (value: number, unit: string) => `${money(value, currency)} / ${unit}`;

  // ລາຍລະອຽດຄ່າສ້ອມແປງ: ຊື່ລາຍການທີ່ແຈ້ງໃນເດືອນນີ້ ຂອງຫ້ອງນີ້
  const repairs = repairItemsFor(ctx, invoice.room, invoiceMonthKey(invoice));
  const repairDetail = repairs.length
    ? `${repairs.length > 1 ? `${repairs.length} ລາຍການ: ` : ""}${repairs.map((item) => item.title).join(" · ")}`
    : "ຕາມລາຍການທີ່ແຈ້ງ";

  // ຍອດຄ້າງຂອງເດືອນກ່ອນຂອງຫ້ອງນີ້ — ດຶງມາບວກໃນໃບຮັບເງິນ
  const carriedItems = arrearsItems(ctx, invoice);
  const carried = carriedItems.reduce((sum, item) => sum + item.amount, 0);

  const rows = [
    ...(carried > 0
      ? [{ label: "ຍອດຄ້າງເດືອນກ່ອນ", detail: arrearsDetail(carriedItems), value: carried }]
      : []),
    { label: "ຄ່າເຊົ່າຫ້ອງ", detail: perUnit(Number(invoice.rent) || 0, "ເດືອນ"), value: Number(invoice.rent) || 0 },
    {
      label: "ຄ່າໄຟຟ້າ",
      detail: `${num(invoice.kwh)} kWh × ${money(rates.electricRate, currency)}`,
      value: (Number(invoice.kwh) || 0) * rates.electricRate
    },
    {
      label: "ຄ່ານ້ຳປະປາ",
      detail: roomPeople
        ? `${money(rates.waterTotal, currency)} ÷ ${people} ຄົນ × ${roomPeople} ຄົນ`
        : `${money(rates.waterTotal, currency)} ÷ ${people} ຄົນ`,
      value: waterCostFor(ctx, invoice.room, rates)
    },
    {
      label: "ຄ່າຂີ້ເຫຍື້ອ",
      detail: `${money(rates.trashTotal, currency)} ÷ ${rooms} ຫ້ອງ`,
      value: trashCostFor(ctx, invoice.room, rates)
    },
    {
      label: "ຄ່າບໍລິການສ່ວນກາງ",
      detail: `${money(rates.serviceFee, currency)} ÷ ${rooms} ຫ້ອງ`,
      value: serviceCostFor(ctx, invoice.room, rates)
    },
    { label: "ຄ່າສ້ອມແປງ", detail: repairDetail, value: invoiceRepair(ctx, invoice) },
    {
      label: "ຄ່າບໍລິການເພີ່ມເຕີມ",
      detail: `ຫານຕາມ ${rooms} ຫ້ອງ`,
      value: extraFeesShareFor(ctx, invoice.room, invoice.year, invoice.month)
    },
    { label: "ຄ່າອື່ນໆ", detail: "", value: Number(invoice.other) || 0 }
  ].filter((row) => row.value > 0);

  const ownTotal = invoiceTotal(ctx, invoice);
  const total = ownTotal + carried;
  const paid = invoice.paid ? ownTotal : 0;
  const balance = total - paid;

  const dueText = String(invoice.due || "").trim() || `10 ${shortMonth(Number(invoice.month), Number(invoice.year))}`;

  const noteKey = `${invoice.year}-${Number(invoice.month)}`;
  const note1 = (data.settings.monthNotes || {})[noteKey] || "";
  const note2 = (data.settings.monthNotes2 || {})[noteKey] || "";

  return (
    <Box className="rcp-paper receipt-paper">
      <Box className="rcp-head">
        <Group className="rcp-brand-row" gap={14} wrap="nowrap" align="center">
          <img src={logoUrl} alt={data.settings.name} className="rcp-logo" />
          <Box style={{ minWidth: 0 }}>
            <Text className="rcp-brand">{data.settings.name}</Text>
            <Text className="rcp-addr">{data.settings.address}</Text>
          </Box>
        </Group>
        <Box className="rcp-tag">
          <Text className="rcp-tag-main">ໃບບິນຮັບເງິນ</Text>
          <Text className="rcp-tag-sub">RECEIPT · {copy}</Text>
        </Box>
      </Box>

      <Box className="rcp-meta">
        <Box className="rcp-meta-cell">
          <span>ເລກທີ</span>
          <b>{invoiceNoLabel(invoice.no).replace(/^INV-/, "RCP-")}</b>
        </Box>
        <Box className="rcp-meta-cell">
          <span>ວັນທີ</span>
          <b>{today()}</b>
        </Box>
        <Box className="rcp-meta-cell">
          <span>ຫ້ອງ</span>
          <b>{invoice.room}</b>
        </Box>
        <Box className="rcp-meta-cell">
          <span>ປະຈຳເດືອນ</span>
          <b>{monthLabel(Number(invoice.month), Number(invoice.year))}</b>
        </Box>
      </Box>

      <Box className="rcp-rates">
        <Box className="rcp-rate">
          <Text className="rcp-rate-label">ຄ່າເຊົ່າ / ເດືອນ</Text>
          <Text className="rcp-rate-value tnum">{money(rates.rent, currency)}</Text>
        </Box>
        <Box className="rcp-rate">
          <Text className="rcp-rate-label">ຄ່າໄຟຟ້າ / kWh</Text>
          <Text className="rcp-rate-value tnum">{money(rates.electricRate, currency)}</Text>
        </Box>
        <Box className="rcp-rate">
          <Text className="rcp-rate-label">ຄ່ານ້ຳລວມ / ເດືອນ</Text>
          <Text className="rcp-rate-value tnum">{money(rates.waterTotal, currency)}</Text>
        </Box>
        <Box className="rcp-rate">
          <Text className="rcp-rate-label">ຄ່າຂີ້ເຫຍື້ອ / ເດືອນ</Text>
          <Text className="rcp-rate-value tnum">{money(rates.trashTotal, currency)}</Text>
        </Box>
        <Box className="rcp-rate">
          <Text className="rcp-rate-label">ຄ່າບໍລິການ / ເດືອນ</Text>
          <Text className="rcp-rate-value tnum">{money(rates.serviceFee, currency)}</Text>
        </Box>
      </Box>

      <Box className="rcp-body">
        <Box className="rcp-left">
          <Box className="rcp-payee">
            <Text className="rcp-payee-label">ຮັບເງິນຈາກ</Text>
            <Text className="rcp-payee-name">{invoice.tenant || tenant?.name || "—"}</Text>
            <Text className="rcp-payee-sub">
              ຫ້ອງ {invoice.room} · {roomPeople ? `${roomPeople} ຄົນ · ` : ""}ມິເຕີໄຟ {num(invoice.kwh)} kWh · ນ້ຳ {num(invoice.m3)} m³
            </Text>
            {away ? (
              <Text className="rcp-payee-note">
                ໄປເຮັດວຽກຕ່າງແຂວງ · ບໍ່ຄິດຄ່ານ້ຳປະປາ, ຄ່າຂີ້ເຫຍື້ອ ແລະ ຄ່າບໍລິການ
              </Text>
            ) : null}
          </Box>

          <Table className="rcp-table" verticalSpacing={5} horizontalSpacing={0} withRowBorders={false}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th pl={0}>ລາຍການ ແລະ ລາຄາຕໍ່ໜ່ວຍ</Table.Th>
                <Table.Th ta="right" pr={0}>
                  ຈຳນວນເງິນ
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row) => (
                <Table.Tr key={row.label}>
                  <Table.Td pl={0}>
                    <Text component="span" className="rcp-item">
                      {row.label}
                    </Text>
                    {row.detail ? (
                      <Text component="span" className="rcp-item-detail">
                        {" · "}
                        {row.detail}
                      </Text>
                    ) : null}
                  </Table.Td>
                  <Table.Td ta="right" pr={0}>
                    <Text className="rcp-item tnum">{money(row.value, currency)}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <BillCheckQr room={invoice.room} />
        </Box>

        <Box className="rcp-sum">
          <Group justify="space-between" align="baseline" gap={8}>
            <Text className="rcp-sum-label">ລວມທັງໝົດ</Text>
            <Text className="rcp-sum-total tnum">{money(total, currency)}</Text>
          </Group>
          <Box className="rcp-sum-paid">
            <Text className="rcp-sum-label">ຮັບເງິນແລ້ວ</Text>
            <Text className="rcp-sum-paid-value tnum">{money(paid, currency)}</Text>
          </Box>
          <Group justify="space-between" align="baseline" gap={8}>
            <Text className="rcp-sum-label">ຍອດຄ້າງຊຳລະ</Text>
            <Text className={`rcp-sum-balance tnum${balance > 0 ? " is-due" : ""}`}>{money(balance, currency)}</Text>
          </Group>
          <Text className={`rcp-status${balance <= 0 ? " is-paid" : " is-due"}`}>
            {balance <= 0 ? "ຊຳລະແລ້ວ" : invoice.paid ? "ຍັງມີຍອດຄ້າງເດືອນກ່ອນ" : "ຍັງບໍ່ຊຳລະ"}
          </Text>

          {balance > 0 ? (
            <Box className="rcp-qr">
              <img src={qrUrl} alt="QR ຊຳລະເງິນ" />
              <Box style={{ minWidth: 0 }}>
                <Text className="rcp-qr-title">ສະແກນຊຳລະຍອດຄ້າງ (Lao QR)</Text>
                <Text className="rcp-qr-text">
                  ເປີດແອັບ BCEL One ຫຼື ແອັບທະນາຄານທີ່ຮອງຮັບ Lao QR ແລ້ວສະແກນ ຫຼື ໂອນເຂົ້າບັນຊີຕາມຍອດຂ້າງເທິງ.
                </Text>
              </Box>
            </Box>
          ) : null}

          <Text className="rcp-status-note">
            ກຳນົດຊຳລະ {dueText} · ອອກໃບບິນ {today()}
          </Text>
        </Box>
      </Box>

      <BillNote note1={note1} note2={note2} />

      <Box className="rcp-sign">
        <Box className="rcp-sign-cell">
          <Box className="rcp-sign-line" />
          <Text className="rcp-sign-label">ລາຍເຊັນຜູ້ຮັບເງິນ</Text>
        </Box>
        <Box className="rcp-sign-date">
          <Text className="rcp-sign-label">ວັນທີ {today()}</Text>
        </Box>
        <Box className="rcp-sign-cell">
          <Box className="rcp-sign-line" />
          <Text className="rcp-sign-label">ລາຍເຊັນຜູ້ຊຳລະ</Text>
        </Box>
      </Box>

      <Text className="rcp-thanks">
        {balance <= 0 ? "ຂອບໃຈທີ່ຊຳລະເງິນ · ເອກະສານອອກໂດຍລະບົບ" : "ເອກະສານສະແດງຍອດຄ້າງ · ຍັງບໍ່ມີຜົນຮັບເງິນ"}
      </Text>
    </Box>
  );
}
