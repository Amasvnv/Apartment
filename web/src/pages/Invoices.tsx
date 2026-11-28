import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip
} from "@mantine/core";
import {
  IconBolt,
  IconChartBar,
  IconCircleCheck,
  IconClock,
  IconDroplet,
  IconFileInvoice,
  IconFilePlus,
  IconInbox,
  IconPlaneTilt,
  IconPrinter,
  IconReceipt,
  IconReceipt2,
  IconSearch,
  IconTrash
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import paymentIcon from "../assets/payment-icon.webp";
import CardArt from "../components/ui/CardArt";
import ConfirmDialog, { type ConfirmState } from "../components/ui/ConfirmDialog";
import MonthSwitcher from "../components/MonthSwitcher";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";
import type { Invoice, Tenant } from "../data/types";
import { ctxOf, invoiceStats, invoiceTotal, monthInvoices } from "../lib/compute";
import { arrearsDetail, arrearsItems } from "../lib/arrears";
import { emptyInvoice, logActivity, removeInvoice, upsertInvoice } from "../lib/dataOps";
import { invoiceNoLabel, money, monthLabel, num } from "../lib/format";
import { notifyStatus } from "../lib/notify";

const GRADIENTS = {
  blue:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.3), transparent 62%), linear-gradient(142deg, #1663c4 0%, #2f83e8 55%, #63a9ff 100%)",
  amber:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.3), transparent 62%), linear-gradient(142deg, #cf7524 0%, #e8a33d 52%, #f7c469 100%)",
  green:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.3), transparent 62%), linear-gradient(142deg, #0e7c5a 0%, #12a06a 52%, #43cf9b 100%)",
  navy:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.26), transparent 62%), linear-gradient(142deg, #123a63 0%, #245c98 55%, #3a86c9 100%)"
} as const;

