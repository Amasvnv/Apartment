import { Box, Card, Group, Progress, Text, ThemeIcon } from "@mantine/core";
import type { ReactNode } from "react";

export type StatTone = "brand" | "green" | "amber" | "red" | "violet" | "cyan";

const TONES: Record<StatTone, { soft: string; solid: string }> = {
  brand: { soft: "#E8F1FE", solid: "#1B6FD6" },
  green: { soft: "#E4F7EE", solid: "#12A06A" },
  amber: { soft: "#FDF2E2", solid: "#E8A33D" },
  red: { soft: "#FDEAEA", solid: "#E5484D" },
  violet: { soft: "#F0EBFE", solid: "#7C5CE0" },
  cyan: { soft: "#E4F6FD", solid: "#0EA5C6" }
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon: ReactNode;
  tone?: StatTone;
  progress?: number;
  hint?: string;
}

export default function StatCard({ label, value, note, icon, tone = "brand", progress, hint }: StatCardProps) {
  const palette = TONES[tone];
  return (
    <Card padding="md" radius="lg">
      <Group justify="space-between" align="flex-start" mb={6} wrap="nowrap">
        <Text size="xs" c="#5A7391" fw={500}>
          {label}
        </Text>
        <ThemeIcon variant="light" radius="md" size={30} style={{ background: palette.soft, color: palette.solid }}>
          {icon}
        </ThemeIcon>
      </Group>
      <Text fw={700} size="lg" c="#0B2545" lh={1.3}>
        {value}
      </Text>
      {typeof progress === "number" ? (
        <Box mt={8} mb={4}>
          <Progress value={Math.max(0, Math.min(100, progress))} size="sm" radius="xl" color="brand" />
        </Box>
      ) : null}
      {note ? (
        <Text size="xs" c="#7C93B0" mt={4} title={hint}>
          {note}
        </Text>
      ) : null}
    </Card>
  );
}
