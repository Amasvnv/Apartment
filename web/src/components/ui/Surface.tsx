import { Box, Group, Text, type BoxProps } from "@mantine/core";
import type { ReactNode } from "react";

interface SurfaceProps extends Omit<BoxProps, "children"> {
  title?: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  lift?: boolean;
}

export default function Surface({ title, hint, actions, footer, children, lift, className, ...rest }: SurfaceProps) {
  return (
    <Box className={["surface", lift ? "lift" : "", className].filter(Boolean).join(" ")} p="lg" {...rest}>
      {title || actions ? (
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm" mb="md">
          <Box style={{ minWidth: 0 }}>
            {title ? (
              <Text fw={600} c="var(--text-strong)" style={{ fontSize: 15, lineHeight: 1.4 }}>
                {title}
              </Text>
            ) : null}
            {hint ? (
              <Text size="xs" c="var(--text-muted)" mt={2} style={{ lineHeight: 1.5 }}>
                {hint}
              </Text>
            ) : null}
          </Box>
          {actions ? <Box style={{ flexShrink: 0 }}>{actions}</Box> : null}
        </Group>
      ) : null}
      {children}
      {footer ? (
        <Box mt="md" pt="sm" style={{ borderTop: "1px solid var(--hairline)" }}>
          {footer}
        </Box>
      ) : null}
    </Box>
  );
}
