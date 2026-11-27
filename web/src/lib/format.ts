export const MONTH_FULL = [
  "ມັງກອນ", "ກຸມພາ", "ມີນາ", "ເມສາ", "ພຶດສະພາ", "ມິຖຸນາ",
  "ກໍລະກົດ", "ສິງຫາ", "ກັນຍາ", "ຕຸລາ", "ພະຈິກ", "ທັນວາ"
];

export const MONTH_SHORT = [
  "ມ.ກ.", "ກ.ພ.", "ມ.ີ.", "ເ.ສ.", "ພ.ພ.", "ມິ.ຖ.",
  "ກ.ລ.", "ສ.ຫ.", "ກ.ຍ.", "ຕ.ລ.", "ພ.ຈ.", "ທ.ວ."
];

export function money(n: number, currency = "₭"): string {
  return Math.round(Number(n) || 0).toLocaleString("en-US") + " " + currency;
}

export function num(n: number): string {
  return (Number(n) || 0).toLocaleString("en-US");
}

export function millions(n: number): string {
  return (Number(n || 0) / 1000000).toFixed(1).replace(/\.0$/, "") + " ລ້ານ";
}

// ເລກໃບບີນໃນຖານຂໍ້ມູນເປັນ INV-202612-1 — ສະແດງຜົນໃຫ້ອ່ານງ່າຍເປັນ INV-2026-12-1
export function invoiceNoLabel(no: string): string {
  const match = /^([A-Z]{2,})-(\d{4})(\d{2})-(.+)$/.exec(String(no || "").trim());
  if (!match) return String(no || "");
  return `${match[1]}-${match[2]}-${match[3]}-${match[4]}`;
}

export function monthLabel(m: number, y: number): string {
  return MONTH_FULL[m - 1] + " " + y;
}

export function shortMonth(m: number, y: number): string {
  return MONTH_SHORT[m - 1] + " " + String(y).slice(2);
}

export const monthKey = (y: number, m: number) => `${Number(y)}-${String(m).padStart(2, "0")}`;

export const ratesKeyOf = (y: number, m: number) => `${Number(y)}-${Number(m)}`;

export function monthIndex(y: number, m: number): number {
  return Number(y) * 12 + Number(m);
}

export function parseMonthKey(key: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{1,2})$/.exec(key);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}
