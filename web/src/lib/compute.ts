import type { AppData, Invoice, Rates, Room, Tenant } from "../data/types";
import { ratesKeyOf } from "./format";

export interface ComputeCtx {
  settings: AppData["settings"];
  rooms: Room[];
  tenants: Tenant[];
  invoices: Invoice[];
  repairs: AppData["repairs"];
}

export const ctxOf = (data: AppData): ComputeCtx => ({
  settings: data.settings,
  rooms: data.rooms,
  tenants: data.tenants,
  invoices: data.invoices,
  repairs: data.repairs
});

export const tenantPeople = (t: Tenant | null | undefined) => Math.max(1, Number(t?.people) || 1);

export const tenantOfRoom = (tenants: Tenant[], roomNo: string) =>
  tenants.find((t) => String(t.room) === String(roomNo)) || null;

const isAway = (t: Tenant) => (t.stayStatus || "resident") === "away";

export function residentPeople(tenants: Tenant[]): number {
  return tenants.reduce((sum, t) => sum + (isAway(t) ? 0 : tenantPeople(t)), 0);
}

export function residentRoomCount(tenants: Tenant[]): number {
  return tenants.filter((t) => !isAway(t)).length;
}

export const roomNoValue = (no: string) => {
  const n = parseFloat(String(no).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : Infinity;
};

export const sortRoomsByNo = (rooms: Room[]) =>
  [...rooms].sort(
    (a, b) => roomNoValue(a.no) - roomNoValue(b.no) || String(a.no).localeCompare(String(b.no), "lo", { numeric: true })
  );

export function baseRates(settings: AppData["settings"]): Rates {
  return {
    rent: Number(settings.rent) || 0,
    electricRate: Number(settings.electricRate) || 0,
    waterTotal: Number(settings.waterTotal) || 0,
    trashTotal: Number(settings.trashTotal) || 0,
    serviceFee: Number(settings.serviceFee) || 0
  };
}

export function ratesForMonth(settings: AppData["settings"], year: number, month: number): Rates {
  const out = baseRates(settings);
  const saved = (settings.ratesByMonth || {})[ratesKeyOf(year, month)];
  if (!saved || typeof saved !== "object") return out;
  (Object.keys(out) as (keyof Rates)[]).forEach((key) => {
    const value = saved[key];
    if (value !== undefined && value !== null && !Number.isNaN(Number(value))) out[key] = Number(value);
  });
  return out;
}

export function waterCostFor(ctx: ComputeCtx, roomNo: string, rates: Rates): number {
  const tenant = tenantOfRoom(ctx.tenants, roomNo);
  if (!tenant || isAway(tenant)) return 0;
  const total = Number(rates.waterTotal ?? ctx.settings.waterTotal ?? 0);
  const people = residentPeople(ctx.tenants);
  return people ? Math.round((total / people) * tenantPeople(tenant)) : 0;
}

export function trashCostFor(ctx: ComputeCtx, roomNo: string, rates: Rates): number {
  const tenant = tenantOfRoom(ctx.tenants, roomNo);
  if (!tenant || isAway(tenant)) return 0;
  const total = Number(rates.trashTotal ?? ctx.settings.trashTotal ?? 0);
  const rooms = residentRoomCount(ctx.tenants);
  return rooms ? Math.round(total / rooms) : 0;
}

export function serviceCostFor(ctx: ComputeCtx, roomNo: string, rates: Rates): number {
  const tenant = tenantOfRoom(ctx.tenants, roomNo);
  if (!tenant || isAway(tenant)) return 0;
  const total = Number(rates.serviceFee ?? ctx.settings.serviceFee ?? 0);
  const rooms = residentRoomCount(ctx.tenants);
  return rooms ? Math.round(total / rooms) : 0;
}

export function extraFeesFor(settings: AppData["settings"], year: number, month: number) {
  const list = (settings.extraFeesByMonth || {})[ratesKeyOf(year, month)];
  return Array.isArray(list) ? list : [];
}

export function otherFeesTotal(settings: AppData["settings"], year: number, month: number): number {
  return extraFeesFor(settings, year, month)
    .filter((fee) => fee.active)
    .reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0);
}

export function extraFeesShareFor(ctx: ComputeCtx, roomNo: string, year: number, month: number): number {
  const tenant = tenantOfRoom(ctx.tenants, roomNo);
  if (!tenant || isAway(tenant)) return 0;
  const rooms = residentRoomCount(ctx.tenants);
  return rooms ? Math.round(otherFeesTotal(ctx.settings, year, month) / rooms) : 0;
}

export function invoiceMonthKey(inv: Invoice): string {
  const match = /^INV-(\d{4})(\d{2})-/.exec(String(inv?.no || ""));
  return match ? `${match[1]}-${match[2]}` : "";
}

export function repairItemsFor(ctx: ComputeCtx, roomNo: string, key: string) {
  if (!key) return [];
  return ctx.repairs.filter(
    (item) => String(item.room) === String(roomNo) && item.status !== "cancelled" && String(item.reported || "").startsWith(key)
  );
}

export function repairCostFor(ctx: ComputeCtx, roomNo: string, key: string): number {
  return repairItemsFor(ctx, roomNo, key).reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
}

export const invoiceRepair = (ctx: ComputeCtx, inv: Invoice) => repairCostFor(ctx, inv.room, invoiceMonthKey(inv));

export const invoiceRates = (ctx: ComputeCtx, inv: Invoice) => ratesForMonth(ctx.settings, inv.year, inv.month);

