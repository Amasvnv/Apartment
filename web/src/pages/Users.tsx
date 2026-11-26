import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Tooltip
} from "@mantine/core";
import { IconEdit, IconPlus, IconTrash, IconUserShield } from "@tabler/icons-react";
import { useState } from "react";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";
import type { AptUser, PermAction, UserRole } from "../data/types";
import { logActivity } from "../lib/dataOps";

const ROLES: Record<UserRole, string> = {
  manager: "ຜູ້ຈັດການ",
  tech: "ຊ່າງ",
  staff: "ພະນັກງານ",
  viewer: "ຜູ້ເບິ່ງ"
};

const PAGES = [
  { key: "overview", label: "ພາບລວມ" },
  { key: "meter", label: "ຈົດມິເຕີ" },
  { key: "rooms", label: "ຫ້ອງພັກ" },
  { key: "tenants", label: "ຜູ້ເຊົ່າ" },
  { key: "invoices", label: "ໃບບີນເກັບເງິນ" },
  { key: "repairs", label: "ສ້ອມແປງ" },
  { key: "settings", label: "ຕັ້ງຄ່າ" },
  { key: "users", label: "ຜູ້ໃຊ້" }
];

const ACTIONS: { key: PermAction; label: string }[] = [
  { key: "view", label: "ເບິ່ງ" },
  { key: "edit", label: "ແກ້ໄຂ" },
  { key: "delete", label: "ລຶບ" }
];

const emptyUser = (): AptUser => ({
  id: "",
  name: "",
  phone: "",
  role: "staff",
  pin: "",
  active: true,
  perms: {}
});

