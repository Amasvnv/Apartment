import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip
} from "@mantine/core";
import {
  IconBolt,
  IconBuilding,
  IconEdit,
  IconEye,
  IconLayoutDashboard,
  IconLock,
  IconPencil,
  IconPhone,
  IconPlus,
  IconReceipt2,
  IconSettings,
  IconShieldCheck,
  IconTools,
  IconTrash,
  IconUser,
  IconUserOff,
  IconUserShield,
  IconUsers,
  IconUserStar
} from "@tabler/icons-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import PageHeader from "../components/PageHeader";
import CardArt, { type CardArtKind } from "../components/ui/CardArt";
import ConfirmDialog, { type ConfirmState } from "../components/ui/ConfirmDialog";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";
import type { AptUser, PermAction, UserRole } from "../data/types";
import { logActivity } from "../lib/dataOps";
import { notifyStatus } from "../lib/notify";

const ROLES: Record<UserRole, string> = {
  manager: "ຜູ້ຈັດການ",
  tech: "ຊ່າງ",
  staff: "ພະນັກງານ",
  viewer: "ຜູ້ເບິ່ງ"
};

const ROLE_TONE: Record<UserRole, string> = {
  manager: "#1b6fd6",
  tech: "#8b5cf6",
  staff: "#06b6d4",
  viewer: "#64748b"
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

const PAGE_ICON: Record<string, typeof IconUsers> = {
  overview: IconLayoutDashboard,
  meter: IconBolt,
  rooms: IconBuilding,
  tenants: IconUsers,
  invoices: IconReceipt2,
  repairs: IconTools,
  settings: IconSettings,
  users: IconUserShield
};

const ACTION_ICON: Record<PermAction, typeof IconEye> = {
  view: IconEye,
  edit: IconPencil,
  delete: IconTrash
};

const GRADIENTS = {
  blue:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #0a5fd0 0%, #2563eb 55%, #7cbcff 100%)",
  green:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #0e7c5a 0%, #12a06a 52%, #43cf9b 100%)",
  slate:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.3), transparent 62%), linear-gradient(142deg, #44546b 0%, #64748b 55%, #a5b6c9 100%)",
  violet:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.34), transparent 62%), linear-gradient(142deg, #6d28d9 0%, #8b5cf6 52%, #d8b4fe 100%)"
} as const;

const emptyUser = (): AptUser => ({
  id: "",
  name: "",
  phone: "",
  role: "staff",
  pin: "",
  active: true,
  perms: {}
});

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("") || "?";

