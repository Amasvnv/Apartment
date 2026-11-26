import { Box, Button, Card, Group, Text, ThemeIcon, Title } from "@mantine/core";
import { IconArrowLeft, IconTools } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";

export default function ComingSoon({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <Card padding="xl" radius="lg">
      <Group gap="md" align="flex-start" wrap="nowrap">
        <ThemeIcon size={44} radius="md" variant="light" color="brand">
          <IconTools size={22} />
        </ThemeIcon>
        <Box>
          <Title order={2}>{title}</Title>
          <Text size="sm" c="#5A7391" mt={6} maw={560}>
            ໜ້ານີ້ກຳລັງຖືກຍ້າຍມາເປັນ React + Mantine ໃນ Milestone ຕໍ່ໄປ. ຂໍ້ມູນເດີມຍັງຢູ່ຄົບ
            ແລະ ເວັບເກົ່າຍັງໃຊ້ໄດ້.
          </Text>
          <Button mt="md" variant="light" leftSection={<IconArrowLeft size={15} />} onClick={() => navigate("/")}>
            ກັບໜ້າພາບລວມ
          </Button>
        </Box>
      </Group>
    </Card>
  );
}
