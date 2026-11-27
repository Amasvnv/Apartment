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
  TextInput,
  Tooltip
} from "@mantine/core";
import {
  IconBolt,
  IconBuilding,
  IconDoorEnter,
  IconDoorOff,
  IconDroplet,
  IconEdit,
  IconInbox,
  IconPlus,
  IconSearch,
  IconTools,
  IconTrash,
  IconX
} from "@tabler/icons-react";
import { useMemo, useState, type ReactNode } from "react";
import CardArt from "../components/ui/CardArt";
import type { CardArtKind } from "../components/ui/CardArt";
import PageHeader from "../components/PageHeader";
import ConfirmDialog, { type ConfirmState } from "../components/ui/ConfirmDialog";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";
import type { Room, RoomStatus } from "../data/types";
import { sortRoomsByNo } from "../lib/compute";
import { logActivity } from "../lib/dataOps";
import { money, num } from "../lib/format";
import { notifyStatus } from "../lib/notify";

const STATUS_META: Record<RoomStatus, { label: string; hex: string; color: string }> = {
  occupied: { label: "ມີຜູ້ເຊົ່າ", hex: "#12a06a", color: "green" },
  vacant: { label: "ຫ້ອງວ່າງ", hex: "#E8A33D", color: "orange" },
  repair: { label: "ປິດຊ່ອມ", hex: "#8B5CF6", color: "violet" }
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
  const { data, commit } = useStore();
  const { canEdit, canDelete } = useAuth();
  const [opened, setOpened] = useState(false);
  const [editingNo, setEditingNo] = useState<string | null>(null);
  const [form, setForm] = useState<Room>(emptyRoom());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RoomStatus>("all");

  const rows = useMemo(() => sortRoomsByNo(data.rooms), [data.rooms]);
  const filtered = rows
    .filter((room) => statusFilter === "all" || room.status === statusFilter)
    .filter(
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
  const occupancy = data.rooms.length ? Math.round((counts.occupied / data.rooms.length) * 100) : 0;

  const stats: Array<{
    label: string;
    value: string;
    note: string;
    icon: ReactNode;
    art: CardArtKind;
    gradient: string;
    shadow: string;
  }> = [
    {
      label: "ຫ້ອງທັງໝົດ",
      value: num(data.rooms.length),
      note: "ລວມທຸກຊັ້ນ",
      icon: <IconBuilding size={14} />,
      art: "apartments",
      gradient: GRADIENTS.blue,
      shadow: "rgba(27,111,214,0.45)"
    },
    {
      label: "ມີຜູ້ເຊົ່າ",
      value: num(counts.occupied),
      note: `${occupancy}% ຖືກເຊົ່າແລ້ວ`,
      icon: <IconDoorEnter size={14} />,
      art: "check",
      gradient: GRADIENTS.green,
      shadow: "rgba(18,160,106,0.45)"
    },
    {
      label: "ຫ້ອງວ່າງ",
      value: num(counts.vacant),
      note: "ພ້ອມໃຫ້ເຊົ່າ",
      icon: <IconDoorOff size={14} />,
      art: "door",
      gradient: GRADIENTS.amber,
      shadow: "rgba(232,163,61,0.5)"
    },
    {
      label: "ປິດຊ່ອມ",
      value: num(counts.repair),
      note: "ກຳລັງສ້ອມແປງ",
      icon: <IconTools size={14} />,
      art: "wrench",
      gradient: GRADIENTS.navy,
      shadow: "rgba(18,58,99,0.5)"
    }
  ];

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

  const [savingForm, setSavingForm] = useState(false);
  const [pending, setPending] = useState<Room | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>("idle");
  const [confirmError, setConfirmError] = useState("");

  const submit = async () => {
    if (!form.no.trim()) return;
    setSavingForm(true);
    const ok = await commit((draft) => {
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
    setSavingForm(false);
    setOpened(false);
    notifyStatus(
      ok ? "success" : "danger",
      ok ? (editingNo ? "ແກ້ໄຂຫ້ອງສຳເລັດ" : "ເພີ່ມຫ້ອງສຳເລັດ") : "ບັນທຶກບໍ່ສຳເລັດ",
      `ຫ້ອງ ${form.no.trim()}`
    );
  };

  const remove = (room: Room) => {
    setPending(room);
    setConfirmState("idle");
    setConfirmError("");
  };

  const confirmRemove = async () => {
    if (!pending) return;
    setConfirmState("busy");
    const ok = await commit((draft) => {
      draft.rooms = draft.rooms.filter((item) => item.no !== pending.no);
      draft.tenants = draft.tenants.filter((item) => String(item.room) !== String(pending.no));
      logActivity(draft, "rooms", "ລຶບຫ້ອງ", `ຫ້ອງ ${pending.no}`);
    });
    if (!ok) {
      setConfirmState("error");
      setConfirmError("ບັນທຶກການລຶບບໍ່ສຳເລັດ — ກະລຸນາລອງໃໝ່");
      return;
    }
    setConfirmState("done");
    notifyStatus("success", "ລຶບຫ້ອງສຳເລັດ", `ຫ້ອງ ${pending.no}`);
    window.setTimeout(() => {
      setPending(null);
      setConfirmState("idle");
    }, 450);
  };

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ຈັດການຫ້ອງພັກ"
        subtitle="ສະຖານະຫ້ອງ ຜູ້ເຊົ່າ ແລະ ເລກມິເຕີລ່າສຸດ"
        actions={
          canEdit("rooms") ? (
            <Button leftSection={<IconPlus size={16} />} className="btn-grad" onClick={openAdd}>
              ເພີ່ມຫ້ອງ
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
          value={statusFilter}
          onChange={(value) => setStatusFilter((value as "all" | RoomStatus) || "all")}
          data={[
            { value: "all", label: `ທັງໝົດ ${data.rooms.length}` },
            { value: "occupied", label: `ມີຜູ້ເຊົ່າ ${counts.occupied}` },
            { value: "vacant", label: `ຫ້ອງວ່າງ ${counts.vacant}` },
            { value: "repair", label: `ປິດຊ່ອມ ${counts.repair}` }
          ]}
        />
        <Group gap="sm" w={{ base: "100%", sm: "auto" }}>
          <TextInput
            placeholder="ຄົ້ນຫາເລກຫ້ອງ / ຜູ້ເຊົ່າ"
            leftSection={<IconSearch size={15} />}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            radius="xl"
            w={{ base: "100%", sm: 250 }}
          />
        </Group>
      </Box>

      <Stack gap={10}>
        <Group justify="space-between" gap="sm" wrap="wrap">
          <Group gap={8}>
            <Text fw={600} c="var(--text-strong)">
              ລາຍການຫ້ອງພັກ
            </Text>
            <Badge variant="light" radius="xl">
              {filtered.length}
            </Badge>
          </Group>
          <Text size="xs" c="var(--text-muted)">
            ຮຽງຕາມເລກຫ້ອງ · ສະແດງເລກມິເຕີລ່າສຸດ
          </Text>
        </Group>

        {filtered.map((room) => {
          const meta = STATUS_META[room.status] || STATUS_META.vacant;
          return (
            <Box key={room.no} className="rep-row lift">
              <Box
                className="rep-ico rm-no-ico"
                style={{
                  color: meta.hex,
                  background: `color-mix(in srgb, ${meta.hex} 13%, transparent)`
                }}
              >
                {room.no}
              </Box>

              <Box className="rep-main">
                <Group gap={8} wrap="nowrap" className="rep-title-row">
                  <Text className="rep-title ten-name" fw={600} c="var(--text-strong)">
                    {room.tenant || "ຫ້ອງວ່າງ"}
                  </Text>
                </Group>
                <Text size="xs" c="var(--text-muted)" mt={2}>
                  {room.phone || "—"} · ໄຟ {num(room.meterElec)} · ນ້ຳ {num(room.meterWater)}
                </Text>
              </Box>

              <Group className="rep-meta" gap={8}>
                <span className="rep-chip">ຫ້ອງ {room.no}</span>
                <span className="rep-chip">{room.type}</span>
                <span className="rep-chip">ຊັ້ນ {room.floor}</span>
                <Badge variant="light" color={meta.color} radius="xl" size="sm">
                  {meta.label}
                </Badge>
                <Text className="rep-cost tnum">{money(room.rent, data.settings.currency)}</Text>
                <Group gap={2} wrap="nowrap" className="rep-actions">
                  <Tooltip label="ແກ້ໄຂ">
                    <ActionIcon
                      variant="subtle"
                      color="brand"
                      radius="xl"
                      disabled={!canEdit("rooms")}
                      onClick={() => openEdit(room)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="ລຶບ">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      radius="xl"
                      disabled={!canDelete("rooms")}
                      onClick={() => remove(room)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Box>
          );
        })}

        {!filtered.length ? (
          <Box className="surface rep-empty">
            <Box className="rep-ico rep-ico--empty">
              <IconInbox size={20} />
            </Box>
            <Text fw={600} c="var(--text-strong)" mt="sm">
              ບໍ່ພົບຫ້ອງພັກ
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
        withCloseButton={false}
        padding={0}
        centered
        size={640}
        classNames={{ content: "rm-modal" }}
      >
        <div className="rm-modal-head">
          <span className="rm-modal-ico">
            <IconDoorEnter size={18} />
          </span>
          <div className="rm-modal-copy">
            <span className="rm-modal-eyebrow">ຈັດການຫ້ອງພັກ</span>
            <Text className="rm-modal-title">{editingNo ? `ແກ້ໄຂຫ້ອງ ${editingNo}` : "ເພີ່ມຫ້ອງໃໝ່"}</Text>
          </div>
          <ActionIcon className="rm-modal-close" variant="subtle" color="gray" onClick={() => setOpened(false)} aria-label="ປິດ">
            <IconX size={17} />
          </ActionIcon>
        </div>

        <div className="rm-modal-body">
          <div className="rm-grid">
            <TextInput
              label="ເລກຫ້ອງ"
              placeholder="ເຊັ່ນ 12"
              value={form.no}
              onChange={(event) => setForm({ ...form, no: event.currentTarget.value })}
              required
            />
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
            <Select
              label="ສະຖານະ"
              data={Object.entries(STATUS_META).map(([value, meta]) => ({ value, label: meta.label }))}
              value={form.status}
              onChange={(value) => setForm({ ...form, status: (value as RoomStatus) || "vacant" })}
            />
            <NumberInput
              label="ຄ່າເຊົ່າ (₭/ເດືອນ)"
              value={form.rent}
              onChange={(value) => setForm({ ...form, rent: Number(value) || 0 })}
              min={0}
              thousandSeparator=","
            />
          </div>

          <div className="rm-grid rm-grid-meters">
            <NumberInput
              label="ມິເຕີໄຟຟ້າ"
              leftSection={<IconBolt size={15} />}
              value={form.meterElec}
              onChange={(value) => setForm({ ...form, meterElec: Number(value) || 0 })}
              min={0}
            />
            <NumberInput
              label="ມິເຕີນ້ຳ"
              leftSection={<IconDroplet size={15} />}
              value={form.meterWater}
              onChange={(value) => setForm({ ...form, meterWater: Number(value) || 0 })}
              min={0}
            />
          </div>
        </div>

        <div className="rm-modal-foot">
          <span className="rm-modal-note">* ຊ່ອງທີ່ມີເຄື່ອງໝາຍດາວ ຈຳເປັນຕ້ອງຕື່ມ</span>
          <Group className="rm-modal-actions">
            <Button variant="default" onClick={() => setOpened(false)}>
              ຍົກເລີກ
            </Button>
            <Button className="btn-grad" onClick={submit} loading={savingForm} disabled={!form.no.trim()}>
              ບັນທຶກ
            </Button>
          </Group>
        </div>
      </Modal>

      <ConfirmDialog
        opened={!!pending}
        title="ລຶບຫ້ອງນີ້?"
        description="ລຶບແລ້ວຈະບໍ່ສາມາດກູ້ຄືນໄດ້ ແລະ ຂໍ້ມູນຜູ້ເຊົ່າໃນຫ້ອງນີ້ຈະຖືກລຶບນຳ."
        confirmLabel="ລຶບຫ້ອງ"
        busyLabel="ກຳລັງລຶບ…"
        doneLabel="ລຶບສຳເລັດ"
        state={confirmState}
        error={confirmError}
        targetIcon={<IconBuilding size={17} />}
        targetColor="#1663c4"
        targetTitle={pending ? `ຫ້ອງ ${pending.no}` : ""}
        targetMeta={pending ? `${STATUS_META[pending.status]?.label || ""}${pending.tenant ? ` · ${pending.tenant}` : ""}` : ""}
        targetAmount={pending ? money(pending.rent, data.settings.currency) : ""}
        onCancel={() => {
          setPending(null);
          setConfirmState("idle");
        }}
        onConfirm={confirmRemove}
      />
    </Stack>
  );
}
