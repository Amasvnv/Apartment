import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
  UnstyledButton
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconBolt,
  IconBuilding,
  IconCalendar,
  IconCalendarMonth,
  IconCircleCheck,
  IconClock,
  IconDeviceFloppy,
  IconDots,
  IconDroplet,
  IconEdit,
  IconInbox,
  IconPhone,
  IconPlus,
  IconSearch,
  IconTools,
  IconTrash,
  IconUser,
  IconWallet,
  IconWind
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";
import type { Repair, RepairCategory, RepairPriority, RepairStatus } from "../data/types";
import { logActivity } from "../lib/dataOps";
import CardArt from "../components/ui/CardArt";
import { money, monthLabel } from "../lib/format";

const CATEGORIES: Record<RepairCategory, { label: string; color: string; hex: string; icon: ReactNode }> = {
  electric: { label: "ໄຟຟ້າ", color: "amber", hex: "#E8A33D", icon: <IconBolt size={18} /> },
  water: { label: "ນ້ຳປະປາ", color: "cyan", hex: "#0EA5C6", icon: <IconDroplet size={18} /> },
  furniture: { label: "ເຟີນິເຈີ", color: "violet", hex: "#8B5CF6", icon: <IconTools size={18} /> },
  aircon: { label: "ແອເຢັນ", color: "blue", hex: "#1B6FD6", icon: <IconWind size={18} /> },
  building: { label: "ໂຄງສ້າງ", color: "gray", hex: "#64748B", icon: <IconBuilding size={18} /> },
  other: { label: "ອື່ນໆ", color: "gray", hex: "#94A3B8", icon: <IconDots size={18} /> }
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

const GRADIENTS = {
  amber:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.3), transparent 62%), linear-gradient(142deg, #cf7524 0%, #e8a33d 52%, #f7c469 100%)",
  blue:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.3), transparent 62%), linear-gradient(142deg, #1663c4 0%, #2f83e8 55%, #63a9ff 100%)",
  green:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.3), transparent 62%), linear-gradient(142deg, #0e7c5a 0%, #12a06a 52%, #43cf9b 100%)",
  navy:
    "radial-gradient(120% 110% at 88% -18%, rgba(255,255,255,0.26), transparent 62%), linear-gradient(142deg, #123a63 0%, #245c98 55%, #3a86c9 100%)"
} as const;

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

const monthKeyOf = (value: string) => String(value || "").slice(0, 7);

const timeNow = () =>
  new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const showDone = (title: string, message: string, color: string) => {
  notifications.show({
    position: "bottom-right",
    color,
    radius: "lg",
    autoClose: 4000,
    withBorder: true,
    className: "status-toast",
    style: { "--toast-line": color === "red" ? "#e5484d" : "#12a06a" } as CSSProperties,
    icon: <IconCircleCheck size={20} />,
    title,
    message: `${message} · ເວລາ ${timeNow()}`
  });
};

