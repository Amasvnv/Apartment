/* =========================================================
   ຟັງຊັນກາງ — ເມນູ, ຕາຕະລາງ, ກາຟ, ຕົວຊ່ວຍ
   ========================================================= */

const ICON_PATHS = {
  building: '<path d="M3 21h18"/><path d="M5 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15"/><path d="M15 9h2a2 2 0 0 1 2 2v10"/><path d="M8 8h3M8 12h3M8 16h3"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  door: '<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.76V5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-.76a2 2 0 0 1 1.6-1.96l5-1C9.88 1.06 11 2.16 11 3.5V4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  chevLeft: '<path d="m15 18-6-6 6-6"/>',
  chevRight: '<path d="m9 18 6-6-6-6"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z"/>',
  wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M18 12h.01"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64L3 16"/><path d="M3 21v-5h5"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  trendDown: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
  trendUp: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"/>',
  tool: '<path d="M14.7 6.3a4 4 0 1 0 5 5L21 21H3l7.4-7.4"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  sofa: '<path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z"/><path d="M4 18v2"/><path d="M20 18v2"/>',
  wind: '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>'
};

function icon(name, size = 16, stroke = 1.8) {
  const p = ICON_PATHS[name] || "";
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

/* ---------------- ຕົວຊ່ວຍ ---------------- */
const NAV = [
  { page: "overview", href: "index.html", label: "ພາບລວມ" },
  { page: "meter", href: "meter.html", label: "ຈົດມິເຕີ" },
  { page: "rooms", href: "rooms.html", label: "ຫ້ອງພັກ" },
  { page: "tenants", href: "tenants.html", label: "ຜູ້ເຊົ່າ" },
  { page: "invoices", href: "invoices.html", label: "ໃບບີນເກັບເງີນ", badgeAuto: "invoices" },
  { page: "billcheck", href: "bill-check.html", label: "ກວດເບິ່ງບີນ" },
  { page: "repairs", href: "repairs.html", label: "ສ້ອມແປງ", badgeAuto: "repairs" },
  { page: "activity", href: "activity.html", label: "ການເຄື່ອນໄຫວ" },
  { page: "users", href: "users.html", label: "ຜູ້ໃຊ້" },
  { page: "settings", href: "settings.html", label: "ຕັ້ງຄ່າ" }
];

/* ---------------- ປະເພດວຽກສ້ອມແປງ ---------------- */
const REPAIR_CATEGORIES = {
  electric: { label: "ໄຟຟ້າ", cls: "amber", icon: "zap" },
  water: { label: "ນ້ຳປະປາ", cls: "cyan", icon: "droplet" },
  furniture: { label: "ເຟີນິເຈີ", cls: "violet", icon: "sofa" },
  aircon: { label: "ແອເຢັນ", cls: "blue", icon: "wind" },
  building: { label: "ໂຄງສ້າງ / ອາຄານ", cls: "muted", icon: "home" },
  other: { label: "ອື່ນໆ", cls: "muted", icon: "wrench" }
};
const REPAIR_PRIORITIES = {
  low: { label: "ຕ່ຳ", cls: "low" },
  normal: { label: "ປານກາງ", cls: "normal" },
  high: { label: "ສູງ", cls: "high" },
  urgent: { label: "ຮີບດ່ວນ", cls: "urgent" }
};
const REPAIR_STATUSES = {
  open: { label: "ລໍຖ້າ", cls: "open" },
  in_progress: { label: "ກຳລັງຊ່ອມ", cls: "progress" },
  done: { label: "ສຳເລັດ", cls: "done" },
  cancelled: { label: "ຍົກເລີກ", cls: "cancel" }
};

const repairCategory = (k) => REPAIR_CATEGORIES[k] || REPAIR_CATEGORIES.other;
const repairPriority = (k) => REPAIR_PRIORITIES[k] || REPAIR_PRIORITIES.normal;
const repairStatus = (k) => REPAIR_STATUSES[k] || REPAIR_STATUSES.open;

/* ---------------- ສະຖານະຜູ້ເຊົ່າ ---------------- */
const STAY_STATUSES = {
  resident: { label: "ຢູ່ປະຈຳ", cls: "cyan" },
  away: { label: "ໄປຕ່າງແຂວງ", cls: "amber" }
};
const stayStatus = (k) => STAY_STATUSES[k] || STAY_STATUSES.resident;

function openRepairs() {
  if (typeof REPAIRS === "undefined") return [];
  return REPAIRS.filter((r) => r.status === "open" || r.status === "in_progress");
}

/* ໃບບີນທີ່ຍັງຄ້າງຊຳລະ ຂອງເດືອນປັດຈຸບັນ */
function openInvoices() {
  const cur = typeof APT !== "undefined" ? APT.current : null;
  if (!cur || typeof monthInvoices !== "function") return [];
  return monthInvoices(cur.month, cur.year).filter((i) => !i.paid);
}

function navBadgeCount(n) {
  if (n.badgeAuto === "repairs") return openRepairs().length;
  if (n.badgeAuto === "invoices") return openInvoices().length;
  return n.badge || 0;
}

function money(n) {
  return Math.round(n).toLocaleString("en-US") + " " + APT.currency;
}
function num(n) {
  return Number(n).toLocaleString("en-US");
}
function millions(n) {
  return (n / 1000000).toFixed(1).replace(/\.0$/, "") + " ລ້ານ";
}
function monthLabel(m, y) {
  return MONTH_FULL[m - 1] + " " + y;
}
function shortMonth(m, y) {
  return MONTH_SHORT[m - 1] + " " + String(y).slice(2);
}

/* ໃບບີນເກັບເງີນ: ຫຍໍ້ໃຫ້ພໍດີໜຶ່ງໜ້າເຈ້ຍ — A5 (ເຄິ່ງ A4) ຫຼື A4 ເຕັມ */
const PAPER_PRINT_MM = {
  a5: { w: 142, h: 199 }, /* A5 148 × 210 − ຂອບ 3 mm */
  a4: { w: 198, h: 285 } /* A4 210 × 297 − ຂອບ 6 mm */
};
const MM_TO_PX = 3.7795275591;
function fitBillToPage(sheet, paper = "a5") {
  if (!sheet || !sheet.innerHTML.trim()) return;
  const mm = PAPER_PRINT_MM[paper] || PAPER_PRINT_MM.a5;
  const prevStyle = sheet.getAttribute("style") || "";
  sheet.style.cssText = "display:block;position:absolute;left:-10000px;top:0;visibility:hidden;zoom:1";
  const box = sheet.getBoundingClientRect();
  const w = box.width / MM_TO_PX;
  const h = box.height / MM_TO_PX;
  sheet.style.cssText = prevStyle;
  if (!w || !h) return;
  const k = Math.min(mm.w / w, mm.h / h, 1);
  sheet.style.zoom = String(Math.floor(k * 1000) / 1000);
  sheet.dataset.paper = paper;

  /* ຮູບ ແລະ ຟອນອາດຍັງບໍ່ໂຫຼດ — ວັດຄືນຫຼັງໂຫຼດສຳເລັດ */
  const imgs = [...sheet.querySelectorAll("img")].filter((i) => !i.complete);
  if (imgs.length) {
    let left = imgs.length;
    imgs.forEach((img) =>
      img.addEventListener("load", () => {
        if (--left === 0) fitBillToPage(sheet, paper);
      }, { once: true })
    );
  }
  if (document.fonts && document.fonts.status !== "loaded") {
    document.fonts.ready.then(() => fitBillToPage(sheet, paper));
  }
}

/* ອັດຕາຫຼັກ (ຄ່າເຊົ່າ, ໄຟຟ້າ, ນ້ຳ, ຂີ້ເຫຍື້ອ, ບໍລິການ) ແຍກຕາມເດືອນ — ກຳນົດຈາກໜ້າຕັ້ງຄ່າ
   ເດືອນທີ່ຍັງບໍ່ກຳນົດ ໃຊ້ຄ່າຫຼັກໃນ settings */
const RATE_KEYS = ["rent", "electricRate", "waterTotal", "trashTotal", "serviceFee"];
const ratesKeyOf = (y, m) => `${Number(y)}-${Number(m)}`;
const baseRates = () => ({
  rent: Number(APT.rent) || 0,
  electricRate: Number(APT.electricRate) || 0,
  waterTotal: Number(APT.waterTotal) || 0,
  trashTotal: Number(APT.trashTotal) || 0,
  serviceFee: Number(APT.serviceFee) || 0
});
function ratesForMonth(y, m) {
  const out = baseRates();
  const saved = (APT.ratesByMonth || {})[ratesKeyOf(y, m)];
  if (!saved || typeof saved !== "object") return out;
  RATE_KEYS.forEach((k) => {
    const v = saved[k];
    if (v !== undefined && v !== null && v !== "" && !Number.isNaN(Number(v))) out[k] = Number(v);
  });
  return out;
}
function setRatesForMonth(y, m, rates) {
  if (!APT.ratesByMonth || typeof APT.ratesByMonth !== "object") APT.ratesByMonth = {};
  const key = ratesKeyOf(y, m);
  const cur = { ...(APT.ratesByMonth[key] || {}) };
  RATE_KEYS.forEach((k) => {
    if (rates[k] !== undefined && rates[k] !== null && rates[k] !== "") cur[k] = Number(rates[k]) || 0;
  });
  APT.ratesByMonth[key] = cur;
}

/* ຂໍ້ຄວາມແຈ້ງລາຍລະອຽດປະຈຳເດືອນ */
function monthNoteFor(y, m) {
  const v = (APT.monthNotes || {})[ratesKeyOf(y, m)];
  return typeof v === "string" ? v : "";
}
function setMonthNoteFor(y, m, text) {
  if (!APT.monthNotes || typeof APT.monthNotes !== "object") APT.monthNotes = {};
  const key = ratesKeyOf(y, m);
  const t = String(text || "").trim();
  if (t) APT.monthNotes[key] = t;
  else delete APT.monthNotes[key];
}
function monthNote2For(y, m) {
  const v = (APT.monthNotes2 || {})[ratesKeyOf(y, m)];
  return typeof v === "string" ? v : "";
}
function setMonthNote2For(y, m, text) {
  if (!APT.monthNotes2 || typeof APT.monthNotes2 !== "object") APT.monthNotes2 = {};
  const key = ratesKeyOf(y, m);
  const t = String(text || "").trim();
  if (t) APT.monthNotes2[key] = t;
  else delete APT.monthNotes2[key];
}
function rentForMonth(y, m) {
  return ratesForMonth(y, m).rent;
}
function initials(name) {
  if (!name) return "—";
  const clean = name.replace(/^(ນາງ|ທ້າວ|ສສ)\s*/, "");
  const parts = clean.trim().split(/\s+/);
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}
const tenantPeople = (t) => Math.max(1, Number(t && t.people) || 1);

/* ຈຳນວນຄົນທີ່ເຂົ້າຢູ່ປະຈຳ ລວມທຸກຫ້ອງ (ບໍ່ນັບຄົນທີ່ໄປຕ່າງແຂວງ) */
function residentPeople() {
  return TENANTS.reduce(
    (s, t) => s + ((t.stayStatus || "resident") === "away" ? 0 : tenantPeople(t)),
    0
  );
}

const tenantOfRoom = (roomNo) => TENANTS.find((x) => String(x.room) === String(roomNo)) || null;

/* ຮຽງລາຍການຫ້ອງຕາມເລກ: 1, 2, 3, … 10, 11 (ບໍ່ໃຫ້ 10 ມາກ່ອນ 2) */
const roomNoValue = (no) => {
  const n = parseFloat(String(no).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : Infinity;
};
const sortRoomsByNo = (list) =>
  [...list].sort(
    (a, b) =>
      roomNoValue(a.no) - roomNoValue(b.no) ||
      String(a.no).localeCompare(String(b.no), "lo", { numeric: true })
  );

/* ຄ່ານ້ຳຂອງຫ້ອງໜຶ່ງ = (ຍອດລວມ ÷ ຈຳນວນຄົນຢູ່ປະຈຳທັງໝົດ) × ຈຳນວນຄົນໃນຫ້ອງ · ຄົນທີ່ໄປຕ່າງແຂວງບໍ່ຄິດ */
function waterCostFor(roomNo, rates) {
  const t = tenantOfRoom(roomNo);
  if (!t || (t.stayStatus || "resident") === "away") return 0;
  const total = Number((rates && rates.waterTotal !== undefined ? rates.waterTotal : APT.waterTotal) || 0);
  const n = residentPeople();
  return n ? Math.round((total / n) * tenantPeople(t)) : 0;
}

/* ຈຳນວນຫ້ອງທີ່ຢູ່ປະຈຳ (ບໍ່ນັບຫ້ອງທີ່ໄປຕ່າງແຂວງ) */
function residentRoomCount() {
  return TENANTS.filter((t) => (t.stayStatus || "resident") !== "away").length;
}

/* ຄ່າຂີ້ເຫຍື້ອຂອງຫ້ອງໜຶ່ງ = ຍອດລວມ ÷ ຈຳນວນຫ້ອງຢູ່ປະຈຳ · ຫ້ອງທີ່ໄປຕ່າງແຂວງບໍ່ຄິດ */
function trashCostFor(roomNo, rates) {
  const t = tenantOfRoom(roomNo);
  if (!t || (t.stayStatus || "resident") === "away") return 0;
  const total = Number((rates && rates.trashTotal !== undefined ? rates.trashTotal : APT.trashTotal) || 0);
  const n = residentRoomCount();
  return n ? Math.round(total / n) : 0;
}

/* ຄ່າບໍລິການສ່ວນກາງ = ຍອດລວມຂອງອາຄານ ÷ ຈຳນວນຫ້ອງຢູ່ປະຈຳ · ຫ້ອງທີ່ໄປຕ່າງແຂວງບໍ່ຄິດ */
function serviceCostFor(roomNo, rates) {
  const t = tenantOfRoom(roomNo);
  if (!t || (t.stayStatus || "resident") === "away") return 0;
  const total = Number((rates && rates.serviceFee !== undefined ? rates.serviceFee : APT.serviceFee) || 0);
  const n = residentRoomCount();
  return n ? Math.round(total / n) : 0;
}

/* ຄ່າສ້ອມແປງ — ດຶງຈາກ REPAIRS ຕາມຫ້ອງ ແລະ ເດືອນຂອງໃບບີນເກັບເງີນ (INV-YYYYMM-...) */
function invoiceMonthKey(inv) {
  const m = /^INV-(\d{4})(\d{2})-/.exec(String((inv && inv.no) || ""));
  return m ? `${m[1]}-${m[2]}` : "";
}

function repairItemsFor(roomNo, monthKey) {
  if (typeof REPAIRS === "undefined" || !monthKey) return [];
  return REPAIRS.filter(
    (x) =>
      String(x.room) === String(roomNo) &&
      x.status !== "cancelled" &&
      String(x.reported || "").startsWith(monthKey)
  );
}

function repairCostFor(roomNo, monthKey) {
  return repairItemsFor(roomNo, monthKey).reduce((s, x) => s + (Number(x.cost) || 0), 0);
}

function invoiceRepair(inv) {
  return repairCostFor(inv.room, invoiceMonthKey(inv));
}

/* ຄ່າຕ່າງໆຂອງໃບບີນເກັບເງີນ ໃຊ້ອັດຕາຂອງເດືອນທີ່ໃນໃບນັ້ນ */
function invoiceRates(inv) {
  return ratesForMonth(inv.year, inv.month);
}

function invoiceTotal(inv) {
  const rt = invoiceRates(inv);
  return (
    inv.rent + serviceCostFor(inv.room, rt) + (inv.other || 0) + extraFeesShareFor(inv.room, inv.year, inv.month) + inv.kwh * rt.electricRate +
    waterCostFor(inv.room, rt) + trashCostFor(inv.room, rt) + invoiceRepair(inv)
  );
}

/* ຄ່າບໍລິການເພີ່ມເຕີມ — ເກັບແຍກຕາມເດືອນ (ກຳນົດຈາກໜ້າ ຕັ້ງຄ່າ ເດືອນລະຊຸດ)
   ເດືອນທີ່ຍັງບໍ່ໄດ້ບັນທຶກ ບໍ່ມີຄ່າເພີ່ມເຕີມ */
function extraFeesFor(y, m) {
  const list = (APT.extraFeesByMonth || {})[ratesKeyOf(y, m)];
  return Array.isArray(list) ? list : [];
}
function setExtraFeesFor(y, m, fees) {
  if (!APT.extraFeesByMonth || typeof APT.extraFeesByMonth !== "object") APT.extraFeesByMonth = {};
  const clean = (fees || [])
    .filter((f) => f && (String(f.name || "").trim() || Number(f.amount)))
    .map((f) => ({ name: String(f.name || "").trim(), amount: Number(f.amount) || 0, active: !!f.active }));
  const key = ratesKeyOf(y, m);
  if (clean.length) APT.extraFeesByMonth[key] = clean;
  else delete APT.extraFeesByMonth[key];
}

/* ຄ່າບໍລິການເພີ່ມເຕີມທີ່ເປີດໃຊ້ຂອງເດືອນນັ້ນ (₭/ເດືອນ) */
const otherFeesTotal = (y, m) =>
  extraFeesFor(y, m).filter((f) => f.active).reduce((s, f) => s + (Number(f.amount) || 0), 0);

/* ຄ່າອື່ນໆ (ລາຍການເພີ່ມເຕີມ) = ຍອດລວມຂອງເດືອນ ÷ ຈຳນວນຫ້ອງຢູ່ປະຈຳ · ຫ້ອງທີ່ໄປຕ່າງແຂວງບໍ່ຄິດ */
function extraFeesShareFor(roomNo, y, m) {
  const t = tenantOfRoom(roomNo);
  if (!t || (t.stayStatus || "resident") === "away") return 0;
  const n = residentRoomCount();
  return n ? Math.round(otherFeesTotal(y, m) / n) : 0;
}

/* ---------------- ໜ້າທີ່ກ່ຽວຂ້ອງກັບຂໍ້ມູນ ---------------- */
const roomByNo = (no) => ROOMS.find((r) => r.no === no);

function invoiceStats(list) {
  const total = list.reduce((s, i) => s + invoiceTotal(i), 0);
  const paidList = list.filter((i) => i.paid);
  const unpaidList = list.filter((i) => !i.paid);
  const paid = paidList.reduce((s, i) => s + invoiceTotal(i), 0);
  const unpaid = total - paid;
  return {
    total,
    paid,
    unpaid,
    paidCount: paidList.length,
    unpaidCount: unpaidList.length,
    rate: total ? Math.round((paid / total) * 100) : 0,
    kwh: list.reduce((s, i) => s + i.kwh, 0),
    m3: list.reduce((s, i) => s + i.m3, 0)
  };
}

function monthInvoices(m, y) {
  return INVOICE_MONTHS[`${y}-${m}`] || [];
}

function pendingRooms(m, y) {
  const done = monthInvoices(m, y).map((i) => i.room);
  return ROOMS.filter((r) => r.status === "occupied" && !done.includes(r.no));
}

/* ---------------- ເດືອນທີ່ຖືກລຶບອອກຈາກລາຍການ (ລຶບເດືອນວ່າງ) ---------------- */
const HIDDEN_MONTHS_KEY = "apt.hiddenMonths";
const monthKeyOf = (y, m) => `${y}-${String(m).padStart(2, "0")}`;

function hiddenMonths() {
  try {
    const arr = JSON.parse(localStorage.getItem(HIDDEN_MONTHS_KEY) || "[]");
    return Array.isArray(arr) ? arr.filter((k) => typeof k === "string" && /^\d{4}-\d{1,2}$/.test(k)) : [];
  } catch (e) {
    return [];
  }
}

function saveHiddenMonths(list) {
  if (typeof isViewer === "function" && isViewer()) return;
  try {
    localStorage.setItem(HIDDEN_MONTHS_KEY, JSON.stringify([...new Set(list)]));
  } catch (e) {
    /* ບັນທຶກບໍ່ໄດ້ */
  }
}

const isMonthHidden = (key) => hiddenMonths().includes(key);
const hideMonth = (key) => saveHiddenMonths([...hiddenMonths(), key]);
const unhideMonth = (key) => saveHiddenMonths(hiddenMonths().filter((k) => k !== key));
const restoreHiddenMonths = () => saveHiddenMonths([]);

/* ເດືອນມີຂໍ້ມູນຈິງ (ເລກມິເຕີ / ໃບບີນເກັບເງີນ) — ຕ້ອງສະແດງໃນລາຍການເດືອນສະເໝີ
   (ອັດຕາຄ່າຕ່າງໆ ຢ່າງດຽວ ບໍ່ຖືວ່າເປັນຂໍ້ມູນ — ເດືອນທີ່ຖືກລຶບແລ້ວຈະບໍ່ຄ້າງຢູ່) */
function monthHasData(y, m) {
  const same = (k) => {
    const p = String(k).split("-").map(Number);
    return p[0] === y && p[1] === m;
  };
  if (Object.keys(INVOICE_MONTHS || {}).some((k) => same(k) && (INVOICE_MONTHS[k] || []).length)) return true;
  const readings = APT.meterReadings || {};
  return Object.keys(readings).some((room) =>
    Object.keys(readings[room] || {}).some(
      (k) => same(k) && readings[room][k] !== undefined && readings[room][k] !== null && readings[room][k] !== ""
    )
  );
}

/* ---------------- ການເຂົ້າສູ່ລະບົບ ---------------- */
const SESSION_KEY = "apt.session";

/* ຜູ້ໃຊ້ທີ່ກຳລັງເຂົ້າໃຊ້ຢູ່ (session ຂອງ browser ນີ້)
   ຖ້າລາຍຊື່ຜູ້ໃຊ້ຍັງບໍ່ໄດ້ໂຫຼດຈາກຖານຂໍ້ມູນ ໃຫ້ໃຊ້ຂໍ້ມູນໃນ session ໄປກ່ອນ
   (ບໍ່ດັ່ງນັ້ນ ຜູ້ໃຊ້ທີ່ບໍ່ໄດ້ຢູ່ໃນຄ່າເລີ່ມຕົ້ນ ຈະຖືກສົ່ງກັບໄປໜ້າ login) */
function currentUser() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    if (!s || !s.id) return null;
    const u = (APT.users || []).find((x) => x.id === s.id);
    if (u && u.active === false) return null;
    return u || { id: s.id, name: s.name || "", role: s.role || "" };
  } catch (e) {
    return null;
  }
}

