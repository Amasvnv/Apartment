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
  IconCircleCheck,
  IconFileInvoice,
  IconPrinter,
  IconReceipt2,
  IconSearch
} from "@tabler/icons-react";
import { useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BillPaper from "../components/BillPaper";
import { useStore } from "../data/store";
import { invoiceTotal, ctxOf } from "../lib/compute";
import { money, monthLabel } from "../lib/format";

const STEPS: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <IconSearch size={15} />,
    title: "ໃສ່ເລກຫ້ອງ",
    text: "ພິມເລກຫ້ອງຂອງທ່ານ ແລ້ວກົດ ຄົ້ນຫາ"
  },
  {
    icon: <IconReceipt2 size={15} />,
    title: "ກວດເບິ່ງລາຍລະອຽດ",
    text: "ເບິ່ງຄ່າເຊົ່າ, ຄ່າໄຟຟ້າ, ຄ່ານ້ຳ, ຄ່າຂີ້ເຫຍື້ອ ແລະ ຍອດລວມທັງໝົດ"
  },
  {
    icon: <IconCircleCheck size={15} />,
    title: "ກວດສະຖານະ ແລະ ພິມ",
    text: "ເບິ່ງວ່າຈ່າຍແລ້ວ ຫຼື ຍັງ ແລ້ວພິມໃບບີນໄວ້ເປັນຫຼັກຖານ"
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

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setQuery(room.trim());
  };

  return (
    <Box p={{ base: "md", sm: "xl" }} mih="100vh" style={{ background: "var(--canvas)" }}>
      <Box maw={1060} mx="auto">
        <Group justify="space-between" mb="lg">
          <Group gap={10} wrap="nowrap">
            <ThemeIcon size={30} radius="md" variant="light" color="blue">
              <IconFileInvoice size={16} />
            </ThemeIcon>
            <Text fw={600} c="var(--text-strong)">
              {data.settings.name}
            </Text>
          </Group>
          <Button variant="subtle" size="xs" leftSection={<IconArrowLeft size={14} />} onClick={() => navigate("/login")}>
            ເຂົ້າສູ່ລະບົບ
          </Button>
        </Group>

        <Grid gutter="md" className="no-print">
          <Grid.Col span={{ base: 12, lg: 7 }}>
            <Card padding="xl" h="100%">
              <form onSubmit={submit}>
                <Stack gap="md">
                  <Box>
                    <Title order={2} style={{ fontSize: 22 }}>
                      ເບິ່ງໃບບີນເກັບເງິນຂອງທ່ານ
                    </Title>
                    <Text size="sm" c="var(--text-body)" mt={4}>
                      ໃສ່ເລກຫ້ອງ ເພື່ອເບິ່ງໃບບີນລ່າສຸດ ແລະ ສະຖານະການຊຳລະ — ບໍ່ຕ້ອງເຂົ້າສູ່ລະບົບ
                    </Text>
                  </Box>

                  <Group align="flex-end" gap="sm" wrap="nowrap">
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
                    />
                    <Button type="submit" size="md" radius="md" leftSection={<IconSearch size={15} />}>
                      ຄົ້ນຫາ
                    </Button>
                  </Group>

                  <Text size="xs" c="var(--text-muted)">
                    ຕົວຢ່າງ: {roomExamples.join(" · ") || "101 · 102 · 201"} — ຖ້າບໍ່ພົບໃບບີນ ກະລຸນາຕິດຕໍ່ຜູ້ຈັດການອາພາດເມັນ
                  </Text>
                </Stack>
              </form>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 5 }}>
            <Card padding="lg" h="100%">
              <Text fw={600} c="var(--text-strong)" mb="sm" style={{ fontSize: 12.5, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                ຂັ້ນຕອນການໃຊ້ງານ
              </Text>
              <Stack gap={14}>
                {STEPS.map((step, index) => (
                  <Group key={step.title} gap={11} wrap="nowrap" align="flex-start">
                    <Box className="billcheck-step-no">{index + 1}</Box>
                    <Box style={{ minWidth: 0 }}>
                      <Group gap={6} wrap="nowrap">
                        <Box style={{ color: "var(--brand)", display: "flex" }}>{step.icon}</Box>
                        <Text fw={600} size="sm" c="var(--text-strong)">
                          {step.title}
                        </Text>
                      </Group>
                      <Text size="xs" c="var(--text-muted)" mt={3} style={{ lineHeight: 1.55 }}>
                        {step.text}
                      </Text>
                    </Box>
                  </Group>
                ))}
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        <Box maw={680} mx="auto" mt="lg">
          {query && !invoice ? (
            <Alert color="amber" variant="light">
              ບໍ່ພົບໃບບີນຂອງຫ້ອງ {query}
            </Alert>
          ) : null}

          {invoice ? (
            <Stack gap="sm">
              <Group justify="space-between" className="no-print">
                <Text size="sm" c="var(--text-body)">
                  ຫ້ອງ {invoice.room}
                  {tenant ? ` · ${tenant.name}` : ""} · ລ່າສຸດ {monthLabel(invoice.month, invoice.year)} ·{" "}
                  {money(invoiceTotal(ctx, invoice), data.settings.currency)}
                </Text>
                <Button variant="light" size="xs" leftSection={<IconPrinter size={14} />} onClick={() => window.print()}>
                  ພິມ
                </Button>
              </Group>
              <BillPaper invoice={invoice} />
            </Stack>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
