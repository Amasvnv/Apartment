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
import { IconEdit, IconHome, IconPlus, IconSearch, IconTrash, IconUsers, IconWallet } from "@tabler/icons-react";
import { useState } from "react";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";
import type { StayStatus, Tenant } from "../data/types";
import { money, num } from "../lib/format";
import { logActivity, syncRoomsFromTenants } from "../lib/dataOps";

const STAY_META: Record<StayStatus, { label: string; color: string }> = {
  resident: { label: "ຢູ່ປະຈຳ", color: "green" },
  away: { label: "ໄປຕ່າງແຂວງ", color: "amber" }
};

const emptyTenant = (): Tenant => ({
  name: "",
  phone: "",
  room: "",
  contract: "ບໍ່ມີສັນຍາ",
  moveIn: "",
  people: 1,
  deposit: 0,
  rent: 1600000,
  stayStatus: "resident"
});

export default function Tenants() {
  const { data, update } = useStore();
  const { canEdit, canDelete } = useAuth();
  const [opened, setOpened] = useState(false);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [form, setForm] = useState<Tenant>(emptyTenant());
  const [query, setQuery] = useState("");

  const tenants = data.tenants.filter(
    (tenant) =>
      !query ||
      tenant.name.toLowerCase().includes(query.toLowerCase()) ||
      String(tenant.room).includes(query) ||
      tenant.phone.includes(query)
  );

  const totalPeople = data.tenants.reduce((sum, tenant) => sum + (tenant.stayStatus === "away" ? 0 : Number(tenant.people) || 1), 0);
  const totalDeposit = data.tenants.reduce((sum, tenant) => sum + (Number(tenant.deposit) || 0), 0);

  const openAdd = () => {
    setEditingRoom(null);
    setForm(emptyTenant());
    setOpened(true);
  };

  const openEdit = (tenant: Tenant) => {
    setEditingRoom(String(tenant.room));
    setForm({ ...tenant });
    setOpened(true);
  };

  const submit = () => {
    if (!form.name.trim() || !form.room) return;
    update((draft) => {
      const index = draft.tenants.findIndex((tenant) => String(tenant.room) === String(editingRoom ?? form.room));
      if (index >= 0) draft.tenants[index] = { ...form, room: String(form.room) };
      else draft.tenants.push({ ...form, room: String(form.room) });
      syncRoomsFromTenants(draft);
      logActivity(draft, "tenants", editingRoom ? "ແກ້ໄຂຜູ້ເຊົ່າ" : "ເພີ່ມຜູ້ເຊົ່າ", `${form.name} · ຫ້ອງ ${form.room}`);
    });
    setOpened(false);
  };

  const remove = (tenant: Tenant) => {
    if (!window.confirm(`ລຶບຜູ້ເຊົ່າ ${tenant.name} ອອກ?`)) return;
    update((draft) => {
      draft.tenants = draft.tenants.filter((item) => String(item.room) !== String(tenant.room));
      syncRoomsFromTenants(draft);
      logActivity(draft, "tenants", "ລຶບຜູ້ເຊົ່າ", tenant.name);
    });
  };

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ທະບຽນຜູ້ເຊົ່າ"
        subtitle="ຂໍ້ມູນຜູ້ເຊົ່າ ສັນຍາ ເງິນມັດຈຳ ແລະ ສະຖານະການພັກອາໄສ"
        actions={
          canEdit("tenants") ? (
            <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>
              ເພີ່ມຜູ້ເຊົ່າ
            </Button>
          ) : null
        }
      />

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <StatCard label="ຜູ້ເຊົ່າທັງໝົດ" value={data.tenants.length} note="ຫ້ອງທີ່ມີສັນຍາ" icon={<IconUsers size={15} />} />
        <StatCard label="ຄົນຢູ່ປະຈຳ" value={totalPeople} note="ບໍ່ນັບຄົນທີ່ໄປຕ່າງແຂວງ" icon={<IconHome size={15} />} tone="green" />
        <StatCard label="ຫ້ອງທີ່ມີຄົນຢູ່" value={data.tenants.filter((t) => t.stayStatus !== "away").length} note={`${num(data.rooms.length)} ຫ້ອງໃນອາຄານ`} icon={<IconUsers size={15} />} tone="cyan" />
        <StatCard label="ເງິນມັດຈຳລວມ" value={money(totalDeposit, data.settings.currency)} note="ລວມທຸກຫ້ອງ" icon={<IconWallet size={15} />} tone="violet" />
      </SimpleGrid>

      <Card padding="lg">
        <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
          <Text fw={600} c="#0B2545">
            ລາຍຊື່ຜູ້ເຊົ່າ
          </Text>
          <TextInput
            placeholder="ຄົ້ນຫາຊື່ / ຫ້ອງ / ເບີໂທ"
            leftSection={<IconSearch size={15} />}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            w={{ base: "100%", sm: 280 }}
            radius="md"
          />
        </Group>

        <Table.ScrollContainer minWidth={900}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ຜູ້ເຊົ່າ</Table.Th>
                <Table.Th>ຫ້ອງ</Table.Th>
                <Table.Th>ເບີໂທ</Table.Th>
                <Table.Th ta="center">ຄົນ</Table.Th>
                <Table.Th ta="right">ຄ່າເຊົ່າ</Table.Th>
                <Table.Th ta="right">ມັດຈຳ</Table.Th>
                <Table.Th>ສັນຍາ</Table.Th>
                <Table.Th>ສະຖານະ</Table.Th>
                <Table.Th ta="right">ຈັດການ</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {tenants.map((tenant) => {
                const meta = STAY_META[tenant.stayStatus] || STAY_META.resident;
                return (
                  <Table.Tr key={tenant.room}>
                    <Table.Td>
                      <Text fw={500}>{tenant.name}</Text>
                      <Text size="xs" c="#8AA0BB">
                        ເຂົ້າຢູ່ {tenant.moveIn || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="brand">
                        {tenant.room}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{tenant.phone || "—"}</Table.Td>
                    <Table.Td ta="center">{tenant.people}</Table.Td>
                    <Table.Td ta="right">{money(tenant.rent, data.settings.currency)}</Table.Td>
                    <Table.Td ta="right">{money(tenant.deposit, data.settings.currency)}</Table.Td>
                    <Table.Td>{tenant.contract}</Table.Td>
                    <Table.Td>
                      <Badge color={meta.color} variant="light">
                        {meta.label}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end">
                        <Tooltip label="ແກ້ໄຂ">
                          <ActionIcon variant="subtle" color="brand" disabled={!canEdit("tenants")} onClick={() => openEdit(tenant)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="ລຶບ">
                          <ActionIcon variant="subtle" color="red" disabled={!canDelete("tenants")} onClick={() => remove(tenant)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {!tenants.length ? (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Text size="sm" c="#7C93B0" ta="center" py="md">
                      ບໍ່ພົບຜູ້ເຊົ່າ
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : null}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal opened={opened} onClose={() => setOpened(false)} title={editingRoom ? `ແກ້ໄຂຜູ້ເຊົ່າ ຫ້ອງ ${editingRoom}` : "ເພີ່ມຜູ້ເຊົ່າ"}>
        <Stack gap="sm">
          <TextInput label="ຊື່ຜູ້ເຊົ່າ" value={form.name} onChange={(event) => setForm({ ...form, name: event.currentTarget.value })} required />
          <Group grow>
            <Select
              label="ຫ້ອງ"
              data={data.rooms.map((room) => room.no)}
              value={form.room || null}
              onChange={(value) => setForm({ ...form, room: value || "" })}
              searchable
              required
            />
            <TextInput label="ເບີໂທ" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.currentTarget.value })} />
          </Group>
          <Group grow>
            <NumberInput label="ຈຳນວນຄົນ" value={form.people} onChange={(value) => setForm({ ...form, people: Number(value) || 1 })} min={1} max={20} />
            <TextInput label="ວັນເຂົ້າຢູ່" value={form.moveIn} onChange={(event) => setForm({ ...form, moveIn: event.currentTarget.value })} placeholder="01 ມ.ກ. 26" />
          </Group>
          <Group grow>
            <NumberInput
              label="ຄ່າເຊົ່າ (₭)"
              value={form.rent}
              onChange={(value) => setForm({ ...form, rent: Number(value) || 0 })}
              min={0}
              thousandSeparator=","
            />
            <NumberInput
              label="ເງິນມັດຈຳ (₭)"
              value={form.deposit}
              onChange={(value) => setForm({ ...form, deposit: Number(value) || 0 })}
              min={0}
              thousandSeparator=","
            />
          </Group>
          <Group grow>
            <Select
              label="ສັນຍາ"
              data={["1 ປີ", "6 ເດືອນ", "ບໍ່ມີສັນຍາ"]}
              value={form.contract}
              onChange={(value) => setForm({ ...form, contract: value || "ບໍ່ມີສັນຍາ" })}
            />
            <Select
              label="ສະຖານະ"
              data={Object.entries(STAY_META).map(([value, meta]) => ({ value, label: meta.label }))}
              value={form.stayStatus}
              onChange={(value) => setForm({ ...form, stayStatus: (value as StayStatus) || "resident" })}
            />
          </Group>
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setOpened(false)}>
              ຍົກເລີກ
            </Button>
            <Button onClick={submit} disabled={!form.name.trim() || !form.room}>
              ບັນທຶກ
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
