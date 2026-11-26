import type { AppData, Invoice, Tenant } from "../data/types";

export function logActivity(data: AppData, kind: string, title: string, detail = "") {
  const list = Array.isArray(data.settings.activity) ? data.settings.activity : [];
  data.settings.activity = [{ t: Date.now(), kind, title, detail }, ...list].slice(0, 500);
}

export function syncRoomsFromTenants(data: AppData) {
  data.rooms.forEach((room) => {
    const tenant = data.tenants.find((item) => String(item.room) === String(room.no));
    if (tenant) {
      room.tenant = tenant.name;
      room.phone = tenant.phone;
      if (room.status !== "repair" && room.status !== "occupied") room.status = "occupied";
    } else if (room.status === "occupied" || room.tenant || room.phone) {
      room.status = "vacant";
      room.tenant = null;
      room.phone = null;
    }
  });
}

export const invoiceNoFor = (year: number, month: number, room: string) =>
  `INV-${year}${String(month).padStart(2, "0")}-${room}`;

export function emptyInvoice(year: number, month: number, room: string, tenant: Tenant | null): Invoice {
  return {
    no: invoiceNoFor(year, month, room),
    room,
    tenant: tenant?.name || "",
    kwh: 0,
    m3: 0,
    rent: Number(tenant?.rent) || 0,
    service: 0,
    other: 0,
    paid: false,
    due: "",
    year,
    month
  };
}

export function upsertInvoice(data: AppData, invoice: Invoice) {
  const index = data.invoices.findIndex(
    (item) => item.no === invoice.no || (item.room === invoice.room && item.year === invoice.year && item.month === invoice.month)
  );
  if (index >= 0) data.invoices[index] = { ...data.invoices[index], ...invoice };
  else data.invoices.push(invoice);
}

export function removeInvoice(data: AppData, no: string) {
  data.invoices = data.invoices.filter((item) => item.no !== no);
}

export function removeTenant(data: AppData, room: string) {
  data.tenants = data.tenants.filter((tenant) => String(tenant.room) !== String(room));
  syncRoomsFromTenants(data);
}
