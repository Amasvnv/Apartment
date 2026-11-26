import {
  ActionIcon,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  NumberInput,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip
} from "@mantine/core";
import { IconDeviceFloppy, IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import MonthSwitcher from "../components/MonthSwitcher";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../auth/auth";
import { useStore } from "../data/store";
import type { ExtraFee } from "../data/types";
import { ctxOf, extraFeesFor, ratesForMonth } from "../lib/compute";
import { logActivity } from "../lib/dataOps";
import { money, monthLabel, ratesKeyOf } from "../lib/format";

export default function Settings() {
  const { data, update, month } = useStore();
  const { canEdit } = useAuth();
  const ctx = useMemo(() => ctxOf(data), [data]);
  const { year, month: monthNumber } = month;
  const key = ratesKeyOf(year, monthNumber);
  const currency = data.settings.currency;

  const base = data.settings;
  const [baseForm, setBaseForm] = useState({
    rent: base.rent,
    electricRate: base.electricRate,
    waterTotal: base.waterTotal,
    trashTotal: base.trashTotal,
    serviceFee: base.serviceFee
  });

  const effective = ratesForMonth(base, year, monthNumber);
  const [monthForm, setMonthForm] = useState({ ...effective });
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

  const saveBase = () => {
    update((draft) => {
      draft.settings.rent = Number(baseForm.rent) || 0;
      draft.settings.electricRate = Number(baseForm.electricRate) || 0;
      draft.settings.waterTotal = Number(baseForm.waterTotal) || 0;
      draft.settings.trashTotal = Number(baseForm.trashTotal) || 0;
      draft.settings.serviceFee = Number(baseForm.serviceFee) || 0;
      logActivity(draft, "settings", "ແກ້ໄຂອັດຕາຫຼັກ", `ຄ່າເຊົ່າ ${money(draft.settings.rent, currency)}`);
    });
  };

  const saveMonth = () => {
    update((draft) => {
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
  };

  const saveExtras = () => {
    update((draft) => {
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
  };

  const extraTotal = fees.filter((fee) => fee.active).reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0);

  return (
    <Stack gap="lg" pb="xl">
      <PageHeader title="ຕັ້ງຄ່າອັດຕາຄ່າບໍລິການ" subtitle="ຄ່າເຊົ່າ ໄຟຟ້າ ນ້ຳ ຂີ້ເຫຍື້ອ ແລະ ຄ່າບໍລິການ" actions={<MonthSwitcher />} />

      <Tabs defaultValue="base" radius="md" keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="base">ອັດຕາຫຼັກ</Tabs.Tab>
          <Tabs.Tab value="month">ອັດຕາ {monthLabel(monthNumber, year)}</Tabs.Tab>
          <Tabs.Tab value="extras">ຂໍ້ຄວາມ & ຄ່າເພີ່ມເຕີມ</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="base">
          <Card padding="lg">
            <Group justify="space-between" mb="md">
              <Title order={3}>ອັດຕາທີ່ໃຊ້ທຸກເດືອນ</Title>
              <Button leftSection={<IconDeviceFloppy size={15} />} onClick={saveBase} disabled={!canEdit("settings")}>
                ບັນທຶກ
              </Button>
            </Group>
            <Grid gutter="md">
              <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
                <NumberInput
                  label="ຄ່າເຊົ່າ (₭/ເດືອນ)"
                  value={baseForm.rent}
                  onChange={(value) => setBaseForm({ ...baseForm, rent: Number(value) || 0 })}
                  min={0}
                  thousandSeparator=","
                  disabled={!canEdit("settings")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
                <NumberInput
                  label="ອັດຕາໄຟຟ້າ (₭/kWh)"
                  value={baseForm.electricRate}
                  onChange={(value) => setBaseForm({ ...baseForm, electricRate: Number(value) || 0 })}
                  min={0}
                  thousandSeparator=","
                  disabled={!canEdit("settings")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
                <NumberInput
                  label="ຄ່ານ້ຳລວມ (₭/ເດືອນ)"
                  description="ຫານຕາມຈຳນວນຄົນຢູ່ປະຈຳ"
                  value={baseForm.waterTotal}
                  onChange={(value) => setBaseForm({ ...baseForm, waterTotal: Number(value) || 0 })}
                  min={0}
                  thousandSeparator=","
                  disabled={!canEdit("settings")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
                <NumberInput
                  label="ຄ່າຂີ້ເຫຍື້ອລວມ (₭/ເດືອນ)"
                  description="ຫານຕາມຈຳນວນຫ້ອງຢູ່ປະຈຳ"
                  value={baseForm.trashTotal}
                  onChange={(value) => setBaseForm({ ...baseForm, trashTotal: Number(value) || 0 })}
                  min={0}
                  thousandSeparator=","
                  disabled={!canEdit("settings")}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
                <NumberInput
                  label="ຄ່າບໍລິການສ່ວນກາງ (₭/ເດືອນ)"
                  description="ຫານຕາມຈຳນວນຫ້ອງ"
                  value={baseForm.serviceFee}
                  onChange={(value) => setBaseForm({ ...baseForm, serviceFee: Number(value) || 0 })}
                  min={0}
                  thousandSeparator=","
                  disabled={!canEdit("settings")}
                />
              </Grid.Col>
            </Grid>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="month">
          <Card padding="lg">
            <Group justify="space-between" mb="md">
              <BoxTitle title={`ອັດຕາສະເພາະ ${monthLabel(monthNumber, year)}`} note="ຖ້າບໍ່ແກ້ໄຂ ຈະໃຊ້ອັດຕາຫຼັກ" />
              <Button leftSection={<IconDeviceFloppy size={15} />} onClick={saveMonth} disabled={!canEdit("settings")}>
                ບັນທຶກ
              </Button>
            </Group>
            <Grid gutter="md">
              {(
                [
                  ["rent", "ຄ່າເຊົ່າ", "₭/ເດືອນ"],
                  ["electricRate", "ອັດຕາໄຟຟ້າ", "₭/kWh"],
                  ["waterTotal", "ຄ່ານ້ຳລວມ", "₭/ເດືອນ"],
                  ["trashTotal", "ຄ່າຂີ້ເຫຍື້ອລວມ", "₭/ເດືອນ"],
                  ["serviceFee", "ຄ່າບໍລິການສ່ວນກາງ", "₭/ເດືອນ"]
                ] as const
              ).map(([field, label, unit]) => (
                <Grid.Col key={field} span={{ base: 12, sm: 6, lg: 4 }}>
                  <NumberInput
                    label={`${label} (${unit})`}
                    value={monthForm[field]}
                    onChange={(value) => setMonthForm({ ...monthForm, [field]: Number(value) || 0 })}
                    min={0}
                    thousandSeparator=","
                    disabled={!canEdit("settings")}
                  />
                </Grid.Col>
              ))}
            </Grid>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="extras">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, lg: 6 }}>
              <Card padding="lg" h="100%">
                <Title order={3} mb="xs">
                  ຂໍ້ຄວາມປະຈຳເດືອນ
                </Title>
                <Text size="xs" c="#7C93B0" mb="sm">
                  ສະແດງຢູ່ໃບບີນເກັບເງິນຂອງ {monthLabel(monthNumber, year)}
                </Text>
                <Stack gap="sm">
                  <Textarea
                    label="ຂໍ້ຄວາມ 1"
                    value={note1}
                    onChange={(event) => setNote1(event.currentTarget.value)}
                    autosize
                    minRows={2}
                    disabled={!canEdit("settings")}
                  />
                  <Textarea
                    label="ຂໍ້ຄວາມ 2"
                    value={note2}
                    onChange={(event) => setNote2(event.currentTarget.value)}
                    autosize
                    minRows={2}
                    disabled={!canEdit("settings")}
                  />
                  <Button leftSection={<IconDeviceFloppy size={15} />} onClick={saveExtras} disabled={!canEdit("settings")}>
                    ບັນທຶກຂໍ້ຄວາມ ແລະ ຄ່າເພີ່ມເຕີມ
                  </Button>
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 6 }}>
              <Card padding="lg" h="100%">
                <Group justify="space-between" mb="xs">
                  <Title order={3}>ຄ່າບໍລິການເພີ່ມເຕີມ</Title>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => setFees([...fees, { name: "", amount: 0, active: true }])}
                    disabled={!canEdit("settings")}
                  >
                    ເພີ່ມ
                  </Button>
                </Group>
                <Text size="xs" c="#7C93B0" mb="sm">
                  ຫານຕາມຈຳນວນຫ້ອງຢູ່ປະຈຳ · ລວມທີ່ເປີດໃຊ້ {money(extraTotal, currency)}
                </Text>
                <Stack gap="sm">
                  {fees.map((fee, index) => (
                    <Group key={index} align="flex-end" gap="xs" wrap="nowrap">
                      <TextInput
                        label={index === 0 ? "ລາຍການ" : undefined}
                        placeholder="ເຊັ່ນ ຄ່າອິນເຕີເນັດ"
                        value={fee.name}
                        onChange={(event) => {
                          const next = [...fees];
                          next[index] = { ...fee, name: event.currentTarget.value };
                          setFees(next);
                        }}
                        style={{ flex: 1 }}
                        disabled={!canEdit("settings")}
                      />
                      <NumberInput
                        label={index === 0 ? "ຈຳນວນ (₭)" : undefined}
                        value={fee.amount}
                        onChange={(value) => {
                          const next = [...fees];
                          next[index] = { ...fee, amount: Number(value) || 0 };
                          setFees(next);
                        }}
                        min={0}
                        thousandSeparator=","
                        w={130}
                        disabled={!canEdit("settings")}
                      />
                      <Tooltip label="ເປີດໃຊ້">
                        <Switch
                          checked={fee.active}
                          onChange={(event) => {
                            const next = [...fees];
                            next[index] = { ...fee, active: event.currentTarget.checked };
                            setFees(next);
                          }}
                          mb={8}
                          disabled={!canEdit("settings")}
                        />
                      </Tooltip>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        mb={4}
                        onClick={() => setFees(fees.filter((_, i) => i !== index))}
                        disabled={!canEdit("settings")}
                        aria-label="ລຶບລາຍການ"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  ))}
                  {!fees.length ? (
                    <Text size="sm" c="#7C93B0" ta="center" py="md">
                      ຍັງບໍ່ມີຄ່າເພີ່ມເຕີມໃນເດືອນນີ້
                    </Text>
                  ) : null}
                </Stack>
                <Divider my="sm" />
                <Text size="xs" c="#8AA0BB">
                  ຕົວຢ່າງ: ຫ້ອງທີ່ຢູ່ປະຈຳ {Math.max(1, ctx.tenants.filter((tenant) => tenant.stayStatus !== "away").length)} ຫ້ອງ
                  → ຫ້ອງລະ {money(extraTotal / Math.max(1, ctx.tenants.filter((tenant) => tenant.stayStatus !== "away").length), currency)}
                </Text>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function BoxTitle({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <Text fw={600}>{title}</Text>
      <Text size="xs" c="#7C93B0">
        {note}
      </Text>
    </div>
  );
}
