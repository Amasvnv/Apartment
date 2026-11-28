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
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BillPaper from "../components/BillPaper";
import { useStore } from "../data/store";
import { invoiceTotal, ctxOf } from "../lib/compute";
import { money, monthLabel } from "../lib/format";

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

export default function BillCheck() {
  const { data } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const initialRoom = new URLSearchParams(location.search).get("room") || "";
  const [room, setRoom] = useState(initialRoom);
  const [query, setQuery] = useState(initialRoom);

  const ctx = useMemo(() => ctxOf(data), [data]);
  const invoices = useMemo(
    () =>
      data.invoices
        .filter((invoice) => String(invoice.room) === String(query))
        .sort((a, b) => Number(b.year) * 12 + Number(b.month) - (Number(a.year) * 12 + Number(a.month))),
    [data.invoices, query]
  );
  const invoice = invoices[0];
  const tenant = data.tenants.find((item) => String(item.room) === String(query));
  const roomExamples = [...data.rooms]
    .sort((a, b) => a.no.localeCompare(b.no, undefined, { numeric: true }))
    .slice(0, 3)
    .map((item) => item.no);

  const total = invoice ? invoiceTotal(ctx, invoice) : 0;
  const settled = !!invoice?.paid;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setQuery(room.trim());
  };

  const pickRoom = (no: string) => {
    setRoom(no);
    setQuery(no);
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
                {data.settings.name}
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
                      placeholder={roomExamples[0] ? `ເຊັ່ນ ${roomExamples[0]}` : "ເຊັ່ນ 101"}
                      leftSection={<IconFileInvoice size={15} />}
                      value={room}
                      size="md"
                      radius="md"
                      onChange={(event) => {
                        setRoom(event.currentTarget.value);
                        if (!event.currentTarget.value) setQuery("");
                      }}
                      style={{ flex: 1 }}
                      className="bc-input"
                    />
                    <Button type="submit" className="btn-grad bc-search-btn" size="md" radius="md" leftSection={<IconSearch size={15} />}>
                      ຄົ້ນຫາ
                    </Button>
                  </Group>
                </form>

                <Group gap={6} mt="md" wrap="wrap" align="center">
                  <Text className="bc-hint-label">ລອງ:</Text>
                  {(roomExamples.length ? roomExamples : ["101", "102", "201"]).map((no) => (
                    <button key={no} type="button" className="bc-chip" onClick={() => pickRoom(no)}>
                      ຫ້ອງ {no}
                    </button>
                  ))}
                </Group>
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
          {query && !invoice ? (
            <Alert color="amber" variant="light" radius="md" title={`ບໍ່ພົບໃບບີນຂອງຫ້ອງ ${query}`}>
              ກະລຸນາກວດເລກຫ້ອງອີກຄັ້ງ ຫຼື ຕິດຕໍ່ຜູ້ຈັດການ
            </Alert>
          ) : null}

          {invoice ? (
            <Stack gap="sm" className="bc-result">
              <Box
                className={`bc-result-head no-print${settled ? " is-paid" : " is-due"}`}
                style={{ "--tone": settled ? "#12a06a" : "#e8a33d" } as CSSProperties}
              >
                <Group justify="space-between" align="center" gap="sm" wrap="wrap">
                  <Box style={{ minWidth: 0 }}>
                    <Text className="bc-result-eyebrow">ໃບບີນລ່າສຸດ · ຫ້ອງ {invoice.room}</Text>
                    <Text className="bc-result-name" truncate>
                      {tenant?.name || invoice.tenant || "ບໍ່ມີຜູ້ເຊົ່າ"}
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
              <BillPaper invoice={invoice} />
            </Stack>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