function setSession(user) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ id: user.id, name: user.name, role: user.role || "", at: Date.now() })
  );
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

/* ບົດບາດ “ຜູ້ເບິ່ງ” = ເບິ່ງໄດ້ຢ່າງດຽວ (ບໍ່ມີການບັນທຶກ / ແກ້ໄຂ / ລຶບ) */
function isViewer() {
  const u = currentUser();
  return !!u && u.role === "viewer";
}

function applyViewerMode() {
  if (!isViewer()) return;
  document.documentElement.classList.add("viewer");

  /* ກັ້ນການກົດ ປຸ່ມທີ່ຂຽນຂໍ້ມູນ ອີກຊັ້ນໜຶ່ງ */
  document.addEventListener(
    "click",
    (e) => {
      const hit = e.target.closest(
        "[data-edit],[data-del],[data-toggle],[data-save],[data-ok],#saveBtn,#addUserBtn,#addRoomBtn,#addTenantBtn,#addRepairBtn,#saveMonthNote,#drAction,#deleteMonth,.btn-add-room,.btn-danger"
      );
      if (!hit || hit.hasAttribute("data-close") || hit.hasAttribute("data-cancel")) return;
      e.preventDefault();
      e.stopPropagation();
      showStatusToast("danger", "ບໍ່ມີສິດ", "ຜູ້ເບິ່ງ ເບິ່ງໄດ້ຢ່າງດຽວ");
    },
    true
  );
  document.addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      showStatusToast("danger", "ບໍ່ມີສິດ", "ຜູ້ເບິ່ງ ເບິ່ງໄດ້ຢ່າງດຽວ");
    },
    true
  );
}