export function invoiceTotal(ctx: ComputeCtx, inv: Invoice): number {
  const rates = invoiceRates(ctx, inv);
  return (
    Number(inv.rent || 0) +
    serviceCostFor(ctx, inv.room, rates) +
    Number(inv.other || 0) +
    extraFeesShareFor(ctx, inv.room, inv.year, inv.month) +
    Number(inv.kwh || 0) * rates.electricRate +
    waterCostFor(ctx, inv.room, rates) +
    trashCostFor(ctx, inv.room, rates) +
    invoiceRepair(ctx, inv)
  );
}

export function monthInvoices(ctx: ComputeCtx, month: number, year: number): Invoice[] {
  return ctx.invoices.filter((inv) => Number(inv.year) === Number(year) && Number(inv.month) === Number(month));
}

export function yearInvoices(ctx: ComputeCtx, year: number): Invoice[] {
  return ctx.invoices.filter((inv) => Number(inv.year) === Number(year));
}

export interface InvoiceStats {
  total: number;
  paid: number;
  unpaid: number;
  paidCount: number;
  unpaidCount: number;
  rate: number;
  kwh: number;
  m3: number;
}

export function invoiceStats(ctx: ComputeCtx, list: Invoice[]): InvoiceStats {
  const total = list.reduce((sum, inv) => sum + invoiceTotal(ctx, inv), 0);
  const paidList = list.filter((inv) => inv.paid);
  const paid = paidList.reduce((sum, inv) => sum + invoiceTotal(ctx, inv), 0);
  return {
    total,
    paid,
    unpaid: total - paid,
    paidCount: paidList.length,
    unpaidCount: list.length - paidList.length,
    rate: total ? Math.round((paid / total) * 100) : 0,
    kwh: list.reduce((sum, inv) => sum + Number(inv.kwh || 0), 0),
    m3: list.reduce((sum, inv) => sum + Number(inv.m3 || 0), 0)
  };
}

export function pendingRooms(ctx: ComputeCtx, month: number, year: number): Room[] {
  const done = monthInvoices(ctx, month, year).map((inv) => inv.room);
  return ctx.rooms.filter((room) => room.status === "occupied" && !done.includes(room.no));
}

export const openRepairs = (ctx: ComputeCtx) =>
  ctx.repairs.filter((item) => item.status === "open" || item.status === "in_progress");

export function openInvoices(ctx: ComputeCtx): Invoice[] {
  const current = ctx.settings.current || { year: 2026, month: 11 };
  return monthInvoices(ctx, current.month, current.year).filter((inv) => !inv.paid);
}

export interface YearTotals {
  kwh: number;
  m3: number;
  trash: number;
  elecCost: number;
  waterCost: number;
  months: number;
  rooms: number;
  kwhBy: number[];
  m3By: number[];
  trashBy: number[];
  waterBy: number[];
}

export function yearTotals(ctx: ComputeCtx, year: number): YearTotals {
  const kwhBy: number[] = [];
  const m3By: number[] = [];
  const trashBy: number[] = [];
  const waterBy: number[] = [];
  let kwh = 0;
  let m3 = 0;
  let trash = 0;
  let elecCost = 0;
  let waterCost = 0;
  let months = 0;
  let rooms = 0;

  for (let month = 1; month <= 12; month++) {
    const list = monthInvoices(ctx, month, year);
    if (!list.length) {
      kwhBy.push(0);
      m3By.push(0);
      trashBy.push(0);
      waterBy.push(0);
      continue;
    }
    months++;
    const rates = ratesForMonth(ctx.settings, year, month);
    let monthKwh = 0;
    let monthM3 = 0;
    let monthTrash = 0;
    let monthWater = 0;
    list.forEach((inv) => {
      const usedKwh = Number(inv.kwh) || 0;
      monthKwh += usedKwh;
      monthM3 += Number(inv.m3) || 0;
      elecCost += usedKwh * rates.electricRate;
      const water = waterCostFor(ctx, inv.room, rates);
      waterCost += water;
      monthWater += water;
      monthTrash += trashCostFor(ctx, inv.room, rates);
    });
    kwh += monthKwh;
    m3 += monthM3;
    trash += monthTrash;
    rooms += list.length;
    kwhBy.push(monthKwh);
    m3By.push(monthM3);
    trashBy.push(monthTrash);
    waterBy.push(monthWater);
  }

  return { kwh, m3, trash, elecCost, waterCost, months, rooms, kwhBy, m3By, trashBy, waterBy };
}

export function earliestDataMonth(ctx: ComputeCtx): { year: number; month: number } | null {
  const keys = new Set<string>();
  ctx.invoices.forEach((inv) => keys.add(`${Number(inv.year)}-${Number(inv.month)}`));
  Object.values(ctx.settings.meterReadings || {}).forEach((months) => {
    Object.keys(months || {}).forEach((key) => keys.add(key));
  });
  Object.keys(ctx.settings.ratesByMonth || {}).forEach((key) => keys.add(key));
  const sorted = [...keys]
    .filter((key) => /^\d{4}-\d{1,2}$/.test(key))
    .sort((a, b) => Number(a.split("-")[0]) * 12 + Number(a.split("-")[1]) - (Number(b.split("-")[0]) * 12 + Number(b.split("-")[1])));
  if (!sorted.length) return null;
  const [year, month] = sorted[0].split("-").map(Number);
  return { year, month };
}

export function latestInvoiceMonth(ctx: ComputeCtx): { year: number; month: number } | null {
  const list = ctx.invoices;
  if (!list.length) return null;
  const latest = list.reduce((max, inv) => {
    const index = Number(inv.year) * 12 + Number(inv.month);
    return index > max.index ? { index, year: Number(inv.year), month: Number(inv.month) } : max;
  }, { index: -1, year: 0, month: 0 });
  return { year: latest.year, month: latest.month };
}
