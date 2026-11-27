import { Box, Group, Skeleton, Stack } from "@mantine/core";

export default function SkeletonCard({ lines = 3, height }: { lines?: number; height?: number }) {
  return (
    <Box className="surface" p="lg" style={height ? { height } : undefined}>
      <Group justify="space-between" mb="md">
        <Skeleton height={12} width="42%" radius="xl" />
        <Skeleton height={26} width={26} radius={9} />
      </Group>
      <Stack gap={10}>
        <Skeleton height={26} width="58%" radius="sm" />
        {Array.from({ length: Math.max(0, lines - 1) }, (_, index) => (
          <Skeleton key={index} height={10} width={index === 0 ? "70%" : "50%"} radius="xl" />
        ))}
      </Stack>
    </Box>
  );
}
