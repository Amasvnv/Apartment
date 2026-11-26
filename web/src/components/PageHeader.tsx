import { Box, Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
      <Box>
        <Title order={1}>{title}</Title>
        {subtitle ? (
          <Text size="sm" c="#5A7391" mt={4}>
            {subtitle}
          </Text>
        ) : null}
      </Box>
      {actions ? <Stack gap={0}>{actions}</Stack> : null}
    </Group>
  );
}
