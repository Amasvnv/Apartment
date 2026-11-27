import { Box, Button, Card, Group, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowLeft, IconFileTypePdf, IconPrinter, IconReceipt } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BillPaper from "../components/BillPaper";
import { useStore } from "../data/store";
import { invoiceNoLabel } from "../lib/format";
import { savePdf } from "../lib/pdf";

export default function InvoicePrint() {
  const { no } = useParams();
  const { data } = useStore();
  const navigate = useNavigate();
  const invoice = data.invoices.find((item) => item.no === decodeURIComponent(no || ""));
  const [busy, setBusy] = useState(false);

  if (!invoice) {
    return (
      <Box p="xl">
        <Card padding="xl">
          <Stack gap="md">
            <Text fw={600}>ບໍ່ພົບໃບບີນ {no}</Text>
            <Button variant="light" leftSection={<IconArrowLeft size={15} />} w="fit-content" onClick={() => navigate("/invoices")}>
              ກັບໜ້າໃບບີນ
            </Button>
          </Stack>
        </Card>
      </Box>
    );
  }

  const downloadPdf = async () => {
    setBusy(true);
    try {
      await savePdf(invoiceNoLabel(invoice.no));
    } catch (error) {
      notifications.show({
        color: "red",
        title: "ສ້າງ PDF ບໍ່ສຳເລັດ",
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box className="print-shell" p={{ base: "md", sm: "xl" }} style={{ background: "var(--canvas)", minHeight: "100vh" }}>
      <Box className="print-wrap" maw={840} mx="auto">
        <Group justify="space-between" mb="md" gap="sm" wrap="wrap" className="no-print">
          <Button variant="default" leftSection={<IconArrowLeft size={15} />} onClick={() => navigate("/invoices")}>
            ກັບ
          </Button>
          <Group gap="sm">
            <Button
              variant="light"
              color="green"
              leftSection={<IconReceipt size={15} />}
              onClick={() => navigate(`/invoices/${encodeURIComponent(invoice.no)}/receipt`)}
            >
              ໃບບິນຮັບເງິນ
            </Button>
            <Button
              variant="light"
              leftSection={<IconFileTypePdf size={15} />}
              title="ດາວໂຫຼດໃບບີນເປັນໄຟລ໌ PDF"
              loading={busy}
              onClick={downloadPdf}
            >
              ດາວໂຫຼດ PDF
            </Button>
            <Button leftSection={<IconPrinter size={15} />} onClick={() => window.print()}>
              ພິມໃບບີນ
            </Button>
          </Group>
        </Group>
        <BillPaper invoice={invoice} />
      </Box>
    </Box>
  );
}