/* ---------------- ຫົວ / ທ້າຍເວັບ ---------------- */
function renderChrome() {
  const page = document.body.dataset.page;
  if (page === "login") return;
  const nav = NAV.map((n) => {
    const badge = navBadgeCount(n);
    return `<a href="${n.href}" class="${n.page === page ? "active" : ""}">${n.label}${
      badge ? `<span class="nav-badge">${badge}</span>` : ""
    }</a>`;
  }).join("");

  const me = currentUser();
  const meName = me ? me.name || me.id : "";
  const meRole = me ? roleLabel(me.role) : "";

  const header = `
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="index.html">
        <span class="brand-mark">${icon("building", 21, 1.7)}<i class="brand-dot"></i></span>
        <span class="brand-text">
          <strong>${APT.name}</strong>
          <span>ລະບົບຈັດການອາພາດເມັນ</span>
        </span>
      </a>
      <nav class="main-nav">${nav}</nav>
      <div class="header-right">
        <span class="header-user" id="headerUser" title="${meName}${meRole ? " · " + meRole : ""}">${icon("user", 14)}<span class="hu-name">${meName}</span><span class="hu-role">${meRole ? "· " + meRole : ""}</span></span>
        <button class="icon-btn" id="logoutBtn" title="ອອກຈາກລະບົບ">${icon("login", 15)}</button>
        <button class="icon-btn" id="themeToggle" title="ປ່ຽນໂໝດສະຫວ່າງ / ມືດ">${icon("sun", 15)}</button>
      </div>
    </div>
  </header>`;

  const footer = `
  <footer class="site-footer">
    <div class="footer-inner">
      <p style="margin:0">${APT.address}</p>
      <p style="margin:0;display:flex;align-items:center;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        <a class="db-status off" href="database.html" data-db-status>ຖານຂໍ້ມູນ: ຍັງບໍ່ເຊື່ອມຕໍ່</a>
        <span>· ສະກຸນເງິນກີບ (₭)</span>
      </p>
    </div>
  </footer>`;

  document.body.insertAdjacentHTML("afterbegin", header);
  document.body.insertAdjacentHTML("beforeend", footer);

  if (window.DB) DB.paintStatus();

  const saved = localStorage.getItem("theme");
  if (saved === "light") document.documentElement.classList.add("light");
  syncThemeIcon();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn)
    logoutBtn.addEventListener("click", () => {
      clearSession();
      location.replace("login.html");
    });

  document.getElementById("themeToggle").addEventListener("click", () => {
    document.documentElement.classList.toggle("light");
    localStorage.setItem("theme", document.documentElement.classList.contains("light") ? "light" : "dark");
    syncThemeIcon();
    window.dispatchEvent(new Event("themechange"));
  });
}

