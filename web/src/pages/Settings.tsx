import {
  ActionIcon,
  Box,
  Button,
  Grid,
  Group,
  NumberInput,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Tooltip
} from "@mantine/core";
import {
  IconBolt,
  IconBuilding,
  IconCalendarMonth,
  IconCoin,
  IconDeviceFloppy,
  IconDroplet,
  IconHome,
  IconNotes,
  IconPlus,
  IconTrash
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import MonthSwitcher from "../components/MonthSwitcher";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";
import type { ExtraFee } from "../data/types";
import { ctxOf, extraFeesFor, ratesForMonth } from "../lib/compute";
import { logActivity } from "../lib/dataOps";
import { money, monthLabel, ratesKeyOf } from "../lib/format";
import { notifyStatus } from "../lib/notify";

const RATE_FIELDS = [
  {
    key: "rent",
    label: "ຄ່າເຊົ່າ",
    unit: "₭ / ເດືອນ",
    tone: "#2f83e8",
    icon: <IconHome size={15} />,
    hint: "ຄ່າເຊົ່າພື້ນຖານຕໍ່ຫ້ອງ"
  },
  {
    key: "electricRate",
    label: "ອັດຕາໄຟຟ້າ",
    unit: "₭ / kWh",
    tone: "#e8a33d",
    icon: <IconBolt size={15} />,
    hint: "ຄິດຕາມຫົວໜ່ວຍທີ່ໃຊ້ຕົວຈິງ"
  },
  {
    key: "waterTotal",
    label: "ຄ່ານ້ຳລວມ",
    unit: "₭ / ເດືອນ",
    tone: "#0ea5c6",
    icon: <IconDroplet size={15} />,
    hint: "ຫານຕາມຈຳນວນຄົນຢູ່ປະຈຳ"
  },
  {
    key: "trashTotal",
    label: "ຄ່າຂີ້ເຫຍື້ອລວມ",
    unit: "₭ / ເດືອນ",
    tone: "#12a06a",
    icon: <IconTrash size={15} />,
    hint: "ຫານຕາມຈຳນວນຫ້ອງຢູ່ປະຈຳ"
  },
  {
    key: "serviceFee",
    label: "ຄ່າບໍລິການສ່ວນກາງ",
    unit: "₭ / ເດືອນ",
    tone: "#8b5cf6",
    icon: <IconBuilding size={15} />,
    hint: "ຫານຕາມຈຳນວນຫ້ອງ"
  }
] as const;

type RateKey = (typeof RATE_FIELDS)[number]["key"];
type RateForm = Record<RateKey, number>;

export default function Settings() {
  const { data, commit, month } = useStore();
  const { canEdit } = useAuth();
  const ctx = useMemo(() => ctxOf(data), [data]);
  const { year, month: monthNumber } = month;
  const key = ratesKeyOf(year, monthNumber);
  const currency = data.settings.currency;
  const editable = canEdit("settings");

  const base = data.settings;
  const [baseForm, setBaseForm] = useState<RateForm>({
    rent: base.rent,
    electricRate: base.electricRate,
    waterTotal: base.waterTotal,
    trashTotal: base.trashTotal,
    serviceFee: base.serviceFee
  });

  const effective = ratesForMonth(base, year, monthNumber);
  const [monthForm, setMonthForm] = useState<RateForm>({ ...effective });
  const [note1, setNote1] = useState(base.monthNotes?.[key] || "");
  const [note2, setNote2] = useState(base.monthNotes2?.[key] || "");
  const [fees, setFees] = useState<ExtraFee[]>(extraFeesFor(base, year, monthNumber));

  useEffect(() => {
    const rates = ratesForMonth(base, year, monthNumber);
    setMonthForm({ ...rates });
    setNote1(base.monthNotes?.[key] || "");
    setNote2(base.monthNotes2?.[key] || "");
    setFees(extraFeesFor(base, year, monthNumber));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const saveBase = async () => {
    const ok = await commit((draft) => {
      draft.settings.rent = Number(baseForm.rent) || 0;
      draft.settings.electricRate = Number(baseForm.electricRate) || 0;
      draft.settings.waterTotal = Number(baseForm.waterTotal) || 0;
      draft.settings.trashTotal = Number(baseForm.trashTotal) || 0;
      draft.settings.serviceFee = Number(baseForm.serviceFee) || 0;
      logActivity(draft, "settings", "ແກ້ໄຂອັດຕາຫຼັກ", `ຄ່າເຊົ່າ ${money(draft.settings.rent, currency)}`);
    });
    notifyStatus(
      ok ? "success" : "danger",
      ok ? "ບັນທຶກອັດຕາຫຼັກສຳເລັດ" : "ບັນທຶກບໍ່ສຳເລັດ",
      `ຄ່າເຊົ່າ ${money(Number(baseForm.rent) || 0, currency)} · ໄຟຟ້າ ${money(Number(baseForm.electricRate) || 0, currency)}/kWh`
    );
  };

  const saveMonth = async () => {
    const ok = await commit((draft) => {
      if (!draft.settings.ratesByMonth) draft.settings.ratesByMonth = {};
      draft.settings.ratesByMonth[key] = {
        rent: Number(monthForm.rent) || 0,
        electricRate: Number(monthForm.electricRate) || 0,
        waterTotal: Number(monthForm.waterTotal) || 0,
        trashTotal: Number(monthForm.trashTotal) || 0,
        serviceFee: Number(monthForm.serviceFee) || 0
      };
      logActivity(draft, "settings", "ແກ້ໄຂອັດຕາເດືອນ", monthLabel(monthNumber, year));
    });
    notifyStatus(
      ok ? "success" : "danger",
      ok ? "ບັນທຶກອັດຕາເດືອນສຳເລັດ" : "ບັນທຶກບໍ່ສຳເລັດ",
      `${monthLabel(monthNumber, year)} · ຄ່າເຊົ່າ ${money(Number(monthForm.rent) || 0, currency)}`
    );
  };

  const saveExtras = async () => {
    const ok = await commit((draft) => {
      const clean = fees
        .filter((fee) => fee.name.trim() || Number(fee.amount))
        .map((fee) => ({ name: fee.name.trim(), amount: Number(fee.amount) || 0, active: !!fee.active }));
      if (!draft.settings.extraFeesByMonth) draft.settings.extraFeesByMonth = {};
      if (clean.length) draft.settings.extraFeesByMonth[key] = clean;
      else delete draft.settings.extraFeesByMonth[key];
      if (!draft.settings.monthNotes) draft.settings.monthNotes = {};
      if (!draft.settings.monthNotes2) draft.settings.monthNotes2 = {};
      if (note1.trim()) draft.settings.monthNotes[key] = note1.trim();
      else delete draft.settings.monthNotes[key];
      if (note2.trim()) draft.settings.monthNotes2[key] = note2.trim();
      else delete draft.settings.monthNotes2[key];
      logActivity(draft, "settings", "ບັນທຶກຂໍ້ຄວາມ ແລະ ຄ່າເພີ່ມເຕີມ", monthLabel(monthNumber, year));
    });
    notifyStatus(
      ok ? "success" : "danger",
      ok ? "ບັນທຶກຂໍ້ຄວາມ ແລະ ຄ່າພິເສດສຳເລັດ" : "ບັນທຶກບໍ່ສຳເລັດ",
      `${monthLabel(monthNumber, year)} · ຄ່າເພີ່ມເຕີມ ${fees.filter((fee) => fee.active).length} ລາຍການ`
    );
  };

  const extraTotal = fees.filter((fee) => fee.active).reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0);
  const stayingRooms = Math.max(1, ctx.tenants.filter((tenant) => tenant.stayStatus !== "away").length);

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader
        title="ຕັ້ງຄ່າອັດຕາຄ່າບໍລິການ"
        subtitle="ຄ່າເຊົ່າ ໄຟຟ້າ ນ້ຳ ຂີ້ເຫຍື້ອ ແລະ ຄ່າບໍລິການ"
        actions={<MonthSwitcher />}
      />

      <Tabs defaultValue="base" keepMounted={false} className="set-tabs">
        <Tabs.List>
          <Tabs.Tab value="base" leftSection={<IconCoin size={15} />}>
            ອັດຕາຫຼັກ
          </Tabs.Tab>
          <Tabs.Tab value="month" leftSection={<IconCalendarMonth size={15} />}>
            ອັດຕາ {monthLabel(monthNumber, year)}
          </Tabs.Tab>
          <Tabs.Tab value="extras" leftSection={<IconNotes size={15} />}>
            ຂໍ້ຄວາມ & ຄ່າເພີ່ມເຕີມ
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="base" pt="lg">
          <Box className="set-panel">
            <PanelHead
              icon={<IconCoin size={17} />}
              title="ອັດຕາທີ່ໃຊ້ທຸກເດືອນ"
              note="ໃຊ້ເປັນຄ່າຕັ້ງຕົ້ນໃຫ້ທຸກເດືອນ ທີ່ບໍ່ໄດ້ກຳນົດອັດຕາເດືອນໄວ້"
              action={
                <Button
                  className="btn-grad"
                  radius="xl"
                  leftSection={<IconDeviceFloppy size={15} />}
                  onClick={saveBase}
                  disabled={!editable}
                >
                  ບັນທຶກ
                </Button>
              }
            />

            <Box className="set-fields">
              {RATE_FIELDS.map((field) => (
                <RateField
                  key={field.key}
                  icon={field.icon}
                  label={field.label}
                  unit={field.unit}
                  tone={field.tone}
                  hint={field.hint}
                  value={baseForm[field.key]}
                  disabled={!editable}
                  onChange={(value) => setBaseForm({ ...baseForm, [field.key]: value })}
                />
              ))}
            </Box>

            <Text className="set-foot">
              ອັດຕາເຫຼົ່ານີ້ຖືກໃຊ້ກັບທຸກເດືອນ ຍົກເວັ້ນເດືອນທີ່ຕັ້ງອັດຕາແຍກໄວ້ໃນແທັບ “ອັດຕາເດືອນ”.
            </Text>
          </Box>
        </Tabs.Panel>

        <Tabs.Panel value="month" pt="lg">
          <Box className="set-panel">
            <PanelHead
              icon={<IconCalendarMonth size={17} />}
              title={`ອັດຕາສະເພາະ ${monthLabel(monthNumber, year)}`}
              note="ຖ້າບໍ່ແກ້ໄຂ ຈະໃຊ້ອັດຕາຫຼັກຂອງທຸກເດືອນ"
              action={
                <Button
                  className="btn-grad"
                  radius="xl"
                  leftSection={<IconDeviceFloppy size={15} />}
                  onClick={saveMonth}
                  disabled={!editable}
                >
                  ບັນທຶກ
                </Button>
              }
            />

            <Box className="set-fields">
              {RATE_FIELDS.map((field) => (
                <RateField
                  key={field.key}
                  icon={field.icon}
                  label={field.label}
                  unit={field.unit}
                  tone={field.tone}
                  hint={field.hint}
                  value={monthForm[field.key]}
                  disabled={!editable}
                  onChange={(value) => setMonthForm({ ...monthForm, [field.key]: value })}
                />
              ))}
            </Box>

            <Text className="set-foot">
              ອັດຕາໃນແທັບນີ້ໃຊ້ສະເພາະໃບບີນຂອງ {monthLabel(monthNumber, year)} ເທົ່ານັ້ນ.
            </Text>
          </Box>
        </Tabs.Panel>

        <Tabs.Panel value="extras" pt="lg">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, lg: 6 }}>
              <Box className="set-panel" h="100%">
                <PanelHead
                  icon={<IconNotes size={17} />}
                  title="ຂໍ້ຄວາມປະຈຳເດືອນ"
                  note={`ສະແດງຢູ່ໃບບີນເກັບເງິນຂອງ ${monthLabel(monthNumber, year)}`}
                />
                <Stack gap="sm" mt="md">
                  <Textarea
                    label="ຂໍ້ຄວາມ 1"
                    value={note1}
                    onChange={(event) => setNote1(event.currentTarget.value)}
                    autosize
                    minRows={2}
                    disabled={!editable}
                  />
                  <Textarea
                    label="ຂໍ້ຄວາມ 2"
                    value={note2}
                    onChange={(event) => setNote2(event.currentTarget.value)}
                    autosize
                    minRows={2}
                    disabled={!editable}
                  />
                  <Button
                    className="btn-grad"
                    radius="xl"
                    mt={4}
                    leftSection={<IconDeviceFloppy size={15} />}
                    onClick={saveExtras}
                    disabled={!editable}
                  >
                    ບັນທຶກຂໍ້ຄວາມ ແລະ ຄ່າເພີ່ມເຕີມ
                  </Button>
                </Stack>
              </Box>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 6 }}>
              <Box className="set-panel" h="100%">
                <PanelHead
                  icon={<IconPlus size={17} />}
                  title="ຄ່າບໍລິການເພີ່ມເຕີມ"
                  note={`ຫານຕາມຈຳນວນຫ້ອງຢູ່ປະຈຳ · ລວມ ${money(extraTotal, currency)}`}
                  action={
                    <Button
                      size="xs"
                      radius="xl"
                      variant="light"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => setFees([...fees, { name: "", amount: 0, active: true }])}
                      disabled={!editable}
                    >
                      ເພີ່ມ
                    </Button>
                  }
                />

                <Group className="set-fee-head" gap="xs" wrap="nowrap" mt="md">
                  <span className="set-col">ລາຍການ</span>
                  <span className="set-col set-col--amt">ຈຳນວນ (₭)</span>
                  <span className="set-col set-col--sw">ເປີດ</span>
                  <span className="set-col--x" />
                </Group>

                <Stack gap={8} mt={6}>
                  {fees.map((fee, index) => (
                    <Group key={index} className="set-fee" gap="xs" wrap="nowrap">
                      <TextInput
                        placeholder="ເຊັ່ນ ຄ່າອິນເຕີເນັດ"
                        value={fee.name}
                        onChange={(event) => {
                          const next = [...fees];
                          next[index] = { ...fee, name: event.currentTarget.value };
                          setFees(next);
                        }}
                        style={{ flex: 1 }}
                        variant="unstyled"
                        disabled={!editable}
                      />
                      <NumberInput
                        value={fee.amount}
                        onChange={(value) => {
                          const next = [...fees];
                          next[index] = { ...fee, amount: Number(value) || 0 };
                          setFees(next);
                        }}
                        min={0}
                        thousandSeparator=","
                        w={116}
                        variant="unstyled"
                        disabled={!editable}
                      />
                      <Tooltip label="ເປີດໃຊ້">
                        <Switch
                          checked={fee.active}
                          onChange={(event) => {
                            const next = [...fees];
                            next[index] = { ...fee, active: event.currentTarget.checked };
                            setFees(next);
                          }}
                          disabled={!editable}
                        />
                      </Tooltip>
                      <Tooltip label="ລຶບລາຍການ">
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          radius="xl"
                          onClick={() => setFees(fees.filter((_, i) => i !== index))}
                          disabled={!editable}
                          aria-label="ລຶບລາຍການ"
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  ))}

                  {!fees.length ? (
                    <Box className="set-fee-empty">
                      <Text size="sm" c="var(--text-muted)">
                        ຍັງບໍ່ມີຄ່າເພີ່ມເຕີມໃນເດືອນນີ້
                      </Text>
                    </Box>
                  ) : null}
                </Stack>

                <Box className="set-note" mt="md">
                  ຕົວຢ່າງ: ຫ້ອງທີ່ຢູ່ປະຈຳ {stayingRooms} ຫ້ອງ → ຫ້ອງລະ {money(extraTotal / stayingRooms, currency)}
                </Box>
              </Box>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function PanelHead({
  icon,
  title,
  note,
  action
}: {
  icon: ReactNode;
  title: string;
  note: string;
  action?: ReactNode;
}) {
  return (
    <Group className="set-head" gap={12} wrap="nowrap" justify="space-between" align="center">
      <Group gap={12} wrap="nowrap" align="center">
        <Box className="set-head-ico">{icon}</Box>
        <Box style={{ minWidth: 0 }}>
          <Text className="set-head-title">{title}</Text>
          <Text className="set-head-note">{note}</Text>
        </Box>
      </Group>
      {action}
    </Group>
  );
}

function RateField({
  icon,
  label,
  unit,
  tone,
  hint,
  value,
  onChange,
  disabled
}: {
  icon: ReactNode;
  label: string;
  unit: string;
  tone: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <Box className="set-field" style={{ "--tone": tone } as CSSProperties}>
      <Group className="set-field-top" gap={8} wrap="nowrap" align="center">
        <Box className="set-field-ico">{icon}</Box>
        <Text className="set-field-label">{label}</Text>
        <Text className="set-field-unit">{unit}</Text>
      </Group>
      <NumberInput
        className="set-input"
        value={value}
        onChange={(next) => onChange(Number(next) || 0)}
        min={0}
        thousandSeparator=","
        hideControls
        variant="unstyled"
        disabled={disabled}
        aria-label={label}
      />
      <Text className="set-field-hint">{hint}</Text>
    </Box>
  );
}
