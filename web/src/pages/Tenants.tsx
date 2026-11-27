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
  IconCalendar,
  IconCash,
  IconCheck,
  IconCircleCheck,
  IconDoor,
  IconEdit,
  IconFileText,
  IconHome,
  IconInbox,
  IconPhone,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUser,
  IconUserCheck,
  IconUserPlus,
  IconUsers,
  IconWallet,
  IconX
} from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import CardArt from "../components/ui/CardArt";
import type { CardArtKind } from "../components/ui/CardArt";
import MonthSwitcher from "../components/MonthSwitcher";
import PageHeader from "../components/PageHeader";
import ConfirmDialog, { type ConfirmState } from "../components/ui/ConfirmDialog";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";
import type { StayStatus, Tenant } from "../data/types";
import { money, monthLabel, num, ratesKeyOf } from "../lib/format";
import { logActivity, syncRoomsFromTenants } from "../lib/dataOps";
import { notifyStatus } from "../lib/notify";

const STAY_META: Record<StayStatus, { label: string; hex: string }> = {
  resident: { label: "ຢູ່ປະຈຳ", hex: "#12a06a" },
  away: { label: "ໄປຕ່າງແຂວງ", hex: "#E8A33D" }
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

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("") || "ຜ";

export default function Tenants() {
  const { data, commit, month } = useStore();
  const { canEdit, canDelete } = useAuth();
  const [opened, setOpened] = useState(false);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [form, setForm] = useState<Tenant>(emptyTenant());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StayStatus>("all");

  const { year, month: monthNumber } = month;
  const key = ratesKeyOf(year, monthNumber);
  const isLiveMonth = key === ratesKeyOf(data.settings.current.year, data.settings.current.month);
  const isMonthSaved = !!data.settings.tenantsByMonth?.[key];
  const monthTenants = data.settings.tenantsByMonth?.[key] ?? data.tenants;

  const byRoom = (a: Tenant, b: Tenant) =>
    String(a.room).localeCompare(String(b.room), undefined, { numeric: true });

  const tenants = monthTenants
    .filter((tenant) => statusFilter === "all" || tenant.stayStatus === statusFilter)
    .filter(
      (tenant) =>
        !query ||
        tenant.name.toLowerCase().includes(query.toLowerCase()) ||
        String(tenant.room).includes(query) ||
        tenant.phone.includes(query)
    )
    .sort(byRoom);

  const totalPeople = monthTenants.reduce((sum, tenant) => sum + (tenant.stayStatus === "away" ? 0 : Number(tenant.people) || 1), 0);
  const totalDeposit = monthTenants.reduce((sum, tenant) => sum + (Number(tenant.deposit) || 0), 0);
  const awayCount = monthTenants.filter((tenant) => tenant.stayStatus === "away").length;
  const residentCount = monthTenants.length - awayCount;
  const totalRooms = data.rooms.length || monthTenants.length;
  const residentRooms = monthTenants.filter((tenant) => tenant.stayStatus !== "away").length;
  const vacantRooms = Math.max(totalRooms - residentRooms, 0);
  const occupancy = totalRooms ? Math.round((residentRooms / totalRooms) * 100) : 0;

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
      label: "ຜູ້ເຊົ່າທັງໝົດ",
      value: String(monthTenants.length),
      note: "ຫ້ອງທີ່ມີສັນຍາ",
      icon: <IconUsers size={14} />,
      art: "apartments",
      gradient: GRADIENTS.blue,
      shadow: "rgba(27,111,214,0.45)"
    },
    {
      label: "ຄົນຢູ່ປະຈຳ",
      value: String(totalPeople),
      note: `${awayCount} ຄົນໄປຕ່າງແຂວງ`,
      icon: <IconUserCheck size={14} />,
      art: "check",
      gradient: GRADIENTS.green,
      shadow: "rgba(18,160,106,0.45)"
    },
    {
      label: "ຫ້ອງວ່າງ",
      value: String(vacantRooms),
      note: `${occupancy}% ຖືກເຊົ່າ · ຈາກ ${totalRooms} ຫ້ອງ`,
      icon: <IconDoor size={14} />,
      art: "door",
      gradient: GRADIENTS.amber,
      shadow: "rgba(232,163,61,0.5)"
    },
    {
      label: "ເງິນມັດຈຳລວມ",
      value: money(totalDeposit, data.settings.currency),
      note: "ລວມທຸກຫ້ອງ",
      icon: <IconWallet size={14} />,
      art: "wallet",
      gradient: GRADIENTS.navy,
      shadow: "rgba(18,58,99,0.5)"
    }
  ];

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

  const [savingForm, setSavingForm] = useState(false);
  const [pending, setPending] = useState<Tenant | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>("idle");
  const [confirmError, setConfirmError] = useState("");

  const submit = async () => {
    if (!form.name.trim() || !form.room) return;
    setSavingForm(true);
    const ok = await commit((draft) => {
      if (!draft.settings.tenantsByMonth) draft.settings.tenantsByMonth = {};
      const list = [...(draft.settings.tenantsByMonth[key] ?? draft.tenants)];
      const index = list.findIndex((tenant) => String(tenant.room) === String(editingRoom ?? form.room));
      const next = { ...form, room: String(form.room) };
      if (index >= 0) list[index] = next;
      else list.push(next);
      draft.settings.tenantsByMonth[key] = list;
      if (isLiveMonth) {
        draft.tenants = list.map((item) => ({ ...item }));
        syncRoomsFromTenants(draft);
      }
      logActivity(
        draft,
        "tenants",
        editingRoom ? "ແກ້ໄຂຜູ້ເຊົ່າ" : "ເພີ່ມຜູ້ເຊົ່າ",
        `${form.name} · ຫ້ອງ ${form.room} · ${monthLabel(monthNumber, year)}`
      );
    });
    setSavingForm(false);
    setOpened(false);
    notifyStatus(
      ok ? "success" : "danger",
      ok ? (editingRoom ? "ແກ້ໄຂຜູ້ເຊົ່າສຳເລັດ" : "ເພີ່ມຜູ້ເຊົ່າສຳເລັດ") : "ບັນທຶກບໍ່ສຳເລັດ",
      `${form.name} · ຫ້ອງ ${form.room}`
    );
  };

  const remove = (tenant: Tenant) => {
    setPending(tenant);
    setConfirmState("idle");
    setConfirmError("");
  };

  const confirmRemove = async () => {
    if (!pending) return;
    setConfirmState("busy");
    const ok = await commit((draft) => {
      if (!draft.settings.tenantsByMonth) draft.settings.tenantsByMonth = {};
      const list = (draft.settings.tenantsByMonth[key] ?? draft.tenants).filter(
        (item) => String(item.room) !== String(pending.room)
      );
      draft.settings.tenantsByMonth[key] = list;
      if (isLiveMonth) {
        draft.tenants = list.map((item) => ({ ...item }));
        syncRoomsFromTenants(draft);
      }
      logActivity(draft, "tenants", "ລຶບຜູ້ເຊົ່າ", `${pending.name} · ${monthLabel(monthNumber, year)}`);
    });
    if (!ok) {
      setConfirmState("error");
      setConfirmError("ບັນທຶກການລຶບບໍ່ສຳເລັດ — ກະລຸນາລອງໃໝ່");
      return;
    }
    setConfirmState("done");
    notifyStatus("success", "ລຶບຜູ້ເຊົ່າສຳເລັດ", `${pending.name} · ຫ້ອງ ${pending.room}`);
    window.setTimeout(() => {
      setPending(null);
      setConfirmState("idle");
    }, 450);
  };

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ທະບຽນຜູ້ເຊົ່າ"
        subtitle="ຂໍ້ມູນຜູ້ເຊົ່າ ສັນຍາ ເງິນມັດຈຳ ແລະ ສະຖານະການພັກອາໄສ"
        actions={
          <Group gap={8} wrap="wrap" justify="flex-end">
            <MonthSwitcher />
            {canEdit("tenants") ? (
              <Button leftSection={<IconPlus size={16} />} className="btn-grad" onClick={openAdd}>
                ເພີ່ມຜູ້ເຊົ່າ
              </Button>
            ) : null}
          </Group>
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
          onChange={(value) => setStatusFilter((value as "all" | StayStatus) || "all")}
          data={[
            { value: "all", label: `ທັງໝົດ ${monthTenants.length}` },
            { value: "resident", label: `ຢູ່ປະຈຳ ${residentCount}` },
            { value: "away", label: `ໄປຕ່າງແຂວງ ${awayCount}` }
          ]}
        />
        <Group gap="sm" w={{ base: "100%", sm: "auto" }}>
          <TextInput
            placeholder="ຄົ້ນຫາຊື່ / ຫ້ອງ / ເບີໂທ"
            leftSection={<IconSearch size={15} />}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            radius="xl"
            w={{ base: "100%", sm: 260 }}
          />
        </Group>
      </Box>

      <Stack gap={10}>
        <Group justify="space-between" gap="sm" wrap="wrap">
          <Group gap={8}>
            <Text fw={600} c="var(--text-strong)">
              ລາຍຊື່ຜູ້ເຊົ່າ
            </Text>
            <Badge variant="light" radius="xl">
              {tenants.length}
            </Badge>
          </Group>
          <Text size="xs" c="var(--text-muted)">
            {monthLabel(monthNumber, year)} ·{" "}
            {isMonthSaved ? "ບັນທຶກແຍກຂອງເດືອນນີ້ແລ້ວ" : "ສະແດງຈາກທະບຽນຫຼັກ"} · ຮຽງຕາມຫ້ອງ
          </Text>
        </Group>

        {tenants.map((tenant) => {
          const meta = STAY_META[tenant.stayStatus] || STAY_META.resident;
          return (
            <Box key={tenant.room} className="rep-row lift">
              <Box
                className="rep-ico ten-ava-ico"
                style={{
                  color: meta.hex,
                  background: `color-mix(in srgb, ${meta.hex} 13%, transparent)`
                }}
              >
                {initials(tenant.name)}
              </Box>

              <Box className="rep-main">
                <Group gap={8} wrap="nowrap" className="rep-title-row">
                  <Text className="rep-title ten-name" fw={600} c="var(--text-strong)">
                    {tenant.name}
                  </Text>
                </Group>
                <Text size="xs" c="var(--text-muted)" mt={2}>
                  {tenant.phone || "—"} · ເຂົ້າຢູ່ {tenant.moveIn || "—"} · ມັດຈຳ{" "}
                  {money(tenant.deposit, data.settings.currency)}
                </Text>
              </Box>

              <Group className="rep-meta" gap={8}>
                <span className="rep-chip">ຫ້ອງ {tenant.room}</span>
                <span className="rep-chip">{num(tenant.people)} ຄົນ</span>
                <Badge variant="light" color="blue" radius="xl" size="sm">
                  {tenant.contract}
                </Badge>
                <Badge variant="light" color={tenant.stayStatus === "away" ? "orange" : "green"} radius="xl" size="sm">
                  {meta.label}
                </Badge>
                <Text className="rep-cost tnum">{money(tenant.rent, data.settings.currency)}</Text>
                <Group gap={2} wrap="nowrap" className="rep-actions">
                  <Tooltip label="ແກ້ໄຂ">
                    <ActionIcon
                      variant="subtle"
                      color="brand"
                      radius="xl"
                      disabled={!canEdit("tenants")}
                      onClick={() => openEdit(tenant)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="ລຶບ">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      radius="xl"
                      disabled={!canDelete("tenants")}
                      onClick={() => remove(tenant)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Box>
          );
        })}

        {!tenants.length ? (
          <Box className="surface rep-empty">
            <Box className="rep-ico rep-ico--empty">
              <IconInbox size={20} />
            </Box>
            <Text fw={600} c="var(--text-strong)" mt="sm">
              ບໍ່ພົບຜູ້ເຊົ່າ
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
        size={820}
        classNames={{ content: "ten-modal" }}
      >
        <div className="tenm-head">
          <span className="tenm-head-ico">
            <IconUserPlus size={19} />
          </span>
          <div className="tenm-head-copy">
            <span className="tenm-eyebrow">ທະບຽນຜູ້ເຊົ່າ</span>
            <Text className="tenm-title">{editingRoom ? "ແກ້ໄຂຜູ້ເຊົ່າ" : "ເພີ່ມຜູ້ເຊົ່າໃໝ່"}</Text>
            <Text className="tenm-sub">
              {editingRoom
                ? `ຫ້ອງ ${editingRoom} · ບັນທຶກຂອງ ${monthLabel(monthNumber, year)}`
                : `ບັນທຶກຜູ້ເຊົ່າ ສຳລັບ ${monthLabel(monthNumber, year)}`}
            </Text>
          </div>
          <ActionIcon className="tenm-close" variant="subtle" color="gray" onClick={() => setOpened(false)} aria-label="ປິດ">
            <IconX size={17} />
          </ActionIcon>
        </div>

        <div className="tenm-body">
          <aside className="tenm-aside">
            <div className="tenm-preview">
              <span className="tenm-ava">{initials(form.name) || "ຜ"}</span>
              <div className="tenm-pcopy">
                <span className="tenm-pname">{form.name.trim() || "ຊື່ຜູ້ເຊົ່າ"}</span>
                <span className="tenm-proom">{form.room ? `ຫ້ອງ ${form.room}` : "ຍັງບໍ່ເລືອກຫ້ອງ"}</span>
              </div>
              <span className={`ten-pill is-${form.stayStatus}`}>
                <span className="ten-led" />
                {STAY_META[form.stayStatus].label}
              </span>
            </div>

            <div className="tenm-figs">
              <div className="tenm-fig">
                <span className="tenm-fig-k">ເງິນມັດຈຳ</span>
                <span className="tenm-fig-v tnum">{money(form.deposit, data.settings.currency)}</span>
              </div>
              <div className="tenm-fig">
                <span className="tenm-fig-k">ສັນຍາ</span>
                <span className="tenm-fig-v">{form.contract}</span>
              </div>
            </div>

            <p className="tenm-note">ບັນທຶກແລ້ວ ລະບົບຈະປັບສະຖານະຫ້ອງໃຫ້ອັດຕະໂນມັດ</p>
          </aside>

          <div className="tenm-form">
            <section className="tenm-sec">
              <div className="tenm-sec-head">
                <span className="tenm-step">01</span>
                <span className="tenm-sec-title">ຂໍ້ມູນຜູ້ເຊົ່າ</span>
                <span className="tenm-rule" />
              </div>
              <div className="tenm-grid">
                <TextInput
                  className="tenm-span2"
                  label="ຊື່ຜູ້ເຊົ່າ"
                  placeholder="ຊື່ ແລະ ນາມສະກຸນ"
                  leftSection={<IconUser size={15} />}
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
                  required
                />
                <Select
                  label="ຫ້ອງ"
                  leftSection={<IconHome size={15} />}
                  data={data.rooms.map((room) => room.no)}
                  value={form.room || null}
                  onChange={(value) => setForm({ ...form, room: value || "" })}
                  placeholder="ເລືອກຫ້ອງ"
                  searchable
                  required
                />
                <TextInput
                  label="ເບີໂທ"
                  leftSection={<IconPhone size={15} />}
                  placeholder="020 …"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.currentTarget.value })}
                />
                <NumberInput
                  label="ຈຳນວນຄົນ"
                  leftSection={<IconUsers size={15} />}
                  value={form.people}
                  onChange={(value) => setForm({ ...form, people: Number(value) || 1 })}
                  min={1}
                  max={20}
                />
                <TextInput
                  label="ວັນເຂົ້າຢູ່"
                  leftSection={<IconCalendar size={15} />}
                  value={form.moveIn}
                  onChange={(event) => setForm({ ...form, moveIn: event.currentTarget.value })}
                  placeholder="01 ມ.ກ. 26"
                />
              </div>
            </section>

            <section className="tenm-sec">
              <div className="tenm-sec-head">
                <span className="tenm-step">02</span>
                <span className="tenm-sec-title">ການເງິນ</span>
                <span className="tenm-rule" />
              </div>
              <div className="tenm-grid">
                <NumberInput
                  label="ຄ່າເຊົ່າ (₭)"
                  leftSection={<IconCash size={15} />}
                  value={form.rent}
                  onChange={(value) => setForm({ ...form, rent: Number(value) || 0 })}
                  min={0}
                  thousandSeparator=","
                />
                <NumberInput
                  label="ເງິນມັດຈຳ (₭)"
                  leftSection={<IconWallet size={15} />}
                  value={form.deposit}
                  onChange={(value) => setForm({ ...form, deposit: Number(value) || 0 })}
                  min={0}
                  thousandSeparator=","
                />
              </div>
            </section>

            <section className="tenm-sec">
              <div className="tenm-sec-head">
                <span className="tenm-step">03</span>
                <span className="tenm-sec-title">ສັນຍາ ແລະ ສະຖານະ</span>
                <span className="tenm-rule" />
              </div>
              <div className="tenm-grid">
                <Select
                  label="ສັນຍາ"
                  leftSection={<IconFileText size={15} />}
                  data={["1 ປີ", "6 ເດືອນ", "ບໍ່ມີສັນຍາ"]}
                  value={form.contract}
                  onChange={(value) => setForm({ ...form, contract: value || "ບໍ່ມີສັນຍາ" })}
                />
                <Select
                  label="ສະຖານະ"
                  leftSection={<IconCircleCheck size={15} />}
                  data={Object.entries(STAY_META).map(([value, meta]) => ({ value, label: meta.label }))}
                  value={form.stayStatus}
                  onChange={(value) => setForm({ ...form, stayStatus: (value as StayStatus) || "resident" })}
                />
              </div>
            </section>
          </div>
        </div>

        <div className="tenm-foot">
          <span className="tenm-foot-note">* ຊ່ອງທີ່ມີເຄື່ອງໝາຍດາວ ຈຳເປັນຕ້ອງຕື່ມ</span>
          <Group className="tenm-foot-actions">
            <Button variant="default" onClick={() => setOpened(false)}>
              ຍົກເລີກ
            </Button>
            <Button
              className="btn-grad"
              leftSection={<IconCheck size={15} />}
              onClick={submit}
              loading={savingForm}
              disabled={!form.name.trim() || !form.room}
            >
              ບັນທຶກ
            </Button>
          </Group>
        </div>
      </Modal>

      <ConfirmDialog
        opened={!!pending}
        title="ລຶບຜູ້ເຊົ່ານີ້?"
        description="ລຶບແລ້ວຈະບໍ່ສາມາດກູ້ຄືນໄດ້ ແລະ ຂໍ້ມູນຈະຖືກຕັດອອກຈາກເດືອນນີ້."
        confirmLabel="ລຶບຜູ້ເຊົ່າ"
        busyLabel="ກຳລັງລຶບ…"
        doneLabel="ລຶບສຳເລັດ"
        state={confirmState}
        error={confirmError}
        targetIcon={<IconUser size={17} />}
        targetColor="#1663c4"
        targetTitle={pending ? pending.name : ""}
        targetMeta={pending ? `ຫ້ອງ ${pending.room} · ${monthLabel(monthNumber, year)}` : ""}
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
