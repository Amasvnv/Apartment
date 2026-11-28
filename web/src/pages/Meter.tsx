import { ActionIcon, Badge, Box, Button, Card, Grid, Group, Loader, NumberInput, Select, Stack, Text, Tooltip } from "@mantine/core";
import {
  IconAlertTriangle,
  IconBolt,
  IconBuilding,
  IconCircleCheck,
  IconClipboardList,
  IconDeviceFloppy,
  IconDots,
  IconDroplet,
  IconEdit,
  IconFileInvoice,
  IconGauge,
  IconHome,
  IconInfoCircle,
  IconReceipt2,
  IconSum,
  IconTools,
  IconTrash,
  IconUsers
} from "@tabler/icons-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import MonthSwitcher from "../components/MonthSwitcher";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";
import {
  ctxOf,
  extraFeesShareFor,
  extraFeesFor,
  invoiceTotal,
  monthInvoices,
  ratesForMonth,
  repairCostFor,
  repairItemsFor,
  residentPeople,
  residentRoomCount,
  serviceCostFor,
  sortRoomsByNo,
  tenantOfRoom,
  tenantPeople,
  trashCostFor,
  waterCostFor
} from "../lib/compute";
import { emptyInvoice, logActivity, upsertInvoice } from "../lib/dataOps";
import { invoiceNoLabel, money, monthKey, monthLabel, num } from "../lib/format";
import { notifyStatus } from "../lib/notify";

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("") || "ຜ";