/* ອັບເດດຕົວເລກງານຄ້າງຢູ່ເມນູ ຫຼັງໂຫຼດຂໍ້ມູນຈາກຖານຂໍ້ມູນ */
/* ຊື່ ແລະ ບົດບາດ ຂອງຜູ້ໃຊ້ທີ່ເຂົ້າໃຊ້ຢູ່ ສະແດງຢູ່ຫົວເວັບໄຊ */
function roleLabel(role) {
  return (
    { manager: "ຜູ້ຈັດການ", staff: "ພະນັກງານ", tech: "ຊ່າງ", viewer: "ຜູ້ເບິ່ງ" }[role] || ""
  );
}

function refreshHeaderUser() {
  const el = document.getElementById("headerUser");
  if (!el) return;
  const u = currentUser();
  const name = u ? u.name || u.id : "";
  const role = u ? roleLabel(u.role) : "";
  const nameEl = el.querySelector(".hu-name");
  const roleEl = el.querySelector(".hu-role");
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = role ? "· " + role : "";
  el.title = name ? `${name}${role ? " · " + role : ""}` : "";
}

function refreshNavBadges() {
  refreshHeaderUser();
  NAV.forEach((n) => {
    const count = navBadgeCount(n);
    document.querySelectorAll(`.main-nav a[href="${n.href}"]`).forEach((a) => {
      let badge = a.querySelector(".nav-badge");
      if (!count) {
        if (badge) badge.remove();
        return;
      }
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "nav-badge";
        a.appendChild(badge);
      }
      badge.textContent = count;
    });
  });
}

