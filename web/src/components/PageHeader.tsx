import { Box, Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: string;
  sticky?: boolean;
}

export default function PageHeader({ title, subtitle, actions, breadcrumb, sticky }: PageHeaderProps) {
  const content = (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md" w="100%">
      <Box style={{ minWidth: 0 }}>
        {breadcrumb ? (
          <Text size="xs" c="var(--text-muted)" fw={600} tt="uppercase" style={{ letterSpacing: "0.1em", fontSize: 10.5 }}>
            {breadcrumb}
          </Text>
        ) : null}
        <Title order={1} mt={breadcrumb ? 4 : 0}>
          {title}
        </Title>
        {subtitle ? (
          <Text size="sm" c="var(--text-body)" mt={4}>
            {subtitle}
          </Text>
        ) : null}
      </Box>
      {actions ? <Stack gap={0}>{actions}</Stack> : null}
    </Group>
  );

  if (!sticky) return content;

  return (
    <Box className="context-bar">
      {content}
    </Box>
  );
}
