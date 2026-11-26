import { ActionIcon, Group, Select } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useStore } from "../data/store";
import { MONTH_FULL } from "../lib/format";

const MONTH_OPTIONS = MONTH_FULL.map((label, index) => ({ value: String(index + 1), label }));

export default function MonthSwitcher() {
  const { data, month, setMonth } = useStore();
  const { year, month: monthNumber } = month;

  const years = new Set<number>([year, year - 1, year + 1]);
  data.invoices.forEach((invoice) => years.add(Number(invoice.year)));
  const yearOptions = [...years]
    .filter((value) => Number.isFinite(value) && value > 2000)
    .sort((a, b) => a - b)
    .map((value) => ({ value: String(value), label: String(value) }));

  const shift = (delta: number) => {
    const index = year * 12 + (monthNumber - 1) + delta;
    setMonth({ year: Math.floor(index / 12), month: (index % 12) + 1 });
  };

  return (
    <Group gap={6} wrap="nowrap">
      <ActionIcon variant="default" size="lg" radius="md" onClick={() => shift(-1)} aria-label="ເດືອນກ່ອນ">
        <IconChevronLeft size={16} />
      </ActionIcon>
      <Select
        value={String(monthNumber)}
        onChange={(value) => value && setMonth({ year, month: Number(value) })}
        data={MONTH_OPTIONS}
        allowDeselect={false}
        w={128}
        size="sm"
        radius="md"
        aria-label="ເດືອນ"
      />
      <Select
        value={String(year)}
        onChange={(value) => value && setMonth({ year: Number(value), month: monthNumber })}
        data={yearOptions}
        allowDeselect={false}
        w={96}
        size="sm"
        radius="md"
        aria-label="ປີ"
      />
      <ActionIcon variant="default" size="lg" radius="md" onClick={() => shift(1)} aria-label="ເດືອນຕໍ່ໄປ">
        <IconChevronRight size={16} />
      </ActionIcon>
    </Group>
  );
}
