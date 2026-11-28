import type { Invoice } from "../data/types";
import { invoiceTotal, type ComputeCtx } from "./compute";
import { invoiceNoLabel, monthLabel } from "./format";

/**
 * ຍອດຄ້າງຂອງເດືອນກ່ອນ: ໃບບີນຂອງຫ້ອງດຽວກັນ ທີ່ຍັງບໍ່ຊຳລະ ແລະ ເປັນເດືອນກ່ອນໜ້າໃບບີນນີ້
 * ຈະຖືກດຶງມາບວກໃນໃບບີນປະຈຸບັນ. ບໍ່ໄດ້ຂຽນທັບຂໍ້ມູນໃບບີນເກົ່າ — ຄິດໄລ່ຕອນສະແດງເທົ່ານັ້ນ.
 */
export interface ArrearsItem {
  no: string;
  year: number;
  month: number;
  amount: number;
}

const monthIndex = (year: number, month: number) => Number(year) * 12 + Number(month);

export function arrearsItems(
  ctx: ComputeCtx,
  invoice: Pick<Invoice, "room" | "year" | "month">
): ArrearsItem[] {
  const target = monthIndex(invoice.year, invoice.month);
  return ctx.invoices
    .filter(
      (item) =>
        !item.paid &&
        String(item.room) === String(invoice.room) &&
        monthIndex(item.year, item.month) < target
    )
    .map((item) => ({
      no: item.no,
      year: Number(item.year),
      month: Number(item.month),
      amount: invoiceTotal(ctx, item)
    }))
    .sort((a, b) => monthIndex(a.year, a.month) - monthIndex(b.year, b.month));
}

export const arrearsTotal = (ctx: ComputeCtx, invoice: Pick<Invoice, "room" | "year" | "month">) =>
  arrearsItems(ctx, invoice).reduce((sum, item) => sum + item.amount, 0);

export const arrearsDetail = (items: ArrearsItem[]) =>
  items.map((item) => `${monthLabel(item.month, item.year)} · ${invoiceNoLabel(item.no)}`).join(" · ");
