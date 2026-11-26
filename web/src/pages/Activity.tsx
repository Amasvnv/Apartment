import { Badge, Card, Group, Select, Stack, Text, Timeline, ThemeIcon } from "@mantine/core";
import {
  IconBolt,
  IconBuilding,
  IconHistory,
  IconReceipt2,
  IconSettings,
  IconTools,
  IconUsers
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import { useStore } from "../data/store";

const KIND_META: Record<string, { label: string; color: string; icon: typeof IconHistory }> = {
  rooms: { label: "ຫ້ອງພັກ", color: "brand", icon: IconBuilding },
  tenants: { label: "ຜູ້ເຊົ່າ", color: "violet", icon: IconUsers },
  meter: { label: "ຈົດມິເຕີ", color: "amber", icon: IconBolt },
  invoices: { label: "ໃບບີນ", color: "cyan", icon: IconReceipt2 },
  repairs: { label: "ສ້ອມແປງ", color: "red", icon: IconTools },
  settings: { label: "ຕັ້ງຄ່າ", color: "gray", icon: IconSettings },
  users: { label: "ຜູ້ໃຊ້", color: "brand", icon: IconUsers }
};

const formatTime = (value: number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export default function Activity() {
  const { data } = useStore();
  const [kind, setKind] = useState<string | null>(null);

  const items = useMemo(() => {
    const list = Array.isArray(data.settings.activity) ? data.settings.activity : [];
    return list
      .filter((item) => !kind || item.kind === kind)
      .sort((a, b) => Number(b.t) - Number(a.t))
      .slice(0, 200);
  }, [data.settings.activity, kind]);

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ການເຄື່ອນໄຫວ"
        subtitle="ບັນທຶກການແກ້ໄຂຂໍ້ມູນລ່າສຸດ"
        actions={
          <Select
            placeholder="ທຸກປະເພດ"
            data={Object.entries(KIND_META).map(([value, meta]) => ({ value, label: meta.label }))}
            value={kind}
            onChange={setKind}
            clearable
            w={170}
          />
        }
      />

      <Card padding="lg">
        {items.length ? (
          <Timeline bulletSize={30} lineWidth={1.5} color="brand">
            {items.map((item, index) => {
              const meta = KIND_META[item.kind] || KIND_META.settings;
              const Icon = meta.icon;
              return (
                <Timeline.Item
                  key={`${item.t}-${index}`}
                  bullet={
                    <ThemeIcon size={28} radius="xl" variant="light" color={meta.color}>
                      <Icon size={15} />
                    </ThemeIcon>
                  }
                  title={
                    <Group gap={8} wrap="nowrap">
                      <Text fw={500} size="sm">
                        {item.title}
                      </Text>
                      <Badge size="xs" variant="light" color={meta.color}>
                        {meta.label}
                      </Badge>
                    </Group>
                  }
                >
                  <Text size="xs" c="#5A7391">
                    {item.detail}
                  </Text>
                  <Text size="xs" c="#9AAEC6" mt={2}>
                    {formatTime(Number(item.t))}
                  </Text>
                </Timeline.Item>
              );
            })}
          </Timeline>
        ) : (
          <Text size="sm" c="#7C93B0" ta="center" py="xl">
            ຍັງບໍ່ມີການເຄື່ອນໄຫວ
          </Text>
        )}
      </Card>
    </Stack>
  );
}