export default function Users() {
  const { data, commit } = useStore();
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

  const togglePage = (page: string) => {
    const granted = form.perms?.[page] || [];
    const all = ACTIONS.every((action) => granted.includes(action.key));
    setForm({
      ...form,
      perms: { ...form.perms, [page]: all ? [] : ACTIONS.map((action) => action.key) }
    });
  };

  const [savingForm, setSavingForm] = useState(false);
  const [pending, setPending] = useState<AptUser | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>("idle");
  const [confirmError, setConfirmError] = useState("");

  const submit = async () => {
    if (!form.name.trim()) return;
    setSavingForm(true);
    const ok = await commit((draft) => {
      if (!draft.settings.users) draft.settings.users = [];
      const index = draft.settings.users.findIndex((item) => item.id === (editingId ?? form.id));
      const next: AptUser = { ...form, name: form.name.trim() };
      if (index >= 0) draft.settings.users[index] = next;
      else draft.settings.users.push(next);
      logActivity(draft, "users", editingId ? "ແກ້ໄຂຜູ້ໃຊ້" : "ເພີ່ມຜູ້ໃຊ້", `${next.name} · ${ROLES[next.role]}`);
    });
    setSavingForm(false);
    setOpened(false);
    notifyStatus(
      ok ? "success" : "danger",
      ok ? (editingId ? "ແກ້ໄຂຜູ້ໃຊ້ສຳເລັດ" : "ເພີ່ມຜູ້ໃຊ້ສຳເລັດ") : "ບັນທຶກບໍ່ສຳເລັດ",
      `${form.name.trim()} · ${ROLES[form.role]}`
    );
  };

  const remove = (target: AptUser) => {
    if (target.id === me?.id) return;
    setPending(target);
    setConfirmState("idle");
    setConfirmError("");
  };

  const confirmRemove = async () => {
    if (!pending) return;
    setConfirmState("busy");
    const ok = await commit((draft) => {
      draft.settings.users = (draft.settings.users || []).filter((item) => item.id !== pending.id);
      logActivity(draft, "users", "ລຶບຜູ້ໃຊ້", pending.name);
    });
    if (!ok) {
      setConfirmState("error");
      setConfirmError("ບັນທຶກການລຶບບໍ່ສຳເລັດ — ກະລຸນາລອງໃໝ່");
      return;
    }
    setConfirmState("done");
    notifyStatus("success", "ລຶບຜູ້ໃຊ້ສຳເລັດ", pending.name);
    window.setTimeout(() => {
      setPending(null);
      setConfirmState("idle");
    }, 450);
  };

  const toggleActive = async (target: AptUser) => {
    if (target.id === me?.id) return;
    const ok = await commit((draft) => {
      const found = (draft.settings.users || []).find((item) => item.id === target.id);
      if (found) found.active = !found.active;
      logActivity(draft, "users", found?.active ? "ເປີດໃຊ້ຜູ້ໃຊ້" : "ປິດໃຊ້ຜູ້ໃຊ້", target.name);
    });
    notifyStatus(
      ok ? "success" : "danger",
      ok ? (target.active === false ? "ເປີດໃຊ້ບັນຊີແລ້ວ" : "ປິດໃຊ້ບັນຊີແລ້ວ") : "ບັນທຶກບໍ່ສຳເລັດ",
      target.name
    );
  };

  const activeCount = users.filter((entry) => entry.active !== false).length;
  const managerCount = users.filter((entry) => entry.role === "manager").length;

  const tiles: {
    label: string;
    value: number;
    note: string;
    icon: ReactNode;
    art: CardArtKind;
    gradient: string;
    shadow: string;
  }[] = [
    {
      label: "ຜູ້ໃຊ້ທັງໝົດ",
      value: users.length,
      note: `${managerCount} ຜູ້ຈັດການ · ${users.length - managerCount} ທີມງານ`,
      icon: <IconUsers size={14} />,
      art: "apartments",
      gradient: GRADIENTS.blue,
      shadow: "rgba(37,99,235,0.45)"
    },
    {
      label: "ເປີດໃຊ້ງານ",
      value: activeCount,
      note: `${users.length - activeCount} ບັນຊີຖືກປິດ`,
      icon: <IconShieldCheck size={14} />,
      art: "check",
      gradient: GRADIENTS.green,
      shadow: "rgba(18,160,106,0.45)"
    },
    {
      label: "ປິດໃຊ້ງານ",
      value: users.length - activeCount,
      note: "ເຂົ້າລະບົບບໍ່ໄດ້",
      icon: <IconUserOff size={14} />,
      art: "clock",
      gradient: GRADIENTS.slate,
      shadow: "rgba(100,116,139,0.45)"
    },
    {
      label: "ຜູ້ຈັດການ",
      value: managerCount,
      note: "ສິດເຕັມທຸກໜ້າ",
      icon: <IconUserStar size={14} />,
      art: "sparkles",
      gradient: GRADIENTS.violet,
      shadow: "rgba(139,92,246,0.45)"
    }
  ];

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ຜູ້ໃຊ້"
        subtitle="ບັນຊີຜູ້ໃຊ້ ບົດບາດ ແລະ ສິດເຂົ້າເຖິງແຕ່ລະໜ້າ"
        actions={
          canEdit("users") ? (
            <Button className="btn-grad" leftSection={<IconPlus size={16} />} onClick={openAdd}>
              ເພີ່ມຜູ້ໃຊ້
            </Button>
          ) : null
        }
      />

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        {tiles.map((tile) => (
          <Box
            key={tile.label}
            className="tile lift rep-stat"
            style={{ background: tile.gradient, boxShadow: `0 18px 34px -26px ${tile.shadow}` }}
          >
            <CardArt kind={tile.art} />
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap={8}>
              <Text className="tile-label">{tile.label}</Text>
              <Box className="spend-ico">{tile.icon}</Box>
            </Group>
            <Text className="tile-value tnum" mt={10}>
              {tile.value}
            </Text>
            <Text className="tile-note" mt={6}>
              {tile.note}
            </Text>
          </Box>
        ))}
      </SimpleGrid>

      <Group justify="space-between" gap="sm" wrap="wrap">
        <Group gap={8}>
          <Text fw={600} c="var(--text-strong)">
            ຜູ້ໃຊ້ໃນລະບົບ
          </Text>
          <Badge variant="light" radius="xl">
            {users.length} ບັນຊີ
          </Badge>
        </Group>
        <Text size="xs" c="var(--text-muted)">
          ກົດສະຫຼັບເພື່ອເປີດ/ປິດບັນຊີ · ບັນຊີຂອງທ່ານແກ້ບໍ່ໄດ້
        </Text>
      </Group>

      {users.length ? (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {users.map((entry) => {
            const tone = ROLE_TONE[entry.role] || ROLE_TONE.staff;
            const isMe = entry.id === me?.id;
            const permEntries = Object.entries(entry.perms || {})
              .filter(([, actions]) => actions?.length)
              .slice(0, 4);
            const morePerms = Object.entries(entry.perms || {}).filter(([, actions]) => actions?.length).length - 4;

            return (
              <Box key={entry.id} className="usr-card lift" style={{ "--tone": tone } as CSSProperties}>
                <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                  <Group gap={12} wrap="nowrap" align="center" style={{ minWidth: 0 }}>
                    <Box className="usr-avatar">{initials(entry.name)}</Box>
                    <Box style={{ minWidth: 0 }}>
                      <Group gap={7} wrap="nowrap" align="center">
                        <Text className="usr-name" truncate>
                          {entry.name || "ບໍ່ມີຊື່"}
                        </Text>
                        {isMe ? <span className="usr-you">ທ່ານ</span> : null}
                      </Group>
                      <Group gap={6} wrap="wrap" mt={4}>
                        <span className="usr-tag">{ROLES[entry.role] || entry.role}</span>
                        <span className="usr-meta">
                          <IconPhone size={11} />
                          {entry.phone || "—"}
                        </span>
                        <span className="usr-meta">
                          <IconLock size={11} />
                          {entry.pin ? "PIN ••••" : "ຍັງບໍ່ມີ PIN"}
                        </span>
                      </Group>
                    </Box>
                  </Group>

                  <Switch
                    checked={entry.active !== false}
                    onChange={() => toggleActive(entry)}
                    disabled={isMe || !canEdit("users")}
                    size="sm"
                    aria-label={`ເປີດໃຊ້ ${entry.name}`}
                  />
                </Group>

                <Box className="usr-perms">
                  <Text className="usr-perms-title">ສິດເຂົ້າເຖິງ</Text>
                  <Group gap={5} wrap="wrap">
                    {entry.role === "manager" ? (
                      <span className="usr-perm is-all">
                        <IconShieldCheck size={11} /> ທຸກໜ້າ
                      </span>
                    ) : permEntries.length ? (
                      permEntries.map(([page, actions]) => (
                        <span key={page} className="usr-perm">
                          {PAGES.find((item) => item.key === page)?.label || page}
                          {actions?.includes("edit") ? " · ແກ້ໄຂ" : ""}
                        </span>
                      ))
                    ) : (
                      <Text className="usr-perm-empty">ຍັງບໍ່ໄດ້ກຳນົດສິດ</Text>
                    )}
                    {entry.role !== "manager" && morePerms > 0 ? (
                      <span className="usr-perm is-more">+{morePerms}</span>
                    ) : null}
                  </Group>
                </Box>

                <Group justify="space-between" align="center" gap="sm" className="usr-foot">
                  <span className={`usr-status${entry.active !== false ? " is-on" : " is-off"}`}>
                    <span className="usr-status-dot" />
                    {entry.active !== false ? "ເປີດໃຊ້ງານ" : "ປິດໃຊ້ງານ"}
                  </span>

                  <Group gap={4} wrap="nowrap">
                    <Tooltip label="ແກ້ໄຂ">
                      <ActionIcon
                        variant="light"
                        color="brand"
                        radius="xl"
                        disabled={!canEdit("users")}
                        onClick={() => openEdit(entry)}
                        aria-label={`ແກ້ໄຂ ${entry.name}`}
                      >
                        <IconEdit size={15} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={isMe ? "ລຶບບັນຊີຕົນເອງບໍ່ໄດ້" : "ລຶບ"}>
                      <ActionIcon
                        variant="light"
                        color="red"
                        radius="xl"
                        disabled={isMe || !canDelete("users")}
                        onClick={() => remove(entry)}
                        aria-label={`ລຶບ ${entry.name}`}
                      >
                        <IconTrash size={15} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Box>
            );
          })}
        </SimpleGrid>
      ) : (
        <Box className="surface rep-empty">
          <Box className="rep-ico rep-ico--empty">
            <IconUserShield size={20} />
          </Box>
          <Text fw={600} c="var(--text-strong)" mt="sm">
            ຍັງບໍ່ມີຜູ້ໃຊ້
          </Text>
          <Text size="xs" c="var(--text-muted)" mt={4}>
            ກົດ “ເພີ່ມຜູ້ໃຊ້” ເພື່ອສ້າງບັນຊີທຳອິດ
          </Text>
        </Box>
      )}

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={editingId ? "ແກ້ໄຂຜູ້ໃຊ້" : "ເພີ່ມຜູ້ໃຊ້"}
        size="lg"
        classNames={{ content: "usr-form-modal", header: "usr-form-modal-head", body: "usr-form-modal-body" }}
      >
        <Stack gap="md">
          <Box className="usr-form-hero" style={{ "--tone": ROLE_TONE[form.role] } as CSSProperties}>
            <Box className="usr-form-avatar">{initials(form.name)}</Box>
            <Box style={{ minWidth: 0 }}>
              <Text className="usr-form-hero-name">{form.name.trim() || "ຜູ້ໃຊ້ໃໝ່"}</Text>
              <Text className="usr-form-hero-sub">
                {ROLES[form.role]} · {form.active !== false ? "ເປີດໃຊ້ງານ" : "ປິດໃຊ້ງານ"}
              </Text>
            </Box>
            <span className={`usr-form-hero-badge${form.active !== false ? " is-on" : ""}`}>
              {form.active !== false ? "ເປີດໃຊ້" : "ປິດໃຊ້"}
            </span>
          </Box>

          <Box className="usr-form-sec">
            <Group gap={7} className="usr-form-sec-head">
              <span className="usr-form-sec-ico">
                <IconUser size={13} />
              </span>
              <Text className="usr-form-sec-title">ຂໍ້ມູນຜູ້ໃຊ້</Text>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label="ຊື່"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
                leftSection={<IconUser size={14} />}
                required
              />
              <TextInput
                label="ເບີໂທ"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.currentTarget.value })}
                leftSection={<IconPhone size={14} />}
                placeholder="020 …"
              />
              <TextInput
                label="PIN (4–6 ໂຕເລກ)"
                value={form.pin}
                onChange={(event) => setForm({ ...form, pin: event.currentTarget.value.replace(/\D/g, "").slice(0, 6) })}
                leftSection={<IconLock size={14} />}
                inputMode="numeric"
                placeholder="••••"
              />
              <Box>
                <Text className="usr-form-label">ສະຖານະບັນຊີ</Text>
                <Box className={`usr-form-switch${form.active !== false ? " is-on" : ""}`}>
                  <Switch
                    checked={form.active !== false}
                    onChange={(event) => setForm({ ...form, active: event.currentTarget.checked })}
                    size="sm"
                    aria-label="ເປີດໃຊ້ບັນຊີ"
                  />
                  <Box style={{ minWidth: 0 }}>
                    <Text className="usr-form-switch-title">{form.active !== false ? "ເປີດໃຊ້ງານ" : "ປິດໃຊ້ງານ"}</Text>
                    <Text className="usr-form-switch-sub">
                      {form.active !== false ? "ເຂົ້າລະບົບໄດ້" : "ເຂົ້າລະບົບບໍ່ໄດ້"}
                    </Text>
                  </Box>
                </Box>
              </Box>
            </SimpleGrid>
          </Box>

          <Box className="usr-form-sec">
            <Group gap={7} className="usr-form-sec-head">
              <span className="usr-form-sec-ico is-violet">
                <IconUserStar size={13} />
              </span>
              <Text className="usr-form-sec-title">ບົດບາດ</Text>
            </Group>
            <SegmentedControl
              className="usr-form-roles"
              fullWidth
              radius="md"
              value={form.role}
              onChange={(value) => setForm({ ...form, role: (value as UserRole) || "staff" })}
              data={Object.entries(ROLES).map(([value, label]) => ({ value, label }))}
            />
          </Box>

          <Box className="usr-form-sec">
            <Group justify="space-between" align="center" gap={8} className="usr-form-sec-head">
              <Group gap={7}>
                <span className="usr-form-sec-ico is-green">
                  <IconShieldCheck size={13} />
                </span>
                <Text className="usr-form-sec-title">ສິດເຂົ້າເຖິງ</Text>
              </Group>
              <Text className="usr-form-hint">ໝາຍສິດທີ່ຈະໃຫ້ · ຜູ້ຈັດການໄດ້ທຸກໜ້າ</Text>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={8}>
              {PAGES.map((page) => {
                const PageIcon = PAGE_ICON[page.key] || IconShieldCheck;
                const granted = form.perms?.[page.key] || [];
                const all = ACTIONS.every((action) => granted.includes(action.key));
                return (
                  <Box key={page.key} className="usr-perm-card">
                    <Group justify="space-between" gap={8} wrap="nowrap">
                      <Group gap={7} wrap="nowrap" style={{ minWidth: 0 }}>
                        <span className="usr-perm-ico">
                          <PageIcon size={13} />
                        </span>
                        <Text className="usr-perm-name" truncate>
                          {page.label}
                        </Text>
                      </Group>
                      <button
                        type="button"
                        className={`usr-perm-all${all ? " is-on" : ""}`}
                        onClick={() => togglePage(page.key)}
                      >
                        {all ? "ລ້າງ" : "ທັງໝົດ"}
                      </button>
                    </Group>

                    <Group gap={5} mt={9} wrap="nowrap">
                      {ACTIONS.map((action) => {
                        const PermIcon = ACTION_ICON[action.key];
                        const on = granted.includes(action.key);
                        return (
                          <button
                            key={action.key}
                            type="button"
                            className={`usr-perm-btn${on ? " is-on" : ""}`}
                            data-action={action.key}
                            aria-pressed={on}
                            onClick={() => togglePerm(page.key, action.key, !on)}
                          >
                            <PermIcon size={12} />
                            {action.label}
                          </button>
                        );
                      })}
                    </Group>
                  </Box>
                );
              })}
            </SimpleGrid>
          </Box>

          <Group justify="flex-end" gap="sm" className="usr-form-foot">
            <Button variant="default" onClick={() => setOpened(false)}>
              ຍົກເລີກ
            </Button>
            <Button className="btn-grad" onClick={submit} loading={savingForm} disabled={!form.name.trim()}>
              ບັນທຶກ
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ConfirmDialog
        opened={!!pending}
        title="ລຶບຜູ້ໃຊ້ນີ້?"
        description="ລຶບແລ້ວຈະບໍ່ສາມາດກູ້ຄືນໄດ້ ແລະ ບັນຊີນີ້ຈະເຂົ້າລະບົບບໍ່ໄດ້ອີກ."
        confirmLabel="ລຶບຜູ້ໃຊ້"
        busyLabel="ກຳລັງລຶບ…"
        doneLabel="ລຶບສຳເລັດ"
        state={confirmState}
        error={confirmError}
        targetIcon={<IconUserShield size={17} />}
        targetColor="#1663c4"
        targetTitle={pending ? pending.name : ""}
        targetMeta={pending ? `${ROLES[pending.role]}${pending.phone ? ` · ${pending.phone}` : ""}` : ""}
        onCancel={() => {
          setPending(null);
          setConfirmState("idle");
        }}
        onConfirm={confirmRemove}
      />
    </Stack>
  );
}