export default function Invoices() {
  const { data, commit, month } = useStore();
  const { canEdit, canDelete } = useAuth();
  const navigate = useNavigate();
  const ctx = useMemo(() => ctxOf(data), [data]);
  const currency = data.settings.currency;
  const { year, month: monthNumber } = month;
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Invoice | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>("idle");
  const [confirmError, setConfirmError] = useState("");

  const list = [...monthInvoices(ctx, monthNumber, year)].sort((a, b) => a.room.localeCompare(b.room, "lo", { numeric: true }));
  const stats = invoiceStats(ctx, list);
  const missing = data.rooms.filter((room) => room.status === "occupied" && !list.some((invoice) => invoice.room === room.no));

  // ຫ້ອງທີ່ຜູ້ເຊົ່າໄປເຮັດວຽກຕ່າງແຂວງ — ບໍ່ຖືກຄິດຄ່ານ້ຳປະປາ, ຄ່າຂີ້ເຫຍື້ອ ແລະ ຄ່າບໍລິການ
  const awayRooms = data.tenants
    .filter((tenant) => tenant.stayStatus === "away")
    .map((tenant) => tenant.room)
    .sort((a, b) => String(a).localeCompare(String(b), "lo", { numeric: true }));

  const filtered = list.filter(
    (invoice) =>
      (!statusFilter || (statusFilter === "paid" ? invoice.paid : !invoice.paid)) &&
      (!query ||
        String(invoice.tenant || "").toLowerCase().includes(query.toLowerCase()) ||
        invoice.room.includes(query) ||
        invoice.no.toLowerCase().includes(query.toLowerCase()) ||
        invoiceNoLabel(invoice.no).toLowerCase().includes(query.toLowerCase()))
  );

  const tiles = [
    {
      label: "ລວມທັງໝົດ",
      value: money(stats.total, currency),
      note: `${num(list.length)} ໃບ ໃນເດືອນນີ້`,
      icon: <IconReceipt2 size={14} />,
      art: "invoice" as const,
      gradient: GRADIENTS.blue,
      shadow: "rgba(27,111,214,0.45)"
    },
    {
      label: "ຍັງຄ້າງ",
      value: money(stats.unpaid, currency),
      note: `${num(stats.unpaidCount)} ໃບ ລໍຖ້າເກັບ`,
      icon: <IconClock size={14} />,
      art: "clock" as const,
      gradient: GRADIENTS.amber,
      shadow: "rgba(232,163,61,0.5)"
    },
    {
      label: "ເກັບໄດ້ແລ້ວ",
      value: money(stats.paid, currency),
      note: `${num(stats.paidCount)} ໃບ ຊຳລະແລ້ວ`,
      icon: <IconCircleCheck size={14} />,
      art: "check" as const,
      gradient: GRADIENTS.green,
      shadow: "rgba(18,160,106,0.45)"
    },
    {
      label: "ອັດຕາເກັບເງິນໄດ້",
      value: `${stats.rate}%`,
      note: `${num(stats.kwh)} kWh · ${num(stats.m3)} m³`,
      icon: <IconChartBar size={14} />,
      art: "chart" as const,
      gradient: GRADIENTS.navy,
      shadow: "rgba(18,58,99,0.5)"
    }
  ];

  const togglePaid = async (invoice: Invoice) => {
    const ok = await commit((draft) => {
      const target = draft.invoices.find((item) => item.no === invoice.no);
      if (target) target.paid = !target.paid;
      logActivity(draft, "invoices", invoice.paid ? "ຍົກເລີກການຊຳລະ" : "ບັນທຶກການຊຳລະ", `${invoice.no} · ຫ້ອງ ${invoice.room}`);
    });
    notifyStatus(
      ok ? "success" : "danger",
      ok ? (invoice.paid ? "ຍົກເລີກການຊຳລະແລ້ວ" : "ບັນທຶກການຊຳລະແລ້ວ") : "ບັນທຶກບໍ່ສຳເລັດ",
      `${invoiceNoLabel(invoice.no)} · ຫ້ອງ ${invoice.room}`
    );
  };

  const remove = (invoice: Invoice) => {
    setPending(invoice);
    setConfirmState("idle");
    setConfirmError("");
  };

  const confirmRemove = async () => {
    if (!pending) return;
    setConfirmState("busy");
    const ok = await commit((draft) => {
      removeInvoice(draft, pending.no);
      logActivity(draft, "invoices", "ລຶບໃບບີນ", pending.no);
    });
    if (!ok) {
      setConfirmState("error");
      setConfirmError("ບັນທຶກການລຶບບໍ່ສຳເລັດ — ກະລຸນາລອງໃໝ່");
      return;
    }
    setConfirmState("done");
    notifyStatus("success", "ລຶບໃບບີນສຳເລັດ", `${invoiceNoLabel(pending.no)} · ຫ້ອງ ${pending.room}`);
    window.setTimeout(() => {
      setPending(null);
      setConfirmState("idle");
    }, 450);
  };

  const generate = async () => {
    if (!missing.length) return;
    const ok = await commit((draft) => {
      missing.forEach((room) => {
        const tenant = draft.tenants.find((item): item is Tenant => String(item.room) === String(room.no)) || null;
        upsertInvoice(draft, emptyInvoice(year, monthNumber, room.no, tenant));
      });
      logActivity(draft, "invoices", "ສ້າງໃບບີນ", `${missing.length} ຫ້ອງ · ${monthLabel(monthNumber, year)}`);
    });
    notifyStatus(
      ok ? "success" : "danger",
      ok ? "ສ້າງໃບບີນສຳເລັດ" : "ສ້າງໃບບີນບໍ່ສຳເລັດ",
      `${missing.length} ຫ້ອງ · ${monthLabel(monthNumber, year)}`
    );
  };

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ໃບບີນເກັບເງິນ"
        subtitle={`ໃບບີນປະຈຳເດືອນ ${monthLabel(monthNumber, year)}`}
        actions={
          <Group gap="sm" wrap="wrap" justify="flex-end">
            <MonthSwitcher />
            {canEdit("invoices") && missing.length ? (
              <Button className="btn-grad" leftSection={<IconFilePlus size={16} />} onClick={generate}>
                ສ້າງໃບບີນທີ່ຂາດ {missing.length}
              </Button>
            ) : null}
          </Group>
        }
      />

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
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
            <Text className="tile-value tnum inv-stat-value" mt={10}>
              {tile.value}
            </Text>
            <Text className="tile-note" mt={6}>
              {tile.note}
            </Text>
          </Box>
        ))}
      </SimpleGrid>

      <Box className="surface rep-toolbar">
        <SegmentedControl
          className="rep-tabs"
          radius="xl"
          size="sm"
          value={statusFilter ?? "all"}
          onChange={(value) => setStatusFilter(value === "all" ? null : value)}
          data={[
            { value: "all", label: `ທັງໝົດ ${list.length}` },
            { value: "paid", label: `ຊຳລະແລ້ວ ${stats.paidCount}` },
            { value: "unpaid", label: `ຍັງຄ້າງ ${stats.unpaidCount}` }
          ]}
        />
        <TextInput
          placeholder="ຄົ້ນຫາເລກໃບບີນ / ຫ້ອງ / ຜູ້ເຊົ່າ"
          leftSection={<IconSearch size={15} />}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          radius="xl"
          w={{ base: "100%", sm: 280 }}
        />
      </Box>

      {awayRooms.length ? (
        <Alert
          variant="light"
          color="orange"
          radius="lg"
          icon={<IconPlaneTilt size={16} />}
          title={`ຫ້ອງທີ່ໄປເຮັດວຽກຕ່າງແຂວງ ${awayRooms.length} ຫ້ອງ`}
        >
          <Text size="xs">
            ຫ້ອງ {awayRooms.join(", ")} · ບໍ່ຄິດຄ່ານ້ຳປະປາ, ຄ່າຂີ້ເຫຍື້ອ ແລະ ຄ່າບໍລິການ (ຍັງຄິດຄ່າເຊົ່າ ແລະ ຄ່າໄຟຟ້າ)
          </Text>
        </Alert>
      ) : null}

      <Stack gap={10}>
        <Group justify="space-between" gap="sm" wrap="wrap">
          <Group gap={8}>
            <Text fw={600} c="var(--text-strong)">
              ລາຍການໃບບີນ
            </Text>
            <Badge variant="light" radius="xl">
              {filtered.length}
            </Badge>
          </Group>
          <Text size="xs" c="var(--text-muted)">
            ຮຽງຕາມເລກຫ້ອງ · ກົດສະຫຼັບເພື່ອປ່ຽນສະຖານະຊຳລະ
          </Text>
        </Group>

        {filtered.map((invoice) => {
          const total = invoiceTotal(ctx, invoice);
          // ຍອດຄ້າງຈາກເດືອນກ່ອນຂອງຫ້ອງນີ້ (ຖືກບວກໃນໃບບີນປະຈຸບັນ)
          const carriedItems = arrearsItems(ctx, invoice);
          const carried = carriedItems.reduce((sum, item) => sum + item.amount, 0);
          const rowTenant = data.tenants.find((tenant) => String(tenant.room) === String(invoice.room));
          const away = rowTenant?.stayStatus === "away";
          return (
            <Box key={invoice.no} className={`rep-row lift inv-row${invoice.paid ? " is-paid" : " is-unpaid"}`}>
              <Box className="rep-ico" style={{ color: invoice.paid ? "#12a06a" : "#c98a1f" }}>
                <IconFileInvoice size={18} />
              </Box>

              <Box className="rep-main">
                <Group gap={8} wrap="nowrap" className="rep-title-row">
                  <Text className="rep-title" fw={600} c="var(--text-strong)">
                    {invoice.tenant || "ບໍ່ມີຜູ້ເຊົ່າ"}
                  </Text>
                </Group>
                <Text size="xs" c="var(--text-muted)" mt={2}>
                  <span style={{ color: "var(--brand)", fontWeight: 600 }}>{invoiceNoLabel(invoice.no)}</span>
                  {" · "}
                  <IconBolt size={11} style={{ verticalAlign: "-1px" }} /> {num(invoice.kwh)} kWh
                  {" · "}
                  <IconDroplet size={11} style={{ verticalAlign: "-1px" }} /> {num(invoice.m3)} m³
                </Text>
              </Box>

              <Group className="rep-meta" gap={8}>
                <span className="rep-chip">ຫ້ອງ {invoice.room}</span>
                {away ? (
                  <Tooltip label="ໄປເຮັດວຽກຕ່າງແຂວງ · ບໍ່ຄິດຄ່ານ້ຳ, ຂີ້ເຫຍື້ອ, ບໍລິການ">
                    <Badge variant="light" color="orange" radius="xl" size="sm">
                      ໄປຕ່າງແຂວງ
                    </Badge>
                  </Tooltip>
                ) : null}
                {carried > 0 ? (
                  <Tooltip label={`ຄ້າງ: ${arrearsDetail(carriedItems)}`} multiline w={300}>
                    <Badge variant="light" color="orange" radius="xl" size="sm">
                      ຄ້າງເດືອນກ່ອນ {money(carried, currency)}
                    </Badge>
                  </Tooltip>
                ) : null}
                <Badge variant="light" color={invoice.paid ? "green" : "red"} radius="xl" size="sm">
                  {invoice.paid ? "ຊຳລະແລ້ວ" : "ຍັງຄ້າງ"}
                </Badge>
                <Tooltip label={invoice.paid ? "ຍົກເລີກການຊຳລະ" : "ບັນທຶກການຊຳລະ"}>
                  <ActionIcon
                    className="inv-pay"
                    variant={invoice.paid ? "light" : "default"}
                    color={invoice.paid ? "green" : "gray"}
                    radius="xl"
                    size="md"
                    onClick={() => togglePaid(invoice)}
                    disabled={!canEdit("invoices")}
                    aria-label={invoice.paid ? "ຍົກເລີກການຊຳລະ" : "ບັນທຶກການຊຳລະ"}
                    aria-pressed={invoice.paid}
                  >
                    <span
                      className="inv-pay-icon"
                      style={{ maskImage: `url(${paymentIcon})`, WebkitMaskImage: `url(${paymentIcon})` }}
                      aria-hidden
                    />
                  </ActionIcon>
                </Tooltip>
                <Text className="rep-cost tnum">{money(total, currency)}</Text>
                <Group gap={2} wrap="nowrap" className="rep-actions">
                  <Tooltip label="ພິມໃບບີນຮັບເງິນ (ໃບເສັດ)">
                    <ActionIcon
                      variant="subtle"
                      color="green"
                      radius="xl"
                      onClick={() => navigate(`/invoices/${invoice.no}/receipt`)}
                    >
                      <IconReceipt size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="ພິມໃບບີນ">
                    <ActionIcon variant="subtle" color="brand" radius="xl" onClick={() => navigate(`/invoices/${invoice.no}/print`)}>
                      <IconPrinter size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="ລຶບ">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      radius="xl"
                      disabled={!canDelete("invoices")}
                      onClick={() => remove(invoice)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Box>
          );
        })}

        {!filtered.length ? (
          <Box className="surface rep-empty">
            <Box className="rep-ico rep-ico--empty">
              <IconInbox size={20} />
            </Box>
            <Text fw={600} c="var(--text-strong)" mt="sm">
              ບໍ່ພົບໃບບີນ
            </Text>
            <Text size="xs" c="var(--text-muted)" mt={4}>
              ລອງປ່ຽນຕົວກອງ ຫຼື ຄຳຄົ້ນຫາ
            </Text>
          </Box>
        ) : null}
      </Stack>

      <ConfirmDialog
        opened={!!pending}
        title="ລຶບໃບບີນນີ້?"
        description="ລຶບແລ້ວຈະບໍ່ສາມາດກູ້ຄືນໄດ້ ແລະ ຍອດຈະຖືກຕັດອອກຈາກລາຍງານ."
        confirmLabel="ລຶບໃບບີນ"
        busyLabel="ກຳລັງລຶບ…"
        doneLabel="ລຶບສຳເລັດ"
        state={confirmState}
        error={confirmError}
        targetIcon={<IconFileInvoice size={17} />}
        targetColor="#1663c4"
        targetTitle={pending ? `${invoiceNoLabel(pending.no)} · ຫ້ອງ ${pending.room}` : ""}
        targetMeta={
          pending ? `${pending.tenant || "ບໍ່ມີຜູ້ເຊົ່າ"} · ${monthLabel(Number(pending.month), Number(pending.year))}` : ""
        }
        targetAmount={pending ? money(invoiceTotal(ctx, pending), currency) : ""}
        onCancel={() => {
          setPending(null);
          setConfirmState("idle");
        }}
        onConfirm={confirmRemove}
      />
    </Stack>
  );
}
