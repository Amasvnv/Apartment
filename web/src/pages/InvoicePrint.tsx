import { Box, Button, Card, Group, Stack, Text } from "@mantine/core";
import { IconArrowLeft, IconPrinter } from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router-dom";
import BillPaper from "../components/BillPaper";
import { useStore } from "../data/store";

export default function InvoicePrint() {
  const { no } = useParams();
  const { data } = useStore();
  const navigate = useNavigate();
  const invoice = data.invoices.find((item) => item.no === decodeURIComponent(no || ""));

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

  return (
    <Box p={{ base: "md", sm: "xl" }} style={{ background: "#F4F8FF", minHeight: "100vh" }}>
      <Box maw={640} mx="auto">
        <Group justify="space-between" mb="md" className="no-print">
          <Button variant="default" leftSection={<IconArrowLeft size={15} />} onClick={() => navigate("/invoices")}>
            ກັບ
          </Button>
          <Button leftSection={<IconPrinter size={15} />} onClick={() => window.print()}>
            ພິມໃບບີນ
          </Button>
        </Group>
        <BillPaper invoice={invoice} />
      </Box>
    </Box>
  );
}
