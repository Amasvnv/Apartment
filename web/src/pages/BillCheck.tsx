import {
  Alert,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title
} from "@mantine/core";
import {
  IconArrowLeft,
  IconCalendarStats,
  IconCircleCheck,
  IconFileInvoice,
  IconPrinter,
  IconReceipt2,
  IconSearch,
  IconShieldLock
} from "@tabler/icons-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BillPaper from "../components/BillPaper";
import { ctxOf, invoiceTotal } from "../lib/compute";
import { money, monthLabel } from "../lib/format";
import { fetchPublicBill, normalizeData, readConfig, type PublicBillPayload } from "../data/storage";
import type { AppData, Invoice, Repair, Room, Tenant } from "../data/types";

const STEPS: { icon: ReactNode; title: string; text: string; tone: string }[] = [
  {
    icon: <IconSearch size={15} />,
    title: "ໃສ່ເລກຫ້ອງ",
    text: "ພິມເລກຫ້ອງຂອງທ່ານ ແລ້ວກົດ ຄົ້ນຫາ",
    tone: "#1b6fd6"
  },
  {
    icon: <IconReceipt2 size={15} />,
    title: "ກວດເບິ່ງລາຍລະອຽດ",
    text: "ເບິ່ງຄ່າເຊົ່າ, ຄ່າໄຟຟ້າ, ຄ່ານ້ຳ, ຄ່າຂີ້ເຫຍື້ອ ແລະ ຍອດລວມທັງໝົດ",
    tone: "#06b6d4"
  },
  {
    icon: <IconCircleCheck size={15} />,
    title: "ກວດສະຖານະ ແລະ ພິມ",
    text: "ເບິ່ງວ່າຈ່າຍແລ້ວ ຫຼື ຍັງ ແລ້ວພິມໃບບີນໄວ້ເປັນຫຼັກຖານ",
    tone: "#12a06a"
  }
];

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

function toInvoice(raw: Record<string, unknown>, fallbackRoom: string): Invoice {
  return {
    no: String(raw.id ?? ""),
    room: String(raw.room ?? fallbackRoom),
    tenant: String(raw.tenant ?? ""),
    kwh: Number(raw.kwh) || 0,
    m3: Number(raw.m3) || 0,
    rent: Number(raw.rent) || 0,
    service: Number(raw.service) || 0,
    other: Number(raw.other) || 0,
    paid: !!raw.paid,
    due: String(raw.due ?? ""),
    year: Number(raw.year) || 0,
    month: Number(raw.month) || 0
  };
}

/** ປະກອບເປັນ AppData ພໍສຳລັບພິມໃບບີນ — ບໍ່ມີຂໍ້ມູນຫ້ອງອື່ນ ຫຼື ຜູ້ໃຊ້ */
function buildPublicData(payload: PublicBillPayload, room: string): AppData | null {
  if (!payload.found) return null;
  const raw = asRecord(payload.invoice);
  if (!raw.id && !raw.room) return null;

  const invoice = toInvoice(raw, room);
  const invoices = (payload.invoices?.length ? payload.invoices : [raw]).map((item) =>
    toInvoice(asRecord(item), room)
  );
  const tenants: Tenant[] = (payload.tenants ?? []).map((item) => ({
    name: String(item.room) === invoice.room ? String(payload.tenant_name ?? "") : "",
    phone: "",
    room: String(item.room),
    contract: "",
    moveIn: "",
    people: Math.max(1, Number(item.people) || 1),
    deposit: 0,
    rent: 0,
    stayStatus: item.stay_status === "away" ? "away" : "resident"
  }));
  const rooms: Room[] = [
    {
      no: invoice.room,
      floor: Number(payload.room?.floor) || 1,
      type: payload.room?.room_type || "1 ຫ້ອງນອນ",
      rent: invoice.rent,
      status: "occupied",
      tenant: payload.tenant_name ?? null,
      phone: null,
      meterElec: 0,
      meterWater: 0
    }
  ];
  const repairs: Repair[] = (payload.repairs ?? []).map((item) => {
    const row = asRecord(item);
    return {
      id: String(row.id ?? ""),
      room: String(row.room ?? invoice.room),
      title: String(row.title ?? ""),
      category: "other",
      priority: "normal",
      status: (row.status as Repair["status"]) || "open",
      assignee: "",
      phone: "",
      cost: 0,
      reported: String(row.reported ?? ""),
      due: "",
      done: "",
      note: ""
    };
  });

  return normalizeData({
    rooms,
    tenants,
    invoices,
    repairs,
    settings: payload.settings as AppData["settings"] | undefined,
    rev: 0
  });
}