export default function Users() {
  const { data, update } = useStore();
  const { user: me, canEdit, canDelete } = useAuth();
  const [opened, setOpened] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AptUser>(emptyUser());

  const users = data.settings.users || [];

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyUser(), id: `U-${String(Date.now()).slice(-5)}` });
    setOpened(true);
  };

  const openEdit = (target: AptUser) => {
    setEditingId(target.id);
    setForm({ ...target, perms: JSON.parse(JSON.stringify(target.perms || {})) });
    setOpened(true);
  };

  const togglePerm = (page: string, action: PermAction, checked: boolean) => {
    const current = new Set(form.perms?.[page] || []);
    if (checked) current.add(action);
    else current.delete(action);
    setForm({ ...form, perms: { ...form.perms, [page]: [...current] } });
  };

  const submit = () => {
    if (!form.name.trim()) return;
    update((draft) => {
      if (!draft.settings.users) draft.settings.users = [];
      const index = draft.settings.users.findIndex((item) => item.id === (editingId ?? form.id));
      const next: AptUser = { ...form, name: form.name.trim() };
      if (index >= 0) draft.settings.users[index] = next;
      else draft.settings.users.push(next);
      logActivity(draft, "users", editingId ? "ແກ້ໄຂຜູ້ໃຊ້" : "ເພີ່ມຜູ້ໃຊ້", `${next.name} · ${ROLES[next.role]}`);
    });
    setOpened(false);
  };

  const remove = (target: AptUser) => {
    if (target.id === me?.id) return;
    if (!window.confirm(`ລຶບຜູ້ໃຊ້ ${target.name} ອອກ?`)) return;
    update((draft) => {
      draft.settings.users = (draft.settings.users || []).filter((item) => item.id !== target.id);
      logActivity(draft, "users", "ລຶບຜູ້ໃຊ້", target.name);
    });
  };

  const toggleActive = (target: AptUser) => {
    if (target.id === me?.id) return;
    update((draft) => {
      const found = (draft.settings.users || []).find((item) => item.id === target.id);
      if (found) found.active = !found.active;
      logActivity(draft, "users", found?.active ? "ເປີດໃຊ້ຜູ້ໃຊ້" : "ປິດໃຊ້ຜູ້ໃຊ້", target.name);
    });
  };

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ຜູ້ໃຊ້"
        subtitle="ບັນຊີຜູ້ໃຊ້ ບົດບາດ ແລະ ສິດເຂົ້າເຖິງແຕ່ລະໜ້າ"
        actions={
          canEdit("users") ? (
            <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>
              ເພີ່ມຜູ້ໃຊ້
            </Button>
          ) : null
        }
      />

      <Card padding="lg">
        <Group justify="space-between" mb="md">
          <Text fw={600}>ຜູ້ໃຊ້ໃນລະບົບ</Text>
          <Badge variant="light">{users.length} ບັນຊີ</Badge>
        </Group>

        <Table.ScrollContainer minWidth={760}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ຊື່</Table.Th>
                <Table.Th>ເບີໂທ</Table.Th>
                <Table.Th>ບົດບາດ</Table.Th>
                <Table.Th ta="center">ສິດ</Table.Th>
                <Table.Th ta="center">ເປີດໃຊ້</Table.Th>
                <Table.Th ta="right">ຈັດການ</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((entry) => (
                <Table.Tr key={entry.id}>
                  <Table.Td>
                    <Text fw={500}>{entry.name}</Text>
                    <Text size="xs" c="#8AA0BB">
                      {entry.pin ? `PIN ••••` : "ຍັງບໍ່ມີ PIN"}
                    </Text>
                  </Table.Td>
                  <Table.Td>{entry.phone || "—"}</Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={entry.role === "manager" ? "brand" : entry.role === "viewer" ? "gray" : "cyan"}>
                      {ROLES[entry.role] || entry.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta="center">
                    <Group gap={4} justify="center">
                      {entry.role === "manager" ? (
                        <Text size="xs" c="#5A7391">
                          ທຸກໜ້າ
                        </Text>
                      ) : (
                        Object.entries(entry.perms || {})
                          .filter(([, actions]) => actions?.length)
                          .slice(0, 4)
                          .map(([page, actions]) => (
                            <Badge key={page} size="xs" variant="dot" color="brand">
                              {PAGES.find((item) => item.key === page)?.label || page}
                              {actions?.includes("edit") ? " · ແກ້ໄຂ" : ""}
                            </Badge>
                          ))
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td ta="center">
                    <Switch
                      checked={entry.active !== false}
                      onChange={() => toggleActive(entry)}
                      disabled={entry.id === me?.id || !canEdit("users")}
                      size="sm"
                    />
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="flex-end">
                      <Tooltip label="ແກ້ໄຂ">
                        <ActionIcon variant="subtle" color="brand" disabled={!canEdit("users")} onClick={() => openEdit(entry)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label={entry.id === me?.id ? "ລຶບບັນຊີຕົນເອງບໍ່ໄດ້" : "ລຶບ"}>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          disabled={entry.id === me?.id || !canDelete("users")}
                          onClick={() => remove(entry)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Modal opened={opened} onClose={() => setOpened(false)} title={editingId ? "ແກ້ໄຂຜູ້ໃຊ້" : "ເພີ່ມຜູ້ໃຊ້"} size="lg">
        <Stack gap="sm">
          <Group grow>
            <TextInput label="ຊື່" value={form.name} onChange={(event) => setForm({ ...form, name: event.currentTarget.value })} required />
            <TextInput label="ເບີໂທ" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.currentTarget.value })} />
          </Group>
          <Group grow>
            <Select
              label="ບົດບາດ"
              data={Object.entries(ROLES).map(([value, label]) => ({ value, label }))}
              value={form.role}
              onChange={(value) => setForm({ ...form, role: (value as UserRole) || "staff" })}
            />
            <TextInput
              label="PIN (4–6 ໂຕເລກ)"
              value={form.pin}
              onChange={(event) => setForm({ ...form, pin: event.currentTarget.value.replace(/\D/g, "").slice(0, 6) })}
              inputMode="numeric"
            />
          </Group>
          <Group>
            <Switch
              label="ເປີດໃຊ້ບັນຊີ"
              checked={form.active !== false}
              onChange={(event) => setForm({ ...form, active: event.currentTarget.checked })}
            />
          </Group>

          <Group gap={6}>
            <IconUserShield size={15} color="#5A7391" />
            <Text size="sm" fw={600}>
              ສິດເຂົ້າເຖິງ
            </Text>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            {PAGES.map((page) => (
              <Card key={page.key} withBorder radius="md" padding="xs">
                <Text size="xs" fw={500} mb={4}>
                  {page.label}
                </Text>
                <Group gap="sm">
                  {ACTIONS.map((action) => (
                    <Checkbox
                      key={action.key}
                      label={action.label}
                      checked={(form.perms?.[page.key] || []).includes(action.key)}
                      onChange={(event) => togglePerm(page.key, action.key, event.currentTarget.checked)}
                      size="xs"
                    />
                  ))}
                </Group>
              </Card>
            ))}
          </SimpleGrid>

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setOpened(false)}>
              ຍົກເລີກ
            </Button>
            <Button onClick={submit} disabled={!form.name.trim()}>
              ບັນທຶກ
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