export default function Repairs() {
  const { data, update } = useStore();
  const { canEdit, canDelete } = useAuth();
  const [opened, setOpened] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Repair>(emptyRepair());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Repair | null>(null);

  const monthOptions = useMemo(() => {
    const keys = new Set<string>();
    const now = new Date();
    const keyOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    for (let i = 0; i < 12; i += 1) {
      keys.add(keyOf(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    }
    data.repairs.forEach((item) => {
      const key = String(item.reported || "").slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(key)) keys.add(key);
    });
    return [...keys]
      .sort((a, b) => b.localeCompare(a))
      .map((key) => {
        const [year, month] = key.split("-").map(Number);
        return { value: key, label: monthLabel(month, year) };
      });
  }, [data.repairs]);

  const scoped = useMemo(
    () =>
      monthFilter
        ? data.repairs.filter((item) => monthKeyOf(item.reported) === monthFilter)
        : data.repairs,
    [data.repairs, monthFilter]
  );
  const activeCategory = CATEGORIES[form.category] || CATEGORIES.other;
  const activeStatus = STATUSES[form.status] || STATUSES.open;

  const list = useMemo(() => {
    const sorted = [...scoped].sort((a, b) => String(b.reported).localeCompare(String(a.reported)));
    return sorted.filter(
      (item) =>
        (!statusFilter || item.status === statusFilter) &&
        (!query || item.title.toLowerCase().includes(query.toLowerCase()) || String(item.room).includes(query))
    );
  }, [scoped, query, statusFilter]);

  const openCount = scoped.filter((item) => item.status === "open").length;
  const progressCount = scoped.filter((item) => item.status === "in_progress").length;
  const doneCount = scoped.filter((item) => item.status === "done").length;
  const cancelledCount = scoped.filter((item) => item.status === "cancelled").length;
  const totalCost = scoped.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

  const stats = [
    {
      label: "ລໍຖ້າດຳເນີນການ",
      value: String(openCount),
      note: "ຍັງບໍ່ເລີ່ມ",
      icon: <IconClock size={14} />,
      art: "clock" as const,
      gradient: GRADIENTS.amber,
      shadow: "rgba(232,163,61,0.5)"
    },
    {
      label: "ກຳລັງຊ່ອມ",
      value: String(progressCount),
      note: "ຢູ່ລະຫວ່າງດຳເນີນການ",
      icon: <IconTools size={14} />,
      art: "wrench" as const,
      gradient: GRADIENTS.blue,
      shadow: "rgba(27,111,214,0.45)"
    },
    {
      label: "ສຳເລັດ",
      value: String(doneCount),
      note: "ປິດງານແລ້ວ",
      icon: <IconCircleCheck size={14} />,
      art: "check" as const,
      gradient: GRADIENTS.green,
      shadow: "rgba(18,160,106,0.45)"
    },
    {
      label: "ຄ່າໃຊ້ຈ່າຍລວມ",
      value: money(totalCost, data.settings.currency),
      note: monthFilter ? "ນັບສະເພາະເດືອນທີ່ເລືອກ" : "ບໍ່ນັບວຽກທີ່ຍົກເລີກ",
      icon: <IconWallet size={14} />,
      art: "wallet" as const,
      gradient: GRADIENTS.navy,
      shadow: "rgba(18,58,99,0.5)"
    }
  ];

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
      const next: Repair = {
        ...form,
        title: form.title.trim(),
        room: String(form.room || ""),
        done: form.status === "done" && !form.done ? new Date().toISOString().slice(0, 10) : form.done
      };
      if (index >= 0) draft.repairs[index] = next;
      else draft.repairs.push(next);
      logActivity(draft, "repairs", editingId ? "ແກ້ໄຂວຽກສ້ອມ" : "ເພີ່ມວຽກສ້ອມ", `${next.title} · ຫ້ອງ ${next.room || "—"}`);
    });
    setOpened(false);
    showDone(
      editingId ? "ແກ້ໄຂສຳເລັດ" : "ບັນທຶກສຳເລັດ",
      `${form.title.trim()} · ຫ້ອງ ${form.room || "—"}`,
      "teal"
    );
  };

  const remove = (repair: Repair) => setConfirmTarget(repair);

  const confirmRemove = () => {
    const repair = confirmTarget;
    if (!repair) return;
    update((draft) => {
      draft.repairs = draft.repairs.filter((item) => item.id !== repair.id);
      logActivity(draft, "repairs", "ລຶບວຽກສ້ອມ", repair.title);
    });
    setConfirmTarget(null);
    showDone("ລຶບສຳເລັດ", repair.title, "red");
  };

  const confirmCategory = confirmTarget
    ? CATEGORIES[confirmTarget.category] || CATEGORIES.other
    : null;

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ຈັດການວຽກສ້ອມແປງ"
        subtitle="ແຈ້ງຊ່ອມ ຄວາມສຳຄັນ ຜູ້ຮັບຜິດຊອບ ແລະ ຄ່າໃຊ້ຈ່າຍ"
        actions={
          canEdit("repairs") ? (
            <Button className="btn-grad" leftSection={<IconPlus size={16} />} onClick={openAdd}>
              ແຈ້ງຊ່ອມໃໝ່
            </Button>
          ) : null
        }
      />

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        {stats.map((item) => (
          <Box
            key={item.label}
            className="tile lift rep-stat"
            style={{ background: item.gradient, boxShadow: `0 18px 34px -26px ${item.shadow}` }}
          >
            <CardArt kind={item.art} />
            <Group justify="space-between" align="flex-start" wrap="nowrap" gap={8}>
              <Text className="tile-label">{item.label}</Text>
              <Box className="spend-ico">{item.icon}</Box>
            </Group>
            <Text className="tile-value tnum rep-stat-value" mt={10}>
              {item.value}
            </Text>
            <Text className="tile-note" mt={6}>
              {item.note}
            </Text>
          </Box>
        ))}
      </SimpleGrid>

      <Box className="surface rep-toolbar">
        <SegmentedControl
          className="rep-tabs"
          radius="xl"
          size="sm"
          value={statusFilter ?? "all"}
          onChange={(value) => setStatusFilter(value === "all" ? null : value)}
          data={[
            { value: "all", label: `ທັງໝົດ ${scoped.length}` },
            { value: "open", label: `ລໍຖ້າ ${openCount}` },
            { value: "in_progress", label: `ກຳລັງຊ່ອມ ${progressCount}` },
            { value: "done", label: `ສຳເລັດ ${doneCount}` },
            { value: "cancelled", label: `ຍົກເລີກ ${cancelledCount}` }
          ]}
        />
        <Group gap="sm" w={{ base: "100%", sm: "auto" }}>
          <Select
            placeholder="ທຸກເດືອນ"
            leftSection={<IconCalendarMonth size={15} />}
            data={monthOptions}
            value={monthFilter}
            onChange={setMonthFilter}
            clearable
            radius="xl"
            w={{ base: "100%", sm: 178 }}
          />
          <TextInput
            placeholder="ຄົ້ນຫາວຽກ / ຫ້ອງ"
            leftSection={<IconSearch size={15} />}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            radius="xl"
            w={{ base: "100%", sm: 240 }}
          />
        </Group>
      </Box>

      <Stack gap={10}>
                  <Group justify="space-between" gap="sm" wrap="wrap">
          <Group gap={8}>
            <Text fw={600} c="var(--text-strong)">
              ລາຍການສ້ອມແປງ
            </Text>
            <Badge variant="light" radius="xl">
              {list.length}
            </Badge>
          </Group>
          <Text size="xs" c="var(--text-muted)">
            {monthFilter
              ? "ສະແດງສະເພາະວຽກທີ່ແຈ້ງໃນເດືອນທີ່ເລືອກ · ຮຽງຕາມວັນແຈ້ງໃໝ່ສຸດ"
              : "ຮຽງຕາມວັນແຈ້ງໃໝ່ສຸດ"}
          </Text>
        </Group>

        {list.map((repair) => {
          const category = CATEGORIES[repair.category] || CATEGORIES.other;
          const priority = PRIORITIES[repair.priority] || PRIORITIES.normal;
          const status = STATUSES[repair.status] || STATUSES.open;
          return (
            <Box key={repair.id} className="rep-row lift">
              <Box
                className="rep-ico"
                style={{
                  color: category.hex,
                  background: `color-mix(in srgb, ${category.hex} 13%, transparent)`
                }}
              >
                {category.icon}
              </Box>

              <Box className="rep-main">
                <Group gap={8} wrap="nowrap" className="rep-title-row">
                  <Text className="rep-title" fw={600} c="var(--text-strong)">
                    {repair.title}
                  </Text>
                </Group>
                <Text size="xs" c="var(--text-muted)" mt={2}>
                  <span style={{ color: category.hex, fontWeight: 600 }}>{category.label}</span>
                  {" · "}
                  {repair.reported || "—"}
                  {repair.due ? ` · ກຳນົດ ${repair.due}` : ""}
                  {repair.note ? ` · ${repair.note}` : ""}
                </Text>
              </Box>

              <Group className="rep-meta" gap={8}>
                <span className="rep-chip">ຫ້ອງ {repair.room || "—"}</span>
                <Badge variant="light" color={priority.color} radius="xl" size="sm">
                  {priority.label}
                </Badge>
                <Badge variant="light" color={status.color} radius="xl" size="sm">
                  {status.label}
                </Badge>
                <Group gap={6} wrap="nowrap" className="rep-owner">
                  <span className="rep-avatar">{repair.assignee ? repair.assignee.slice(0, 1) : "—"}</span>
                  <Text size="xs" c="var(--text-body)">
                    {repair.assignee || "ຍັງບໍ່ມອບໝາຍ"}
                  </Text>
                </Group>
                <Text className="rep-cost tnum">{repair.cost ? money(repair.cost, data.settings.currency) : "—"}</Text>
                <Group gap={2} wrap="nowrap" className="rep-actions">
                  <Tooltip label="ແກ້ໄຂ">
                    <ActionIcon
                      variant="subtle"
                      color="brand"
                      radius="xl"
                      disabled={!canEdit("repairs")}
                      onClick={() => openEdit(repair)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="ລຶບ">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      radius="xl"
                      disabled={!canDelete("repairs")}
                      onClick={() => remove(repair)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Box>
          );
        })}

        {!list.length ? (
          <Box className="surface rep-empty">
            <Box className="rep-ico rep-ico--empty">
              <IconInbox size={20} />
            </Box>
            <Text fw={600} c="var(--text-strong)" mt="sm">
              ບໍ່ພົບວຽກສ້ອມແປງ
            </Text>
            <Text size="xs" c="var(--text-muted)" mt={4}>
              ລອງປ່ຽນຕົວກອງ ຫຼື ຄຳຄົ້ນຫາ
            </Text>
          </Box>
        ) : null}
      </Stack>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        size="xl"
        centered
        radius="lg"
        classNames={{
          content: "rep-modal",
          header: "rep-modal-header",
          title: "rep-modal-title",
          body: "rep-modal-body"
        }}
        title={editingId ? "ແກ້ໄຂວຽກສ້ອມ" : "ແຈ້ງຊ່ອມໃໝ່"}
      >
        <Stack gap="md">
          <Box className="rep-hero">
            <Box
              className="rep-hero-ico"
              style={{ color: activeCategory.hex, background: `color-mix(in srgb, ${activeCategory.hex} 14%, transparent)` }}
            >
              {activeCategory.icon}
            </Box>
            <Box className="rep-hero-copy">
              <Text className="rep-hero-title" fw={700} c="var(--text-strong)">
                {form.title.trim() || "ວຽກສ້ອມໃໝ່"}
              </Text>
              <Text size="xs" c="var(--text-muted)" mt={2}>
                {form.room ? `ຫ້ອງ ${form.room}` : "ຍັງບໍ່ເລືອກຫ້ອງ"} · {activeCategory.label} · {activeStatus.label}
              </Text>
            </Box>
            <Box className="rep-hero-cost">
              <Text className="rep-hero-cost-value tnum">{money(form.cost || 0, data.settings.currency)}</Text>
              <Text className="rep-hero-cost-label">ຄ່າໃຊ້ຈ່າຍ</Text>
            </Box>
          </Box>

          <Box className="rep-form-grid">
          <Box className="rep-section">
            <Group className="rep-section-head" gap={8}>
              <span className="rep-section-dot" />
              <Text className="rep-section-title">ລາຍລະອຽດວຽກ</Text>
            </Group>
            <TextInput
              label="ຫົວຂໍ້ວຽກ"
              placeholder="ເຊັ່ນ: ປ່ຽນດອກໄຟ ຫ້ອງນ້ຳ"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.currentTarget.value })}
              required
            />
            <Box>
              <Text className="rep-field-label">
                ໝວດ <span className="rep-req">*</span>
              </Text>
              <SimpleGrid cols={3} spacing={8}>
                {(Object.keys(CATEGORIES) as RepairCategory[]).map((key) => {
                  const meta = CATEGORIES[key];
                  return (
                    <UnstyledButton
                      key={key}
                      type="button"
                      className={`rep-cat${form.category === key ? " is-active" : ""}`}
                      style={{ "--cat": meta.hex } as CSSProperties}
                      onClick={() => setForm({ ...form, category: key })}
                    >
                      <span className="rep-cat-ico">{meta.icon}</span>
                      <span className="rep-cat-label">{meta.label}</span>
                    </UnstyledButton>
                  );
                })}
              </SimpleGrid>
            </Box>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <Select
                label="ຫ້ອງ"
                data={data.rooms.map((room) => room.no)}
                value={form.room || null}
                onChange={(value) => setForm({ ...form, room: value || "" })}
                searchable
              />
              <Select
                label="ຄວາມສຳຄັນ"
                data={Object.entries(PRIORITIES).map(([value, meta]) => ({ value, label: meta.label }))}
                value={form.priority}
                onChange={(value) => setForm({ ...form, priority: (value as RepairPriority) || "normal" })}
              />
            </SimpleGrid>
          </Box>

          <Box className="rep-section">
            <Group className="rep-section-head" gap={8}>
              <span className="rep-section-dot" />
              <Text className="rep-section-title">ຄວາມຄືບໜ້າ ແລະ ຄ່າໃຊ້ຈ່າຍ</Text>
            </Group>
            <Box>
              <Text className="rep-field-label">ສະຖານະ</Text>
              <SegmentedControl
                fullWidth
                radius="xl"
                className="rep-status"
                value={form.status}
                onChange={(value) =>
                  setForm({
                    ...form,
                    status: value as RepairStatus,
                    done: value === "done" && !form.done ? new Date().toISOString().slice(0, 10) : form.done
                  })
                }
                data={(Object.keys(STATUSES) as RepairStatus[]).map((key) => ({
                  value: key,
                  label: STATUSES[key].label
                }))}
              />
            </Box>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                label="ຜູ້ຮັບຜິດຊອບ"
                leftSection={<IconUser size={15} />}
                value={form.assignee}
                onChange={(event) => setForm({ ...form, assignee: event.currentTarget.value })}
              />
              <TextInput
                label="ເບີໂທ"
                leftSection={<IconPhone size={15} />}
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.currentTarget.value })}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <TextInput
                type="date"
                label="ວັນແຈ້ງ"
                leftSection={<IconCalendar size={15} />}
                value={form.reported}
                onChange={(event) => setForm({ ...form, reported: event.currentTarget.value })}
              />
              <TextInput
                type="date"
                label="ກຳນົດສຳເລັດ"
                leftSection={<IconCalendar size={15} />}
                value={form.due}
                onChange={(event) => setForm({ ...form, due: event.currentTarget.value })}
              />
              <TextInput
                type="date"
                label="ວັນສຳເລັດ"
                leftSection={<IconCalendar size={15} />}
                value={form.done}
                onChange={(event) => setForm({ ...form, done: event.currentTarget.value })}
              />
              <NumberInput
                label="ຄ່າໃຊ້ຈ່າຍ"
                leftSection="₭"
                value={form.cost}
                onChange={(value) => setForm({ ...form, cost: Number(value) || 0 })}
                min={0}
                thousandSeparator=","
              />
            </SimpleGrid>
            <Textarea
              label="ໝາຍເຫດ"
              placeholder="ລາຍລະອຽດເພີ່ມເຕີມ..."
              autosize
              minRows={2}
              maxRows={4}
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.currentTarget.value })}
            />
            <Text className="rep-hint">
              ລາຍການຈະສະແດງສະເພາະເດືອນທີ່ແຈ້ງ ແລະ ຄ່າຊ່ອມກໍນັບສະເພາະເດືອນນັ້ນເທົ່ານັ້ນ.
            </Text>
          </Box>
          </Box>

          <Group className="rep-form-footer" justify="space-between" gap="sm" wrap="nowrap">
            <Text size="xs" c="var(--text-muted)">
              <span className="rep-req">*</span> ຈຳເປັນ
            </Text>
            <Group gap={10} wrap="nowrap">
              <Button variant="default" radius="xl" onClick={() => setOpened(false)}>
                ຍົກເລີກ
              </Button>
              <Button
                className="btn-grad"
                radius="xl"
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={submit}
                disabled={!form.title.trim()}
              >
                ບັນທຶກ
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        centered
        size={430}
        radius={20}
        withCloseButton={false}
        classNames={{ content: "rep-confirm", body: "rep-confirm-body" }}
      >
        {confirmTarget && confirmCategory ? (
          <Box className="rep-confirm-pad">
            <Group className="rep-confirm-head" align="flex-start" gap={14} wrap="nowrap">
              <Box className="rep-confirm-ico">
                <IconAlertTriangle size={22} />
              </Box>
              <Box>
                <Text className="rep-confirm-title">ລຶບວຽກສ້ອມນີ້?</Text>
                <Text className="rep-confirm-sub">
                  ລຶບແລ້ວຈະບໍ່ສາມາດກູ້ຄືນໄດ້ ແລະ ຈະຖືກຕັດອອກຈາກລາຍງານ.
                </Text>
              </Box>
            </Group>

            <Box className="rep-confirm-target">
              <Box
                className="rep-confirm-target-ico"
                style={{
                  color: confirmCategory.hex,
                  background: `color-mix(in srgb, ${confirmCategory.hex} 12%, transparent)`
                }}
              >
                {confirmCategory.icon}
              </Box>
              <Box className="rep-confirm-target-body">
                <Text className="rep-confirm-target-title">{confirmTarget.title}</Text>
                <Text className="rep-confirm-target-meta">
                  ຫ້ອງ {confirmTarget.room || "—"} · {confirmTarget.reported || "—"}
                  {confirmTarget.due ? ` · ກຳນົດ ${confirmTarget.due}` : ""}
                </Text>
              </Box>
              {confirmTarget.cost ? (
                <Text className="rep-confirm-cost tnum">
                  {money(confirmTarget.cost, data.settings.currency)}
                </Text>
              ) : null}
            </Box>

            <Group className="rep-confirm-actions" gap={10} wrap="nowrap">
              <Button variant="default" radius="xl" onClick={() => setConfirmTarget(null)}>
                ຍົກເລີກ
              </Button>
              <Button
                className="rep-confirm-btn-danger"
                radius="xl"
                leftSection={<IconTrash size={16} />}
                onClick={confirmRemove}
              >
                ລຶບວຽກ
              </Button>
            </Group>
          </Box>
        ) : null}
      </Modal>
    </Stack>
  );
}