function syncThemeIcon() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  btn.innerHTML = icon(document.documentElement.classList.contains("light") ? "moon" : "sun", 15);
}

/* ---------------- ກາຟ ---------------- */
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

let gradSeq = 0;

function lineChart({ labels, values, ticks = 4, max, format = (v) => v, height = 220, suffix = "", color = "#3d9bff", dotColor = "" }) {
  const W = 600;
  const H = height;
  const padL = 38, padR = 12, padT = 14, padB = 26;
  /* ຄ່າ null = ເດືອນທີ່ຍັງບໍ່ມີຂໍ້ມູນ — ບໍ່ວາງຈຸດ ແລະ ບໍ່ລາກເສັ້ນຜ່ານ */
  const known = values.filter((v) => v != null && Number.isFinite(v));
  const top = max != null ? max : Math.max(1, ...known) * 1.1;
  const x = (i) => padL + (i * (W - padL - padR)) / (values.length - 1);
  const y = (v) => padT + (1 - v / top) * (H - padT - padB);
  const pts = values.reduce((acc, v, i) => (v == null || !Number.isFinite(v) ? acc : [...acc, [x(i), y(v)]]), []);
  const id = "lg" + ++gradSeq;

  let grid = "";
  for (let t = 0; t <= ticks; t++) {
    const val = (top / ticks) * t;
    const yy = y(val);
    grid += `<line class="grid-line" x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}"/>`;
    grid += `<text class="axis-text" x="${padL - 8}" y="${yy + 3.5}" text-anchor="end">${format(val)}${suffix}</text>`;
  }
  const xlabels = labels
    .map((l, i) => `<text class="axis-text" x="${x(i)}" y="${H - 6}" text-anchor="middle">${l}</text>`)
    .join("");
  const dotStyle = dotColor ? ` style="fill:${dotColor};stroke:${dotColor}"` : "";
  const dots = pts
    .map((p) => `<circle class="point" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2"${dotStyle}/>`)
    .join("");
  const area =
    pts.length > 1
      ? `${smoothPath(pts)} L ${pts[pts.length - 1][0].toFixed(1)} ${H - padB} L ${pts[0][0].toFixed(1)} ${H - padB} Z`
      : "";

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.26"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${grid}
    ${area ? `<path d="${area}" fill="url(#${id})"/>` : ""}
    ${pts.length > 1 ? `<path d="${smoothPath(pts)}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    ${dots}
    ${xlabels}
  </svg>`;
}

function barChart({ labels, values, ticks = 4, max, format = (v) => v, height = 220, suffix = "" }) {
  const W = 600, H = height;
  const padL = 38, padR = 14, padT = 14, padB = 26;
  const top = max != null ? max : Math.max(...values) * 1.15;
  const innerW = W - padL - padR;
  const slot = innerW / values.length;
  const bw = Math.min(38, slot * 0.42);
  const y = (v) => padT + (1 - v / top) * (H - padT - padB);
  const id = "bg" + ++gradSeq;

  let grid = "";
  for (let t = 0; t <= ticks; t++) {
    const val = (top / ticks) * t;
    const yy = y(val);
    grid += `<line class="grid-line" x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}"/>`;
    grid += `<text class="axis-text" x="${padL - 8}" y="${yy + 3.5}" text-anchor="end">${format(val)}${suffix}</text>`;
  }
  let bars = "";
  values.forEach((v, i) => {
    const cx = padL + slot * i + slot / 2;
    const yy = y(v);
    const h = Math.max(2, H - padB - yy);
    bars += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${yy.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="5" fill="url(#${id})"/>`;
    bars += `<text class="axis-text" x="${cx}" y="${H - 6}" text-anchor="middle">${labels[i]}</text>`;
  });

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4aa8ff" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#2e86e6" stop-opacity="0.55"/>
      </linearGradient>
    </defs>
    ${grid}${bars}
  </svg>`;
}

function groupChart({ labels, series, ticks = 4, max, format = (v) => v, height = 230, suffix = "" }) {
  const W = 600, H = height;
  const padL = 34, padR = 14, padT = 14, padB = 26;
  const top = max != null ? max : Math.max(...series.flatMap((s) => s.values)) * 1.12;
  const innerW = W - padL - padR;
  const slot = innerW / labels.length;
  const bw = Math.min(20, (slot * 0.55) / series.length);
  const y = (v) => padT + (1 - v / top) * (H - padT - padB);

  let grid = "";
  for (let t = 0; t <= ticks; t++) {
    const val = (top / ticks) * t;
    const yy = y(val);
    grid += `<line class="grid-line" x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}"/>`;
    grid += `<text class="axis-text" x="${padL - 8}" y="${yy + 3.5}" text-anchor="end">${format(val)}${suffix}</text>`;
  }

  let bars = "";
  labels.forEach((lbl, i) => {
    const groupW = bw * series.length + 4 * (series.length - 1);
    const start = padL + slot * i + (slot - groupW) / 2;
    series.forEach((s, j) => {
      const v = s.values[i];
      const yy = y(v);
      const h = Math.max(1.5, H - padB - yy);
      bars += `<rect x="${(start + j * (bw + 4)).toFixed(1)}" y="${yy.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${s.color}"/>`;
    });
    bars += `<text class="axis-text" x="${padL + slot * i + slot / 2}" y="${H - 6}" text-anchor="middle">${lbl}</text>`;
  });

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px">${grid}${bars}</svg>`;
}

function donutChart(segments, centerLabel, centerValue, size = 190) {
  const r = 62, sw = 20;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const rings = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const len = (s.value / total) * c;
      const dash = Math.max(len - 3, 0.8);
      const el = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}"
        stroke-dasharray="${dash.toFixed(2)} ${(c - dash).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"
        transform="rotate(-90 100 100)" stroke-linecap="round"/>`;
      offset += len;
      return el;
    })
    .join("");
  return `<div class="donut-wrap" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 200 200" width="${size}" height="${size}">
      <circle cx="100" cy="100" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${sw}"/>
      ${rings}
    </svg>
    <div class="donut-center"><span>${centerLabel}</span><strong>${centerValue}</strong></div>
  </div>`;
}

/* ---------------- ບັນທຶກການເຄື່ອນໄຫວ ---------------- */
const ACTIVITY_MAX = 500;
const ACTIVITY_KINDS = {
  tenant: { label: "ຜູ້ເຊົ່າ", icon: "users", cls: "blue" },
  room: { label: "ຫ້ອງພັກ", icon: "door", cls: "violet" },
  invoice: { label: "ໃບບີນ", icon: "receipt", cls: "cyan" },
  meter: { label: "ຈົດມິເຕີ", icon: "gauge", cls: "cyan" },
  repair: { label: "ສ້ອມແປງ", icon: "wrench", cls: "amber" },
  settings: { label: "ຕັ້ງຄ່າ", icon: "tool", cls: "muted" }
};
const activityKind = (k) => ACTIVITY_KINDS[k] || ACTIVITY_KINDS.settings;
/* ບັນທຶກການປ່ຽນແປງຂໍ້ມູນ — ເກັບໃນ settings ຂອງຖານຂໍ້ມູນ (ຫຼ້າສຸດ 500 ລາຍການ) */
function logActivity(kind, title, detail) {
  if (!Array.isArray(APT.activity)) APT.activity = [];
  const me = typeof currentUser === "function" ? currentUser() : null;
  APT.activity.unshift({
    t: new Date().toISOString(),
    kind: ACTIVITY_KINDS[kind] ? kind : "settings",
    title: String(title || ""),
    detail: String(detail || ""),
    by: me && me.name ? String(me.name) : ""
  });
  if (APT.activity.length > ACTIVITY_MAX) APT.activity.length = ACTIVITY_MAX;
}

/* ---------------- ຊ່ອງເລກ: ໃສ່ຈຸດຄັ່ນຫຼັກພັນ ---------------- */
/* 1234567 → "1,234,567" */
function dotNum(v) {
  const digits = String(v == null ? "" : v).replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
/* "1,234,567" → 1234567 */
function unNum(v) {
  return Number(String(v == null ? "" : v).replace(/[^\d]/g, "")) || 0;
}
/* ໃສ່ຈຸດເອງເວລາພິມ ໂດຍຮັກສາຕຳແໜ່ງເຄີເຊີ */
function bindNumDot(el) {
  if (!el || el.__numDot) return;
  el.__numDot = true;
  el.value = dotNum(el.value);
  el.addEventListener("input", () => {
    const raw = el.value;
    const caret = el.selectionStart == null ? raw.length : el.selectionStart;
    const digitsBefore = raw.slice(0, caret).replace(/[^\d]/g, "").length;
    const digits = raw.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
    const formatted = dotNum(digits);
    if (formatted === raw) return;
    el.value = formatted;
    let idx = formatted.length;
    if (digitsBefore === 0) {
      idx = 0;
    } else {
      let seen = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) seen++;
        if (seen === digitsBefore) {
          idx = i + 1;
          break;
        }
      }
    }
    try {
      el.setSelectionRange(idx, idx);
    } catch (e) {
      /* ບຣາວເຊີບໍ່ຮອງຮັບ */
    }
  });
}

/* ---------------- ສະຖານະແຈ້ງເຕືອນ (toast) ---------------- */
/* ປິດແຈ້ງເຕືອນອື່ນທີ່ກຳລັງສະແດງຢູ່ ເພື່ອບໍ່ໃຫ້ການ์ດຊ້ອນກັນ */
function hideToasts(except) {
  document.querySelectorAll(".toast-card.on, .toast.on").forEach((n) => {
    if (n !== except) n.classList.remove("on");
  });
}

function showStatusToast(kind, title, text) {
  let el = document.getElementById("statusToast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast-card";
    el.id = "statusToast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.style.zIndex = "260"; // ໃຫ້ຢູ່ໜ້າໂມດານ (z-index 200) ເພື່ອເຫັນສະຖານະຕອນບັນທຶກບໍ່ໄດ້
    el.innerHTML = `<span class="tc-icon">
      <svg class="i-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      <svg class="i-err" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16.5v.01"/></svg>
    </span>
    <div class="tc-body"><strong id="stTitle"></strong><span id="stText"></span></div>
    <button class="tc-close" type="button" aria-label="ປິດ">✕</button>
    <i class="tc-bar"></i>`;
    document.body.appendChild(el);
    el.querySelector(".tc-close").addEventListener("click", () => {
      el.classList.remove("on");
      clearTimeout(el.__timer);
    });
  }
  hideToasts(el);
  el.querySelector("#stTitle").textContent = title;
  el.querySelector("#stText").textContent = text || "";
  el.classList.remove("on", "ok", "err", "danger");
  void el.offsetWidth; // ໃຫ້ animation ເລີ່ມໃໝ່ທຸກຄັ້ງ
  el.classList.add("on");
  if (kind) el.classList.add(kind);
  clearTimeout(el.__timer);
  el.__timer = setTimeout(() => el.classList.remove("on"), 3800);
}

/* ---------------- ໂມດານ ---------------- */
function openModal(title, sub, fieldsHtml, onSubmit) {
  let back = document.getElementById("modalBackdrop");
  if (!back) {
    back = document.createElement("div");
    back.className = "modal-backdrop";
    back.id = "modalBackdrop";
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      <h3></h3><p class="m-sub"></p><div class="m-body"></div>
      <div class="modal-foot">
        <button class="btn btn-ghost btn-sm" data-close>ຍົກເລີກ</button>
        <button class="btn btn-primary btn-sm" data-save>ບັນທຶກ</button>
      </div>
    </div>`;
    document.body.appendChild(back);
    /* ໂມດານຈະປິດສະເພາະກົດ “ຍົກເລີກ” ຫຼື “ບັນທຶກ” — ກົດຫຼັງ/ກົດ Esc ບໍ່ປິດ */
    back.addEventListener("click", (e) => {
      if (!e.target.hasAttribute("data-close")) return;
      back.classList.remove("open");
      showStatusToast("", "ຍົກເລີກແລ້ວ", "ບໍ່ມີການບັນທຶກຂໍ້ມູນ");
    });
  }
  back.querySelector("h3").textContent = title;
  back.querySelector(".m-sub").textContent = sub;
  back.querySelector(".m-body").innerHTML = fieldsHtml;
  const save = back.querySelector("[data-save]");
  const fresh = save.cloneNode(true);
  save.replaceWith(fresh);
  fresh.addEventListener("click", () => {
    if (onSubmit && onSubmit(back) === false) {
      showStatusToast("err", "ບັນທຶກບໍ່ໄດ້", "ກະລຸນາກວດຂໍ້ມູນໃນຟອມອີກຄັ້ງ");
      return;
    }
    back.classList.remove("open");
    showStatusToast("ok", "ບັນທຶກແລ້ວ", "ຂໍ້ມູນຖືກບັນທຶກແລ້ວ");
  });
  requestAnimationFrame(() => back.classList.add("open"));
}

/* ---------------- ຢືນຢັນ (ແທນ confirm ຂອງ browser) ---------------- */
function openConfirm(title, message, onOk, opts = {}) {
  document.querySelectorAll(".modal-backdrop.confirm-back").forEach((n) => n.remove());
  const back = document.createElement("div");
  back.className = "modal-backdrop confirm-back";
  back.innerHTML = `<div class="modal confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle">
    <h3 id="confirmTitle"></h3>
    <p class="confirm-msg"></p>
    <div class="modal-foot">
      <button class="btn btn-ghost btn-sm" data-cancel>${opts.cancelText || "ຍົກເລີກ"}</button>
      <button class="btn ${opts.danger === false ? "btn-primary" : "btn-danger"} btn-sm" data-ok>${opts.okText || "ລຶບ"}</button>
    </div>
  </div>`;
  back.querySelector("h3").textContent = title;
  back.querySelector(".confirm-msg").textContent = message || "";
  document.body.appendChild(back);

  const close = () => {
    back.classList.remove("open");
    setTimeout(() => back.remove(), 200);
  };
  /* ປິດສະເພາະກົດປຸ່ມ — ກົດຫຼັງ ຫຼື Esc ບໍ່ປິດ */
  back.querySelector("[data-cancel]").addEventListener("click", () => {
    close();
    showStatusToast("", "ຍົກເລີກແລ້ວ", "ບໍ່ມີການປ່ຽນແປງຂໍ້ມູນ");
  });
  back.querySelector("[data-ok]").addEventListener("click", () => {
    close();
    showStatusToast("ok", `${opts.okText || "ລຶບ"}ແລ້ວ`, "ດຳເນີນການສຳເລັດ");
    onOk && onOk();
  });
  requestAnimationFrame(() => {
    back.classList.add("open");
    back.querySelector("[data-ok]").focus();
  });
}

/* ---------------- ປຸ່ມເລື່ອນເດືອນ ---------------- */
/* ເດືອນລ່າສຸດທີ່ມີຂໍ້ມູນ (ໃບບີນ / ມິເຕີ / ອັດຕາ) ຫຼື ເດືອນປັດຈຸບັນ — ໃຫ້ເລື່ອນໄປເດືອນທີ່ຫາກໍ່ບັນທຶກໄດ້ */
function latestDataMonth() {
  let best = { ...APT.current };
  const seen = (key) => {
    if (!/^\d{4}-\d{1,2}$/.test(key)) return;
    const [y, m] = key.split("-").map(Number);
    if (y * 12 + m > best.year * 12 + best.month) best = { year: y, month: m };
  };
  if (typeof INVOICE_MONTHS !== "undefined" && INVOICE_MONTHS) {
    Object.keys(INVOICE_MONTHS).forEach((k) => {
      if ((INVOICE_MONTHS[k] || []).length) seen(k);
    });
  }
  Object.values(APT.meterReadings || {}).forEach((map) =>
    Object.keys(map || {}).forEach((k) => {
      if (map[k] != null) seen(k);
    })
  );
  Object.keys(APT.ratesByMonth || {}).forEach(seen);
  return best;
}

function monthSwitch(el, opts = {}) {
  const state = { ...(opts.start || APT.current) };
  const min = opts.min || { year: 2026, month: 10 };
  const max = opts.max || latestDataMonth();
  const idx = (o) => o.year * 12 + o.month;
  const onChange = opts.onChange;
  const render = () => {
    el.innerHTML = `
      <button class="pg-btn" data-prev title="ເດືອນກ່ອນໜ້າ">${icon("chevLeft", 14)}</button>
      <span class="pg-label">${monthLabel(state.month, state.year)}</span>
      <button class="pg-btn" data-next title="ເດືອນຕໍ່ໄປ">${icon("chevRight", 14)}</button>`;
    el.querySelector("[data-next]").disabled = idx(state) >= idx(max);
    el.querySelector("[data-prev]").disabled = idx(state) <= idx(min);
    el.querySelector("[data-prev]").onclick = () => {
      if (idx(state) <= idx(min)) return;
      state.month--;
      if (state.month < 1) { state.month = 12; state.year--; }
      render();
      onChange && onChange({ ...state });
    };
    el.querySelector("[data-next]").onclick = () => {
      if (idx(state) >= idx(max)) return;
      state.month++;
      if (state.month > 12) { state.month = 1; state.year++; }
      render();
      onChange && onChange({ ...state });
    };
  };
  render();
  return state;
}

/* ---------------- ເລີ່ມ ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  /* ຍັງບໍ່ໄດ້ເຂົ້າສູ່ລະບົບ → ໄປໜ້າ login */
  if (page !== "login" && !currentUser()) {
    location.replace("login.html");
    return;
  }
  renderChrome();
  applyViewerMode();
  if (typeof DB !== "undefined")
    DB.ready
      .then(() => {
        refreshNavBadges();
        /* ຫຼັງໂຫຼດຖານຂໍ້ມູນແລ້ວ: ຖ້າຜູ້ໃຊ້ຖືກປິດໃຊ້ ຫຼື ບໍ່ມີຢູ່ແລ້ວ → ອອກຈາກລະບົບ */
        if (page !== "login" && !currentUser()) {
          clearSession();
          location.replace("login.html");
        }
      })
      .catch(() => {});
});
