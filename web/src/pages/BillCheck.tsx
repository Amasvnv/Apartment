import { Alert, Box, Button, Card, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconArrowLeft, IconFileInvoice, IconPrinter, IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BillPaper from "../components/BillPaper";
import { useStore } from "../data/store";
import { invoiceTotal, ctxOf } from "../lib/compute";
import { money, monthLabel } from "../lib/format";

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

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setQuery(room.trim());
  };

  return (
    <Box p={{ base: "md", sm: "xl" }} mih="100vh" style={{ background: "#F4F8FF" }}>
      <Box maw={680} mx="auto">
        <Group justify="space-between" mb="lg">
          <Text fw={600} c="#0B2545">
            {data.settings.name}
          </Text>
          <Button variant="subtle" size="xs" leftSection={<IconArrowLeft size={14} />} onClick={() => navigate("/login")}>
            ເຂົ້າສູ່ລະບົບ
          </Button>
        </Group>

        <Card padding="lg" mb="md" className="no-print">
          <form onSubmit={submit}>
            <Stack gap="sm">
              <Title order={2}>ເບິ່ງໃບບີນເກັບເງິນຂອງທ່ານ</Title>
              <Text size="sm" c="#5A7391">
                ໃສ່ເລກຫ້ອງ ເພື່ອເບິ່ງໃບບີນລ່າສຸດ ແລະ ສະຖານະການຊຳລະ
              </Text>
              <Group align="flex-end" gap="sm">
                <TextInput
                  label="ເລກຫ້ອງ"
                  placeholder="ເຊັ່ນ 101"
                  leftSection={<IconFileInvoice size={15} />}
                  value={room}
                  onChange={(event) => {
                    setRoom(event.currentTarget.value);
                    if (!event.currentTarget.value) setQuery("");
                  }}
                  style={{ flex: 1 }}
                />
                <Button type="submit" leftSection={<IconSearch size={15} />}>
                  ຄົ້ນຫາ
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>

        {query && !invoice ? (
          <Alert color="amber" variant="light">
            ບໍ່ພົບໃບບີນຂອງຫ້ອງ {query}
          </Alert>
        ) : null}

        {invoice ? (
          <Stack gap="sm">
            <Group justify="space-between" className="no-print">
              <Text size="sm" c="#5A7391">
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
  );
}