export default function BillCheck() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialRoom = new URLSearchParams(location.search).get("room") || "";
  const [room, setRoom] = useState(initialRoom);
  const [query, setQuery] = useState(initialRoom);
  const [payload, setPayload] = useState<PublicBillPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const code = query.trim();
    if (!code) {
      setPayload(null);
      setError("");
      return;
    }

    const config = readConfig();
    if (!config) {
      setPayload(null);
      setError("ຍັງບໍ່ໄດ້ເຊື່ອມຕໍ່ຖານຂໍ້ມູນ");
      return;
    }

    let alive = true;
    setLoading(true);
    setError("");
    fetchPublicBill(config, code)
      .then((result) => {
        if (alive) setPayload(result);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setPayload(null);
        setError(err instanceof Error ? err.message : "ໂຫຼດໃບບີນບໍ່ສຳເລັດ");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [query]);

  const data = useMemo(() => (payload ? buildPublicData(payload, query.trim()) : null), [payload, query]);
  const invoice = data?.invoices[0] ?? null;
  const total = data && invoice ? invoiceTotal(ctxOf(data), invoice) : 0;
  const settled = !!invoice?.paid;
  const brandName = data?.settings.name || "ອາພາດເມັນ";

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setQuery(room.trim());
  };

  return (
    <Box className="bc-page" p={{ base: "md", sm: "xl" }} mih="100vh">
      <Box maw={1060} mx="auto">
        <Group justify="space-between" mb="lg" gap="sm" wrap="nowrap">
          <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
            <ThemeIcon size={34} radius="md" variant="gradient" gradient={{ from: "blue", to: "cyan", deg: 135 }}>
              <IconFileInvoice size={17} />
            </ThemeIcon>
            <Box style={{ minWidth: 0 }}>
              <Text fw={700} c="var(--text-strong)" truncate>
                {brandName}
              </Text>
              <Text size="xs" c="var(--text-muted)" truncate>
                ເບິ່ງໃບບີນ ແລະ ສະຖານະການຊຳລະ
              </Text>
            </Box>
          </Group>
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconArrowLeft size={14} />}
            onClick={() => navigate("/login")}
            className="no-print"
          >
            ເຂົ້າສູ່ລະບົບ
          </Button>
        </Group>

        <Grid gutter="md" className="no-print">
          <Grid.Col span={{ base: 12, lg: 7 }}>
            <Card className="bc-card bc-search-card" padding={0} h="100%">
              <Box className="bc-hero">
                <span className="bc-hero-badge">
                  <IconShieldLock size={12} /> ບໍ່ຕ້ອງເຂົ້າສູ່ລະບົບ
                </span>
                <Title order={2} className="bc-hero-title">
                  ເບິ່ງໃບບີນເກັບເງິນຂອງທ່ານ
                </Title>
                <Text className="bc-hero-sub">
                  ໃສ່ເລກຫ້ອງ ເພື່ອເບິ່ງໃບບີນລ່າສຸດ ແລະ ສະຖານະການຊຳລະ ໄດ້ທັນທີ
                </Text>

                <form onSubmit={submit}>
                  <Group align="flex-end" gap="sm" wrap="nowrap" mt="md">
                    <TextInput
                      label="ເລກຫ້ອງ"
                      placeholder="ເຊັ່ນ 101"
                      leftSection={<IconFileInvoice size={15} />}
                      value={room}
                      size="md"
                      radius="md"
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setRoom(value);
                        if (!value.trim()) {
                          setQuery("");
                          setPayload(null);
                        }
                      }}
                      style={{ flex: 1 }}
                      className="bc-input"
                    />
                    <Button type="submit" className="btn-grad bc-search-btn" size="md" radius="md" leftSection={<IconSearch size={15} />}>
                      ຄົ້ນຫາ
                    </Button>
                  </Group>
                </form>
              </Box>

              <Box className="bc-foot">
                <Group gap={8} wrap="nowrap" align="flex-start">
                  <IconCalendarStats size={14} style={{ color: "var(--text-muted)", flex: "none", marginTop: 1 }} />
                  <Text size="xs" c="var(--text-muted)">
                    ຖ້າບໍ່ພົບໃບບີນ ກະລຸນາຕິດຕໍ່ຜູ້ຈັດການອາພາດເມັນ
                  </Text>
                </Group>
              </Box>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 5 }}>
            <Card className="bc-card" padding="lg" h="100%">
              <Group justify="space-between" align="center" mb={14}>
                <Text className="bc-steps-title">ຂັ້ນຕອນການໃຊ້ງານ</Text>
                <span className="bc-steps-count">3 ຂັ້ນຕອນ</span>
              </Group>

              <Stack gap={0} className="bc-steps">
                {STEPS.map((step, index) => (
                  <Box key={step.title} className="bc-step" style={{ "--tone": step.tone } as CSSProperties}>
                    <Box className="bc-step-rail">
                      <span className="bc-step-no">{index + 1}</span>
                      {index < STEPS.length - 1 ? <span className="bc-step-line" /> : null}
                    </Box>
                    <Box style={{ minWidth: 0, paddingBottom: index < STEPS.length - 1 ? 14 : 0 }}>
                      <Group gap={7} wrap="nowrap" align="center">
                        <span className="bc-step-ico">{step.icon}</span>
                        <Text className="bc-step-title">{step.title}</Text>
                      </Group>
                      <Text className="bc-step-text">{step.text}</Text>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        <Box maw={720} mx="auto" mt="lg">
          {error ? (
            <Alert color="red" variant="light" radius="md" title="ໂຫຼດໃບບີນບໍ່ສຳເລັດ">
              {error}
            </Alert>
          ) : null}

          {loading ? (
            <Text size="sm" c="var(--text-muted)" ta="center" py="md">
              ກຳລັງໂຫຼດໃບບີນ…
            </Text>
          ) : null}

          {query && !loading && !error && payload && !payload.found ? (
            <Alert color="amber" variant="light" radius="md" title={`ບໍ່ພົບໃບບີນຂອງຫ້ອງ ${query}`}>
              ກະລຸນາກວດເລກຫ້ອງອີກຄັ້ງ ຫຼື ຕິດຕໍ່ຜູ້ຈັດການ
            </Alert>
          ) : null}

          {invoice && data ? (
            <Stack gap="sm" className="bc-result">
              <Box
                className={`bc-result-head no-print${settled ? " is-paid" : " is-due"}`}
                style={{ "--tone": settled ? "#12a06a" : "#e8a33d" } as CSSProperties}
              >
                <Group justify="space-between" align="center" gap="sm" wrap="wrap">
                  <Box style={{ minWidth: 0 }}>
                    <Text className="bc-result-eyebrow">ໃບບີນລ່າສຸດ · ຫ້ອງ {invoice.room}</Text>
                    <Text className="bc-result-name" truncate>
                      {invoice.tenant || "ບໍ່ມີຜູ້ເຊົ່າ"}
                    </Text>
                    <Text className="bc-result-sub">
                      ປະຈຳເດືອນ {monthLabel(invoice.month, invoice.year)} · ລວມ {money(total, data.settings.currency)}
                    </Text>
                  </Box>
                  <Group gap={8} wrap="nowrap">
                    <span className={`bc-status${settled ? " is-paid" : " is-due"}`}>
                      <IconCircleCheck size={13} />
                      {settled ? "ຊຳລະແລ້ວ" : "ຍັງບໍ່ຊຳລະ"}
                    </span>
                    <Button variant="white" size="xs" radius="md" leftSection={<IconPrinter size={14} />} onClick={() => window.print()}>
                      ພິມ
                    </Button>
                  </Group>
                </Group>
              </Box>
              <BillPaper invoice={invoice} data={data} />
            </Stack>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