export default function Meter() {
  const { data, commit, month } = useStore();
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const ctx = useMemo(() => ctxOf(data), [data]);
  const { year, month: monthNumber } = month;
  const currency = data.settings.currency;

  const rooms = useMemo(() => sortRoomsByNo(data.rooms), [data.rooms]);
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

  const rent = Number(rates.rent) || 0;
  const elecCost = elecUsage * rates.electricRate;
  const waterCost = room ? waterCostFor(ctx, room.no, rates) : 0;
  const trashCost = room ? trashCostFor(ctx, room.no, rates) : 0;
  const serviceCost = room ? serviceCostFor(ctx, room.no, rates) : 0;
  const repairCost = room ? repairCostFor(ctx, room.no, `${year}-${String(monthNumber).padStart(2, "0")}`) : 0;
  const extraShare = room ? extraFeesShareFor(ctx, room.no, year, monthNumber) : 0;
  const total = rent + elecCost + waterCost + trashCost + serviceCost + repairCost + extraShare + Number(otherFee || 0);

  const recordedCount = rooms.filter((item) => invoices.some((invoice) => invoice.room === item.no)).length;
  const recordedPct = rooms.length ? Math.round((recordedCount / rooms.length) * 100) : 0;

  const people = residentPeople(data.tenants);
  const occupiedRooms = residentRoomCount(data.tenants);
  const repairItems = room
    ? repairItemsFor(ctx, room.no, `${year}-${String(monthNumber).padStart(2, "0")}`)
    : [];
  const extraItems = extraFeesFor(data.settings, year, monthNumber).filter((fee) => fee.active);
  const extraTotal = extraItems.reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0);

  const away = !!tenant && (tenant.stayStatus || "resident") === "away";
  const pendingText = away ? "ຜູ້ເຊົ່າອອກໄປ · ບໍ່ຄິດຄ່າ" : "";

  const summary: { label: string; note: string; detail: string; value: number; color: string; icon: ReactNode }[] = [
    {
      label: "ຄ່າເຊົ່າ",
      note: "ອັດຕາເດືອນ",
      detail: `ອັດຕາຈາກການຕັ້ງຄ່າ · ຫ້ອງ ${room?.no || "—"} · ${monthLabel(monthNumber, year)}`,
      value: rent,
      color: "#1663c4",
      icon: <IconHome size={15} />
    },
    {
      label: "ຄ່າໄຟຟ້າ",
      note: `${num(elecUsage)} kWh`,
      detail: `${money(rates.electricRate, currency)}/kWh × ${num(elecUsage)} kWh = ${money(elecCost, currency)}`,
      value: elecCost,
      color: "#d98620",
      icon: <IconBolt size={15} />
    },
    {
      label: "ຄ່ານ້ຳປະປາ",
      note: "ແບ່ງຕາມຄົນ",
      detail:
        pendingText ||
        `${money(rates.waterTotal, currency)} ÷ ${num(people)} ຄົນ × ${num(tenant ? tenantPeople(tenant) : 0)} ຄົນ = ${money(waterCost, currency)}`,
      value: waterCost,
      color: "#1a8fbf",
      icon: <IconDroplet size={15} />
    },
    {
      label: "ຄ່າຂີ້ເຫຍື້ອ",
      note: "ແບ່ງຕາມຫ້ອງ",
      detail:
        pendingText ||
        `${money(rates.trashTotal, currency)} ÷ ${num(occupiedRooms)} ຫ້ອງ = ${money(trashCost, currency)}`,
      value: trashCost,
      color: "#0f9b6c",
      icon: <IconTrash size={15} />
    },
    {
      label: "ຄ່າສ້ອມແປງ",
      note: repairItems.length ? `${num(repairItems.length)} ລາຍການ` : "",
      // ສະແດງຍອດຂອງແຕ່ລະລາຍການນຳ ເພື່ອໃຫ້ຮູ້ຊັດວ່າຍອດມາຈາກລາຍການໃດ (ລາຍການທີ່ລຶບແລ້ວຈະບໍ່ມີຍອດຢູ່ນີ້)
      detail: repairItems.length
        ? repairItems
            .map((item) => {
              const title = item.title || "ສ້ອມແປງ";
              const cost = Number(item.cost) || 0;
              return cost ? `${title} · ${money(cost, currency)}` : title;
            })
            .join(" · ")
        : "ບໍ່ມີລາຍການໃນເດືອນນີ້",
      value: repairCost,
      color: "#7c5cd6",
      icon: <IconTools size={15} />
    },
    {
      label: "ຄ່າບໍລິການສ່ວນກາງ",
      note: "ແບ່ງຕາມຫ້ອງ",
      detail:
        pendingText ||
        `${money(rates.serviceFee, currency)} ÷ ${num(occupiedRooms)} ຫ້ອງ = ${money(serviceCost, currency)}`,
      value: serviceCost,
      color: "#4a6fa8",
      icon: <IconBuilding size={15} />
    },
    {
      label: "ຄ່າບໍລິການເພີ່ມເຕີມ",
      note: extraItems.length ? `${num(extraItems.length)} ລາຍການ` : "",
      detail:
        pendingText ||
        (extraItems.length
          ? `${money(extraTotal, currency)} ÷ ${num(occupiedRooms)} ຫ້ອງ = ${money(extraShare, currency)}`
          : "ບໍ່ມີຄ່າບໍລິການເພີ່ມເຕີມ"),
      value: extraShare,
      color: "#0f9b8e",
      icon: <IconReceipt2 size={15} />
    },
    {
      label: "ຄ່າອື່ນໆ",
      note: "",
      detail: Number(otherFee) > 0 ? "ລະບຸເອງຕາມທີ່ຈົດໄວ້" : "ບໍ່ມີຄ່າໃຊ້ຈ່າຍເພີ່ມ",
      value: Number(otherFee) || 0,
      color: "#6b7f99",
      icon: <IconDots size={15} />
    }
  ];

  const [saveState, setSaveState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [saveAt, setSaveAt] = useState("");

  // ປ່ຽນຫ້ອງ ຫຼື ເດືອນ → ລຶບສະຖານະເກົ່າ
  useEffect(() => {
    setSaveState("idle");
  }, [roomNo, monthNumber, year]);

  // ສະແດງສະຖານະຫຼັງບັນທຶກໄວ້ສັກຄູ່ ແລ້ວຫາຍໄປ
  useEffect(() => {
    if (saveState !== "done" && saveState !== "error") return;
    const id = window.setTimeout(() => setSaveState("idle"), 4500);
    return () => window.clearTimeout(id);
  }, [saveState, saveAt]);

  const save = async () => {
    if (!room) return;
    // ມີຂໍ້ມູນຂອງຫ້ອງນີ້ໃນເດືອນນີ້ແລ້ວ → ບໍ່ໃຫ້ບັນທຶກຊ້ຳ
    if (existing) {
      notifyStatus(
        "info",
        "ບັນທຶກບໍ່ໄດ້ · ມີຂໍ້ມູນແລ້ວ",
        `ຫ້ອງ ${room.no} · ${monthLabel(monthNumber, year)} ມີໃບບິນ ${invoiceNoLabel(existing.no)} ແລ້ວ`
      );
      return;
    }
    setSaveState("busy");
    const ok = await commit((draft) => {
      // ຮອດນີ້ existing ຕ້ອງບໍ່ມີແລ້ວ → ສ້າງໃບບິນໃໝ່ສະເໝີ
      const invoice = emptyInvoice(year, monthNumber, room.no, tenant);
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
    setSaveState(ok ? "done" : "error");
    setSaveAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    notifyStatus(
      ok ? "success" : "danger",
      ok ? "ບັນທຶກມິເຕີສຳເລັດ" : "ບັນທຶກບໍ່ສຳເລັດ",
      `ຫ້ອງ ${room.no} · ${num(elecUsage)} kWh · ${num(waterUsage)} m³`
    );
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
          <Card className="mtr-panel" padding={0} h="100%">
            <div className="mtr-head">
              <span className="mtr-head-ico">
                <IconGauge size={18} />
              </span>
              <div className="mtr-head-copy">
                <span className="mtr-eyebrow">ຈົດມິເຕີ · {monthLabel(monthNumber, year)}</span>
                <Text className="mtr-head-title">ບັນທຶກເລກມິເຕີ</Text>
              </div>
            </div>

            <div className="mtr-body">
              <div className="mtr-room">
                <Select
                  label="ເລືອກຫ້ອງ"
                  leftSection={<IconHome size={15} />}
                  data={rooms.map((item) => ({ value: item.no, label: `ຫ້ອງ ${item.no}${item.tenant ? " · " + item.tenant : ""}` }))}
                  value={room?.no || null}
                  onChange={(value) => setRoomNo(value || "")}
                  searchable
                  allowDeselect={false}
                />
                <div className={`mtr-tenant${tenant ? "" : " is-empty"}`}>
                  <span className="mtr-ava">{tenant ? initials(tenant.name) : "ຫ"}</span>
                  <div className="mtr-tenant-copy">
                    <span className="mtr-tenant-label">ຜູ້ເຊົ່າ</span>
                    <span className="mtr-tenant-name">{tenant?.name || "ຫ້ອງວ່າງ"}</span>
                    <span className="mtr-tenant-meta">
                      {tenant ? `${tenant.phone || "—"} · ${tenant.people} ຄົນ` : "ບໍ່ມີຜູ້ເຊົ່າ"}
                    </span>
                  </div>
                  <span className="mtr-rent tnum">
                    <span className="mtr-rent-label">ຄ່າເຊົ່າ</span>
                    {money(rent, currency)}
                  </span>
                </div>
              </div>

              <div className="mtr-meters">
                <div className="mtr-meter is-elec">
                  <div className="mtr-meter-head">
                    <span className="mtr-meter-ico">
                      <IconBolt size={16} />
                    </span>
                    <div className="mtr-meter-copy">
                      <span className="mtr-meter-title">ມິເຕີໄຟຟ້າ</span>
                      <span className="mtr-meter-prev">ເລກເກົ່າ {num(prevElecReading)}</span>
                    </div>
                    <span className="mtr-usage">
                      {num(elecUsage)} <small>kWh</small>
                    </span>
                  </div>
                  <NumberInput
                    label="ເລກໃໝ່"
                    value={elecReading}
                    onChange={(value) => setElecReading(Number(value) || 0)}
                    min={0}
                    thousandSeparator=","
                    disabled={!canEdit("meter")}
                  />
                  <div className="mtr-meter-foot">
                    <span className="mtr-meter-cost tnum">{money(elecCost, currency)}</span>
                    <span className="mtr-meter-hint">ອັດຕາ {num(rates.electricRate)} ₭/kWh</span>
                  </div>
                </div>

                <div className="mtr-meter is-water">
                  <div className="mtr-meter-head">
                    <span className="mtr-meter-ico">
                      <IconDroplet size={16} />
                    </span>
                    <div className="mtr-meter-copy">
                      <span className="mtr-meter-title">ມິເຕີນ້ຳປະປາ</span>
                      <span className="mtr-meter-prev">ເລກເກົ່າ {num(prevWaterReading)}</span>
                    </div>
                    <span className="mtr-usage">
                      {num(waterUsage)} <small>m³</small>
                    </span>
                  </div>
                  <NumberInput
                    label="ເລກໃໝ່"
                    value={waterReading}
                    onChange={(value) => setWaterReading(Number(value) || 0)}
                    min={0}
                    thousandSeparator=","
                    disabled={!canEdit("meter")}
                  />
                  <div className="mtr-meter-foot">
                    <span className="mtr-meter-cost tnum">{money(waterCost, currency)}</span>
                    <span className="mtr-meter-hint">ແບ່ງຕາມຈຳນວນຄົນ</span>
                  </div>
                </div>
              </div>

              <NumberInput
                label="ຄ່າອື່ນໆ (₭)"
                description="ຄ່າບໍລິການເພີ່ມເຕີມທີ່ບໍ່ຢູ່ໃນອັດຕາຫຼັກ"
                value={otherFee}
                onChange={(value) => setOtherFee(Number(value) || 0)}
                min={0}
                thousandSeparator=","
                disabled={!canEdit("meter")}
              />
            </div>

            <div className="mtr-foot">
              <span className={`mtr-foot-note${existing ? " is-locked" : ""}`}>
                {existing ? <IconAlertTriangle size={17} /> : <IconInfoCircle size={17} />}
                {existing
                  ? `ຫ້ອງ ${room?.no} ມີຂໍ້ມູນຂອງ ${monthLabel(monthNumber, year)} ແລ້ວ — ບໍ່ສາມາດບັນທຶກຊ້ຳໄດ້`
                  : "ຄ່ານ້ຳ / ຂີ້ເຫຍື້ອ / ບໍລິການ ຄິດຕາມຈຳນວນຫ້ອງ ແລະ ຄົນຢູ່ປະຈຳ"}
              </span>
              <Group className="mtr-save-wrap" gap={10} wrap="nowrap">
                {saveState !== "idle" ? (
                  <span className="mtr-save-status" data-state={saveState} role="status">
                    {saveState === "busy" ? (
                      <Loader size={13} color="currentColor" />
                    ) : saveState === "done" ? (
                      <IconCircleCheck size={15} />
                    ) : (
                      <IconAlertTriangle size={15} />
                    )}
                    <span className="mtr-save-text">
                      {saveState === "busy"
                        ? "ກຳລັງບັນທຶກ…"
                        : saveState === "done"
                          ? `ບັນທຶກສຳເລັດ · ${saveAt}`
                          : "ບັນທຶກບໍ່ສຳເລັດ"}
                    </span>
                    <i className="mtr-save-bar" />
                  </span>
                ) : null}
                <Button
                  className="btn-grad"
                  leftSection={<IconDeviceFloppy size={16} />}
                  onClick={save}
                  loading={saveState === "busy"}
                  disabled={!canEdit("meter") || !room || !!existing}
                >
                  ບັນທຶກ
                </Button>
              </Group>
            </div>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Card className="mtr-panel mtr-summary" padding={0} h="100%">
            <div className="mtr-head">
              <span className="mtr-head-ico is-soft">
                <IconFileInvoice size={18} />
              </span>
              <div className="mtr-head-copy">
                <span className="mtr-eyebrow">
                  ຫ້ອງ {room?.no} · {monthLabel(monthNumber, year)}
                </span>
                <Text className="mtr-head-title">ສະຫຼຸບໃບບິນ</Text>
              </div>
              <span className={`mtr-pill ${existing ? (existing.paid ? "is-paid" : "is-unpaid") : "is-none"}`}>
                <span className="mtr-led" />
                {existing ? (existing.paid ? "ຊຳລະແລ້ວ" : "ຍັງບໍ່ຊຳລະ") : "ຍັງບໍ່ມີໃບບິນ"}
              </span>
            </div>

            <div className="mtr-sum-list">
              {summary.map((line) => (
                <div className="mtr-sum-row" key={line.label} data-tone={line.value ? "on" : "off"}>
                  <span
                    className="mtr-sum-ico"
                    style={{
                      color: line.color,
                      background: `color-mix(in srgb, ${line.color} 12%, transparent)`
                    }}
                  >
                    {line.icon}
                  </span>
                  <span className="mtr-sum-copy">
                    <span className="mtr-sum-label">
                      {line.label}
                      {line.note ? <small>{line.note}</small> : null}
                    </span>
                    <span className="mtr-sum-detail tnum">{line.detail}</span>
                  </span>
                  <span className={`mtr-sum-value tnum${line.value ? "" : " is-zero"}`}>{money(line.value, currency)}</span>
                </div>
              ))}
            </div>

            <div className="mtr-total">
              <span className="mtr-total-label">
                <span className="mtr-total-ico">
                  <IconSum size={14} />
                </span>
                ລວມທັງໝົດ
              </span>
              <span className="mtr-total-value tnum">{money(total, currency)}</span>
            </div>

            <div className="mtr-sum-foot">
              {existing ? (
                <Text size="xs" c="var(--text-muted)">
                  ໃບບິນທີ່ບັນທຶກໄວ້: {money(invoiceTotal(ctx, existing), currency)}
                </Text>
              ) : (
                <Text size="xs" c="var(--text-muted)">
                  ຍັງບໍ່ໄດ້ບັນທຶກໃບບິນຂອງເດືອນນີ້
                </Text>
              )}
            </div>
          </Card>
        </Grid.Col>
      </Grid>

      <Card className="mtr-panel" padding={0}>
        <div className="mtr-head">
          <span className="mtr-head-ico is-soft">
            <IconClipboardList size={18} />
          </span>
          <div className="mtr-head-copy">
            <span className="mtr-eyebrow">{monthLabel(monthNumber, year)}</span>
            <Text className="mtr-head-title">ສະຖານະການຈົດມິເຕີ</Text>
          </div>
          <div className="mtr-progress">
            <span className="mtr-progress-text tnum">
              {recordedCount}/{rooms.length} ຫ້ອງ
            </span>
            <span className="mtr-progress-bar">
              <i style={{ width: `${recordedPct}%` }} />
            </span>
          </div>
        </div>

        <div className="mtr-list mtr-cards">
          {rooms.map((item) => {
            const invoice = invoices.find((entry) => entry.room === item.no);
            const tenantRow = tenantOfRoom(data.tenants, item.no);
            const active = item.no === room?.no;
            return (
              <Box
                key={item.no}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                className={`rep-row lift inv-row mtr-card${active ? " is-active" : ""}${
                  invoice ? (invoice.paid ? " is-paid" : " is-unpaid") : " is-none"
                }`}
                onClick={() => setRoomNo(item.no)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setRoomNo(item.no);
                  }
                }}
              >
                <Box
                  className="rep-ico"
                  style={{ color: invoice ? (invoice.paid ? "#12a06a" : "#c98a1f") : "var(--brand)" }}
                >
                  {invoice ? <IconFileInvoice size={18} /> : <IconGauge size={18} />}
                </Box>

                <Box className="rep-main">
                  <Group gap={8} wrap="nowrap" className="rep-title-row">
                    <Text className={`rep-title${item.tenant ? "" : " is-empty"}`} fw={600}>
                      {item.tenant || "ຫ້ອງວ່າງ"}
                    </Text>
                  </Group>
                  <Text size="xs" c="var(--text-muted)" mt={2} className="mtr-card-meta">
                    <span style={{ color: invoice ? "var(--brand)" : "var(--text-muted)", fontWeight: 600 }}>
                      {invoice ? invoiceNoLabel(invoice.no) : "ຍັງບໍ່ມີໃບບີນ"}
                    </span>
                    {" · "}
                    <IconBolt size={11} style={{ verticalAlign: "-1px" }} /> {invoice ? `${num(invoice.kwh)} kWh` : "—"}
                    {" · "}
                    <IconDroplet size={11} style={{ verticalAlign: "-1px" }} /> {invoice ? `${num(invoice.m3)} m³` : "—"}
                    {" · "}
                    <IconUsers size={11} style={{ verticalAlign: "-1px" }} /> {tenantRow?.people ?? 0} ຄົນ
                  </Text>
                </Box>

                <Group className="rep-meta" gap={8}>
                  <span className="rep-chip">ຫ້ອງ {item.no}</span>
                  <Badge
                    variant="light"
                    radius="xl"
                    size="sm"
                    color={invoice ? (invoice.paid ? "green" : "red") : "gray"}
                  >
                    {invoice ? (invoice.paid ? "ຊຳລະແລ້ວ" : "ລໍຖ້າຊຳລະ") : "ຍັງບໍ່ຈົດ"}
                  </Badge>
                  <Text className={`rep-cost tnum${invoice ? "" : " is-empty"}`}>
                    {invoice ? money(invoiceTotal(ctx, invoice), currency) : "—"}
                  </Text>
                  <Group gap={2} wrap="nowrap" className="rep-actions">
                    <Tooltip label="ເປີດໃບບີນ">
                      <ActionIcon
                        variant="subtle"
                        color="brand"
                        radius="xl"
                        disabled={!invoice}
                        aria-label="ເປີດໃບບີນ"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (invoice) navigate(`/invoices/${invoice.no}/print`);
                        }}
                      >
                        <IconFileInvoice size={16} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={active ? "ກຳລັງຈົດຫ້ອງນີ້" : "ເລືອກຫ້ອງນີ້"}>
                      <ActionIcon
                        variant={active ? "light" : "subtle"}
                        color="brand"
                        radius="xl"
                        aria-label="ເລືອກຫ້ອງ"
                        onClick={(event) => {
                          event.stopPropagation();
                          setRoomNo(item.no);
                        }}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Box>
            );
          })}
        </div>
      </Card>
    </Stack>
  );
}
