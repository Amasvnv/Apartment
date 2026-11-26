import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip
} from "@mantine/core";
import { IconAlertTriangle, IconChecklist, IconEdit, IconPlus, IconSearch, IconTools, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";
import type { Repair, RepairCategory, RepairPriority, RepairStatus } from "../data/types";
import { logActivity } from "../lib/dataOps";
import { money } from "../lib/format";

const CATEGORIES: Record<RepairCategory, { label: string; color: string }> = {
  electric: { label: "ໄຟຟ້າ", color: "amber" },
  water: { label: "ນ້ຳປະປາ", color: "cyan" },
  furniture: { label: "ເຟີນິເຈີ", color: "violet" },
  aircon: { label: "ແອເຢັນ", color: "blue" },
  building: { label: "ໂຄງສ້າງ", color: "gray" },
  other: { label: "ອື່ນໆ", color: "gray" }
};

const PRIORITIES: Record<RepairPriority, { label: string; color: string }> = {
  low: { label: "ຕ່ຳ", color: "gray" },
  normal: { label: "ປານກາງ", color: "blue" },
  high: { label: "ສູງ", color: "orange" },
  urgent: { label: "ຮີບດ່ວນ", color: "red" }
};

const STATUSES: Record<RepairStatus, { label: string; color: string }> = {
  open: { label: "ລໍຖ້າ", color: "gray" },
  in_progress: { label: "ກຳລັງຊ່ອມ", color: "blue" },
  done: { label: "ສຳເລັດ", color: "green" },
  cancelled: { label: "ຍົກເລີກ", color: "red" }
};

const emptyRepair = (): Repair => ({
  id: "",
  room: "",
  title: "",
  category: "other",
  priority: "normal",
  status: "open",
  assignee: "",
  phone: "",
  cost: 0,
  reported: new Date().toISOString().slice(0, 10),
  due: "",
  done: "",
  note: ""
});

export default function Repairs() {
  const { data, update } = useStore();
  const { canEdit, canDelete } = useAuth();
  const [opened, setOpened] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Repair>(emptyRepair());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const list = useMemo(() => {
    const sorted = [...data.repairs].sort((a, b) => String(b.reported).localeCompare(String(a.reported)));
    return sorted.filter(
      (item) =>
        (!statusFilter || item.status === statusFilter) &&
        (!query || item.title.toLowerCase().includes(query.toLowerCase()) || String(item.room).includes(query))
    );
  }, [data.repairs, query, statusFilter]);

  const openCount = data.repairs.filter((item) => item.status === "open").length;
  const progressCount = data.repairs.filter((item) => item.status === "in_progress").length;
  const totalCost = data.repairs.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyRepair(), id: `RP-${Date.now().toString().slice(-8)}` });
    setOpened(true);
  };

  const openEdit = (repair: Repair) => {
    setEditingId(repair.id);
    setForm({ ...repair });
    setOpened(true);
  };

  const submit = () => {
    if (!form.title.trim()) return;
    update((draft) => {
      const index = draft.repairs.findIndex((item) => item.id === (editingId ?? form.id));
      const next: Repair = { ...form, room: String(form.room || "") };
      if (index >= 0) draft.repairs[index] = next;
      else draft.repairs.push(next);
      logActivity(draft, "repairs", editingId ? "ແກ້ໄຂວຽກສ້ອມ" : "ເພີ່ມວຽກສ້ອມ", `${next.title} · ຫ້ອງ ${next.room || "—"}`);
    });
    setOpened(false);
  };

  const remove = (repair: Repair) => {
    if (!window.confirm(`ລຶບວຽກ ${repair.title} ອອກ?`)) return;
    update((draft) => {
      draft.repairs = draft.repairs.filter((item) => item.id !== repair.id);
      logActivity(draft, "repairs", "ລຶບວຽກສ້ອມ", repair.title);
    });
  };

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ຈັດການວຽກສ້ອມແປງ"
        subtitle="ແຈ້ງຊ່ອມ ຄວາມສຳຄັນ ຜູ້ຮັບຜິດຊອບ ແລະ ຄ່າໃຊ້ຈ່າຍ"
        actions={
          canEdit("repairs") ? (
            <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>
              ແຈ້ງຊ່ອມໃໝ່
            </Button>
          ) : null
        }
      />

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <StatCard label="ລໍຖ້າດຳເນີນການ" value={openCount} note="ຍັງບໍ່ເລີ່ມ" icon={<IconChecklist size={15} />} tone="amber" />
        <StatCard label="ກຳລັງຊ່ອມ" value={progressCount} note="ຢູ່ລະຫວ່າງດຳເນີນການ" icon={<IconTools size={15} />} />
        <StatCard label="ສຳເລັດ" value={data.repairs.filter((item) => item.status === "done").length} note="ປິດງານແລ້ວ" icon={<IconChecklist size={15} />} tone="green" />
        <StatCard label="ຄ່າໃຊ້ຈ່າຍລວມ" value={money(totalCost, data.settings.currency)} note="ບໍ່ນັບວຽກທີ່ຍົກເລີກ" icon={<IconAlertTriangle size={15} />} tone="red" />
      </SimpleGrid>

      <Card padding="lg">
        <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
          <Group gap="sm">
            <Text fw={600} c="#0B2545">
              ລາຍການສ້ອມແປງ
            </Text>
            <Badge variant="light">{data.repairs.length}</Badge>
          </Group>
          <Group gap="sm" wrap="wrap">
            <Select
              placeholder="ທຸກສະຖານະ"
              data={Object.entries(STATUSES).map(([value, meta]) => ({ value, label: meta.label }))}
              value={statusFilter}
              onChange={setStatusFilter}
              clearable
              w={150}
            />
            <TextInput
              placeholder="ຄົ້ນຫາວຽກ / ຫ້ອງ"
              leftSection={<IconSearch size={15} />}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              w={{ base: "100%", sm: 220 }}
            />
          </Group>
        </Group>

        <Table.ScrollContainer minWidth={960}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ວຽກ</Table.Th>
                <Table.Th>ຫ້ອງ</Table.Th>
                <Table.Th>ໝວດ</Table.Th>
                <Table.Th>ຄວາມສຳຄັນ</Table.Th>
                <Table.Th>ສະຖານະ</Table.Th>
                <Table.Th>ຜູ້ຮັບຜິດຊອບ</Table.Th>
                <Table.Th ta="right">ຄ່າໃຊ້ຈ່າຍ</Table.Th>
                <Table.Th ta="right">ຈັດການ</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {list.map((repair) => {
                const category = CATEGORIES[repair.category] || CATEGORIES.other;
                const priority = PRIORITIES[repair.priority] || PRIORITIES.normal;
                const status = STATUSES[repair.status] || STATUSES.open;
                return (
                  <Table.Tr key={repair.id}>
                    <Table.Td>
                      <Text fw={500}>{repair.title}</Text>
                      <Text size="xs" c="#8AA0BB">
                        {repair.reported || "—"} {repair.due ? `· ກຳນົດ ${repair.due}` : ""}
                      </Text>
                    </Table.Td>
                    <Table.Td>{repair.room || "—"}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={category.color}>
                        {category.label}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="dot" color={priority.color}>
                        {priority.label}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={status.color}>
                        {status.label}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{repair.assignee || "—"}</Table.Td>
                    <Table.Td ta="right">{money(repair.cost, data.settings.currency)}</Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end">
                        <Tooltip label="ແກ້ໄຂ">
                          <ActionIcon variant="subtle" color="brand" disabled={!canEdit("repairs")} onClick={() => openEdit(repair)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="ລຶບ">
                          <ActionIcon variant="subtle" color="red" disabled={!canDelete("repairs")} onClick={() => remove(repair)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {!list.length ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text size="sm" c="#7C93B0" ta="center" py="md">
                      ບໍ່ພົບວຽກສ້ອມແປງ
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal opened={opened} onClose={() => setOpened(false)} title={editingId ? "ແກ້ໄຂວຽກສ້ອມ" : "ແຈ້ງຊ່ອມໃໝ່"} size="lg">
        <Stack gap="sm">
          <TextInput label="ຫົວຂໍ້ວຽກ" value={form.title} onChange={(event) => setForm({ ...form, title: event.currentTarget.value })} required />
          <Group grow>
            <Select
              label="ຫ້ອງ"
              data={data.rooms.map((room) => room.no)}
              value={form.room || null}
              onChange={(value) => setForm({ ...form, room: value || "" })}
              searchable
            />
            <Select
              label="ໝວດ"
              data={Object.entries(CATEGORIES).map(([value, meta]) => ({ value, label: meta.label }))}
              value={form.category}
              onChange={(value) => setForm({ ...form, category: (value as RepairCategory) || "other" })}
            />
          </Group>
          <Group grow>
            <Select
              label="ຄວາມສຳຄັນ"
              data={Object.entries(PRIORITIES).map(([value, meta]) => ({ value, label: meta.label }))}
              value={form.priority}
              onChange={(value) => setForm({ ...form, priority: (value as RepairPriority) || "normal" })}
            />
            <Select
              label="ສະຖານະ"
              data={Object.entries(STATUSES).map(([value, meta]) => ({ value, label: meta.label }))}
              value={form.status}
              onChange={(value) => setForm({ ...form, status: (value as RepairStatus) || "open" })}
            />
          </Group>
          <Group grow>
            <TextInput label="ຜູ້ຮັບຜິດຊອບ" value={form.assignee} onChange={(event) => setForm({ ...form, assignee: event.currentTarget.value })} />
            <TextInput label="ເບີໂທ" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.currentTarget.value })} />
          </Group>
          <Group grow>
            <TextInput label="ວັນແຈ້ງ" value={form.reported} onChange={(event) => setForm({ ...form, reported: event.currentTarget.value })} placeholder="2026-11-02" />
            <TextInput label="ກຳນົດສຳເລັດ" value={form.due} onChange={(event) => setForm({ ...form, due: event.currentTarget.value })} placeholder="2026-11-06" />
          </Group>
          <Group grow>
            <NumberInput
              label="ຄ່າໃຊ້ຈ່າຍ (₭)"
              value={form.cost}
              onChange={(value) => setForm({ ...form, cost: Number(value) || 0 })}
              min={0}
              thousandSeparator=","
            />
            <TextInput label="ວັນສຳເລັດ" value={form.done} onChange={(event) => setForm({ ...form, done: event.currentTarget.value })} placeholder="2026-11-05" />
          </Group>
          <TextInput
            label="ໝາຍເຫດ"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.currentTarget.value })}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setOpened(false)}>
              ຍົກເລີກ
            </Button>
            <Button onClick={submit} disabled={!form.title.trim()}>
              ບັນທຶກ
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
