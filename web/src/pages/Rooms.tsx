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
import { IconBuilding, IconDoorEnter, IconDoorOff, IconEdit, IconPlus, IconSearch, IconTools, IconTrash } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";
import type { Room, RoomStatus } from "../data/types";
import { sortRoomsByNo } from "../lib/compute";
import { logActivity } from "../lib/dataOps";
import { money } from "../lib/format";

const STATUS_META: Record<RoomStatus, { label: string; color: string }> = {
  occupied: { label: "ມີຜູ້ເຊົ່າ", color: "green" },
  vacant: { label: "ຫ້ອງວ່າງ", color: "gray" },
  repair: { label: "ປິດຊ່ອມ", color: "amber" }
};

const emptyRoom = (): Room => ({
  no: "",
  floor: 1,
  type: "1 ຫ້ອງນອນ",
  rent: 1600000,
  status: "vacant",
  tenant: null,
  phone: null,
  meterElec: 0,
  meterWater: 0
});

export default function Rooms() {
  const { data, update } = useStore();
  const { canEdit, canDelete } = useAuth();
  const [opened, setOpened] = useState(false);
  const [editingNo, setEditingNo] = useState<string | null>(null);
  const [form, setForm] = useState<Room>(emptyRoom());
  const [query, setQuery] = useState("");

  const rows = useMemo(() => sortRoomsByNo(data.rooms), [data.rooms]);
  const filtered = rows.filter(
    (room) =>
      !query ||
      room.no.includes(query) ||
      String(room.tenant || "").toLowerCase().includes(query.toLowerCase()) ||
      String(room.phone || "").includes(query)
  );

  const counts = {
    occupied: data.rooms.filter((room) => room.status === "occupied").length,
    vacant: data.rooms.filter((room) => room.status === "vacant").length,
    repair: data.rooms.filter((room) => room.status === "repair").length
  };

  const openAdd = () => {
    setEditingNo(null);
    setForm(emptyRoom());
    setOpened(true);
  };

  const openEdit = (room: Room) => {
    setEditingNo(room.no);
    setForm({ ...room });
    setOpened(true);
  };

  const submit = () => {
    if (!form.no.trim()) return;
    update((draft) => {
      const index = draft.rooms.findIndex((room) => room.no === (editingNo ?? form.no));
      const tenant = draft.tenants.find((item) => String(item.room) === String(form.no));
      const next: Room = {
        ...form,
        no: form.no.trim(),
        tenant: tenant?.name ?? form.tenant ?? null,
        phone: tenant?.phone ?? form.phone ?? null
      };
      if (index >= 0) draft.rooms[index] = next;
      else draft.rooms.push(next);
      logActivity(draft, "rooms", editingNo ? "ແກ້ໄຂຫ້ອງ" : "ເພີ່ມຫ້ອງ", `ຫ້ອງ ${next.no}`);
    });
    setOpened(false);
  };

  const remove = (room: Room) => {
    if (!window.confirm(`ລຶບຫ້ອງ ${room.no} ອອກ?`)) return;
    update((draft) => {
      draft.rooms = draft.rooms.filter((item) => item.no !== room.no);
      draft.tenants = draft.tenants.filter((item) => String(item.room) !== String(room.no));
      logActivity(draft, "rooms", "ລຶບຫ້ອງ", `ຫ້ອງ ${room.no}`);
    });
  };

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ຈັດການຫ້ອງພັກ"
        subtitle="ສະຖານະຫ້ອງ ຜູ້ເຊົ່າ ແລະ ເລກມິເຕີລ່າສຸດ"
        actions={
          canEdit("rooms") ? (
            <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>
              ເພີ່ມຫ້ອງ
            </Button>
          ) : null
        }
      />

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <StatCard label="ຫ້ອງທັງໝົດ" value={data.rooms.length} note="ລວມທຸກຊັ້ນ" icon={<IconBuilding size={15} />} />
        <StatCard label="ມີຜູ້ເຊົ່າ" value={counts.occupied} note="ຫ້ອງທີ່ມີສັນຍາ" icon={<IconDoorEnter size={15} />} tone="green" />
        <StatCard label="ຫ້ອງວ່າງ" value={counts.vacant} note="ພ້ອມໃຫ້ເຊົ່າ" icon={<IconDoorOff size={15} />} tone="violet" />
        <StatCard label="ປິດຊ່ອມ" value={counts.repair} note="ກຳລັງສ້ອມແປງ" icon={<IconTools size={15} />} tone="amber" />
      </SimpleGrid>

      <Card padding="lg">
        <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
          <Text fw={600} c="#0B2545">
            ລາຍການຫ້ອງພັກ
          </Text>
          <TextInput
            placeholder="ຄົ້ນຫາເລກຫ້ອງ / ຜູ້ເຊົ່າ"
            leftSection={<IconSearch size={15} />}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            w={{ base: "100%", sm: 260 }}
            radius="md"
          />
        </Group>

        <Table.ScrollContainer minWidth={860}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ຫ້ອງ</Table.Th>
                <Table.Th>ຊັ້ນ</Table.Th>
                <Table.Th>ປະເພດ</Table.Th>
                <Table.Th>ຜູ້ເຊົ່າ</Table.Th>
                <Table.Th>ເບີໂທ</Table.Th>
                <Table.Th ta="right">ຄ່າເຊົ່າ</Table.Th>
                <Table.Th>ສະຖານະ</Table.Th>
                <Table.Th ta="right">ຈັດການ</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((room) => {
                const meta = STATUS_META[room.status] || STATUS_META.vacant;
                return (
                  <Table.Tr key={room.no}>
                    <Table.Td>
                      <Text fw={600} c="#1B6FD6">
                        {room.no}
                      </Text>
                    </Table.Td>
                    <Table.Td>{room.floor}</Table.Td>
                    <Table.Td>{room.type}</Table.Td>
                    <Table.Td>{room.tenant || <Text c="#9AAEC6">—</Text>}</Table.Td>
                    <Table.Td>{room.phone || "—"}</Table.Td>
                    <Table.Td ta="right">{money(room.rent, data.settings.currency)}</Table.Td>
                    <Table.Td>
                      <Badge color={meta.color} variant="light">
                        {meta.label}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end">
                        <Tooltip label="ແກ້ໄຂ">
                          <ActionIcon variant="subtle" color="brand" disabled={!canEdit("rooms")} onClick={() => openEdit(room)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="ລຶບ">
                          <ActionIcon variant="subtle" color="red" disabled={!canDelete("rooms")} onClick={() => remove(room)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {!filtered.length ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text size="sm" c="#7C93B0" ta="center" py="md">
                      ບໍ່ພົບຫ້ອງທີ່ຄົ້ນຫາ
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal opened={opened} onClose={() => setOpened(false)} title={editingNo ? `ແກ້ໄຂຫ້ອງ ${editingNo}` : "ເພີ່ມຫ້ອງໃໝ່"}>
        <Stack gap="sm">
          <TextInput
            label="ເລກຫ້ອງ"
            value={form.no}
            onChange={(event) => setForm({ ...form, no: event.currentTarget.value })}
            required
          />
          <Group grow>
            <NumberInput
              label="ຊັ້ນ"
              value={form.floor}
              onChange={(value) => setForm({ ...form, floor: Number(value) || 1 })}
              min={1}
              max={50}
            />
            <Select
              label="ປະເພດ"
              data={["1 ຫ້ອງນອນ", "2 ຫ້ອງນອນ"]}
              value={form.type}
              onChange={(value) => setForm({ ...form, type: value || "1 ຫ້ອງນອນ" })}
            />
          </Group>
          <NumberInput
            label="ຄ່າເຊົ່າ (₭/ເດືອນ)"
            value={form.rent}
            onChange={(value) => setForm({ ...form, rent: Number(value) || 0 })}
            min={0}
            thousandSeparator=","
          />
          <Select
            label="ສະຖານະ"
            data={Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))}
            value={form.status}
            onChange={(value) => setForm({ ...form, status: (value as RoomStatus) || "vacant" })}
          />
          <Group grow>
            <NumberInput
              label="ມິເຕີໄຟຟ້າ"
              value={form.meterElec}
              onChange={(value) => setForm({ ...form, meterElec: Number(value) || 0 })}
              min={0}
            />
            <NumberInput
              label="ມິເຕີນ້ຳ"
              value={form.meterWater}
              onChange={(value) => setForm({ ...form, meterWater: Number(value) || 0 })}
              min={0}
            />
          </Group>
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setOpened(false)}>
              ຍົກເລີກ
            </Button>
            <Button onClick={submit} disabled={!form.no.trim()}>
              ບັນທຶກ
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
