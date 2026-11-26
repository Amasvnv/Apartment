import type { Apartment, AppData, Invoice, Repair, Room, Tenant } from "./types";

export const defaultSettings = (): Apartment => ({
  name: "ເຮືອນພັກ ແລະ ຫ້ອງແຖວ ສຸວັນນະວົງ",
  address: "ບ້ານ ໂນນສະຫວັນ, ເມືອງ ໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ",
  manager: "ຜູ້ຈັດການ",
  currency: "₭",
  rent: 1000000,
  rentByMonth: {},
  ratesByMonth: {},
  monthNotes: {},
  monthNotes2: {},
  electricRate: 1900,
  waterRate: 4500,
  waterTotal: 600000,
  serviceFee: 80000,
  trashFee: 20000,
  trashTotal: 400000,
  otherFees: [],
  extraFeesByMonth: {},
  meterReadings: {},
  activity: [],
  users: [
    {
      id: "U-01",
      name: "ຫົງຄຳ",
      phone: "020 58855817",
      role: "manager",
      pin: "1234",
      active: true,
      perms: {
        overview: ["view"],
        meter: ["view", "edit"],
        rooms: ["view", "edit", "delete"],
        tenants: ["view", "edit", "delete"],
        invoices: ["view", "edit", "delete"],
        repairs: ["view", "edit", "delete"],
        settings: ["view", "edit"],
        users: ["view", "edit"]
      }
    },
    {
      id: "U-02",
      name: "ຊ່າງ ສົມສັກ ວົງສະຫວັນ",
      phone: "020 55 123 456",
      role: "tech",
      pin: "1234",
      active: true,
      perms: { overview: ["view"], repairs: ["view", "edit"] }
    }
  ],
  current: { year: 2026, month: 11 }
});

const seedRooms: Room[] = [
  { no: "101", floor: 1, type: "1 ຫ້ອງນອນ", rent: 1600000, status: "occupied", tenant: "ນາງ ສຸກສະຫວັນ ພິມະສານ", phone: "020 55 214 880", meterElec: 1965, meterWater: 219 },
  { no: "102", floor: 1, type: "1 ຫ້ອງນອນ", rent: 1600000, status: "occupied", tenant: "ທ້າວ ຄຳພອຍ ສີສຸວັນ", phone: "020 77 902 116", meterElec: 1723, meterWater: 202 },
  { no: "103", floor: 1, type: "1 ຫ້ອງນອນ", rent: 1200000, status: "vacant", tenant: null, phone: null, meterElec: 640, meterWater: 96 },
  { no: "201", floor: 2, type: "1 ຫ້ອງນອນ", rent: 1600000, status: "occupied", tenant: "ນາງ ບົວຄຳ ວັນນະສິນ", phone: "020 59 331 407", meterElec: 2276, meterWater: 271 },
  { no: "202", floor: 2, type: "1 ຫ້ອງນອນ", rent: 1600000, status: "occupied", tenant: "ທ້າວ ສົມພອນ ໄຊຍະວົງ", phone: "020 91 448 220", meterElec: 1895, meterWater: 214 },
  { no: "203", floor: 2, type: "1 ຫ້ອງນອນ", rent: 1200000, status: "repair", tenant: null, phone: null, meterElec: 720, meterWater: 104 },
  { no: "301", floor: 3, type: "1 ຫ້ອງນອນ", rent: 1600000, status: "occupied", tenant: "ນາງ ມະນີວັນ ຈັນທະວົງ", phone: "020 56 770 933", meterElec: 2551, meterWater: 286 },
  { no: "302", floor: 3, type: "1 ຫ້ອງນອນ", rent: 1600000, status: "occupied", tenant: "ທ້າວ ອານຸສິນ ແກ້ວມະນີ", phone: "020 78 205 641", meterElec: 2135, meterWater: 239 },
  { no: "303", floor: 3, type: "1 ຫ້ອງນອນ", rent: 1200000, status: "occupied", tenant: "ນາງ ດາລາ ພູວົງ", phone: "020 54 118 372", meterElec: 1471, meterWater: 177 },
  { no: "401", floor: 4, type: "2 ຫ້ອງນອນ", rent: 2200000, status: "occupied", tenant: "ທ້າວ ບຸນມີ ສີຫາວົງ", phone: "020 99 640 258", meterElec: 2256, meterWater: 255 },
  { no: "402", floor: 4, type: "2 ຫ້ອງນອນ", rent: 2200000, status: "vacant", tenant: null, phone: null, meterElec: 540, meterWater: 84 },
  { no: "403", floor: 4, type: "2 ຫ້ອງນອນ", rent: 2200000, status: "occupied", tenant: "ນາງ ຈັນສະໝອນ ວຽງຄຳ", phone: "020 52 887 704", meterElec: 1829, meterWater: 216 }
];

const seedTenants: Tenant[] = [
  { name: "ນາງ ສຸກສະຫວັນ ພິມະສານ", phone: "020 55 214 880", room: "101", contract: "1 ປີ", moveIn: "01 ມ.ກ. 24", people: 1, deposit: 2400000, rent: 1600000, stayStatus: "resident" },
  { name: "ທ້າວ ຄຳພອຍ ສີສຸວັນ", phone: "020 77 902 116", room: "102", contract: "ບໍ່ມີສັນຍາ", moveIn: "15 ສ.ຫ. 24", people: 2, deposit: 1200000, rent: 1600000, stayStatus: "away" },
  { name: "ນາງ ບົວຄຳ ວັນນະສິນ", phone: "020 59 331 407", room: "201", contract: "1 ປີ", moveIn: "01 ມ.ງ. 23", people: 3, deposit: 2200000, rent: 1600000, stayStatus: "resident" },
  { name: "ທ້າວ ສົມພອນ ໄຊຍະວົງ", phone: "020 91 448 220", room: "202", contract: "ບໍ່ມີສັນຍາ", moveIn: "10 ມ.ກ. 25", people: 1, deposit: 1600000, rent: 1600000, stayStatus: "resident" },
  { name: "ນາງ ມະນີວັນ ຈັນທະວົງ", phone: "020 56 770 933", room: "301", contract: "1 ປີ", moveIn: "20 ສ.ຫ. 24", people: 2, deposit: 2400000, rent: 1600000, stayStatus: "resident" },
  { name: "ທ້າວ ອານຸສິນ ແກ້ວມະນີ", phone: "020 78 205 641", room: "302", contract: "ບໍ່ມີສັນຍາ", moveIn: "01 ກ.ພ. 25", people: 3, deposit: 2200000, rent: 1600000, stayStatus: "away" },
  { name: "ນາງ ດາລາ ພູວົງ", phone: "020 54 118 372", room: "303", contract: "ບໍ່ມີສັນຍາ", moveIn: "12 ກ.ພ. 24", people: 1, deposit: 1600000, rent: 1200000, stayStatus: "away" },
  { name: "ທ້າວ ບຸນມີ ສີຫາວົງ", phone: "020 99 640 258", room: "401", contract: "1 ປີ", moveIn: "01 ກ.ລ. 23", people: 2, deposit: 2400000, rent: 2200000, stayStatus: "resident" },
  { name: "ນາງ ຈັນສະໝອນ ວຽງຄຳ", phone: "020 52 887 704", room: "403", contract: "1 ປີ", moveIn: "03 ມ.ີ. 25", people: 3, deposit: 2200000, rent: 2200000, stayStatus: "resident" }
];

const seedInvoices: Invoice[] = [
  { no: "INV-202611-101", room: "101", tenant: "ນາງ ສຸກສະຫວັນ ພິມະສານ", kwh: 153, m3: 7, rent: 1600000, service: 80000, other: 30000, paid: false, due: "10 ພ.ຈ. 26", year: 2026, month: 11 },
  { no: "INV-202611-102", room: "102", tenant: "ທ້າວ ຄຳພອຍ ສີສຸວັນ", kwh: 125, m3: 15, rent: 1600000, service: 80000, other: 0, paid: true, due: "10 ພ.ຈ. 26", year: 2026, month: 11 },
  { no: "INV-202611-201", room: "201", tenant: "ນາງ ບົວຄຳ ວັນນະສິນ", kwh: 89, m3: 7, rent: 1600000, service: 80000, other: 0, paid: false, due: "10 ພ.ຈ. 26", year: 2026, month: 11 },
  { no: "INV-202611-202", room: "202", tenant: "ທ້າວ ສົມພອນ ໄຊຍະວົງ", kwh: 87, m3: 8, rent: 1600000, service: 80000, other: 30000, paid: true, due: "10 ພ.ຈ. 26", year: 2026, month: 11 },
  { no: "INV-202611-301", room: "301", tenant: "ນາງ ມະນີວັນ ຈັນທະວົງ", kwh: 146, m3: 11, rent: 1600000, service: 80000, other: 0, paid: false, due: "10 ພ.ຈ. 26", year: 2026, month: 11 },
  { no: "INV-202611-302", room: "302", tenant: "ທ້າວ ອານຸສິນ ແກ້ວມະນີ", kwh: 151, m3: 7, rent: 1600000, service: 80000, other: 0, paid: true, due: "10 ພ.ຈ. 26", year: 2026, month: 11 },
  { no: "INV-202611-401", room: "401", tenant: "ທ້າວ ບຸນມີ ສີຫາວົງ", kwh: 127, m3: 7, rent: 2200000, service: 80000, other: 0, paid: false, due: "10 ພ.ຈ. 26", year: 2026, month: 11 },
  { no: "INV-202610-101", room: "101", tenant: "ນາງ ສຸກສະຫວັນ ພິມະສານ", kwh: 130, m3: 12, rent: 1600000, service: 80000, other: 0, paid: true, due: "10 ຕ.ລ. 26", year: 2026, month: 10 },
  { no: "INV-202610-102", room: "102", tenant: "ທ້າວ ຄຳພອຍ ສີສຸວັນ", kwh: 120, m3: 14, rent: 1600000, service: 80000, other: 0, paid: true, due: "10 ຕ.ລ. 26", year: 2026, month: 10 },
  { no: "INV-202610-201", room: "201", tenant: "ນາງ ບົວຄຳ ວັນນະສິນ", kwh: 105, m3: 10, rent: 1600000, service: 80000, other: 0, paid: true, due: "10 ຕ.ລ. 26", year: 2026, month: 10 },
  { no: "INV-202610-202", room: "202", tenant: "ທ້າວ ສົມພອນ ໄຊຍະວົງ", kwh: 110, m3: 11, rent: 1600000, service: 80000, other: 0, paid: true, due: "10 ຕ.ລ. 26", year: 2026, month: 10 },
  { no: "INV-202610-301", room: "301", tenant: "ນາງ ມະນີວັນ ຈັນທະວົງ", kwh: 125, m3: 12, rent: 1600000, service: 80000, other: 0, paid: true, due: "10 ຕ.ລ. 26", year: 2026, month: 10 },
  { no: "INV-202610-302", room: "302", tenant: "ທ້າວ ອານຸສິນ ແກ້ວມະນີ", kwh: 128, m3: 11, rent: 1600000, service: 80000, other: 0, paid: true, due: "10 ຕ.ລ. 26", year: 2026, month: 10 },
  { no: "INV-202610-303", room: "303", tenant: "ນາງ ດາລາ ພູວົງ", kwh: 95, m3: 8, rent: 1200000, service: 80000, other: 0, paid: true, due: "10 ຕ.ລ. 26", year: 2026, month: 10 },
  { no: "INV-202610-401", room: "401", tenant: "ທ້າວ ບຸນມີ ສີຫາວົງ", kwh: 120, m3: 11, rent: 2200000, service: 80000, other: 400000, paid: true, due: "10 ຕ.ລ. 26", year: 2026, month: 10 },
  { no: "INV-202610-403", room: "403", tenant: "ນາງ ຈັນສະໝອນ ວຽງຄຳ", kwh: 125, m3: 11, rent: 2200000, service: 80000, other: 0, paid: true, due: "10 ຕ.ລ. 26", year: 2026, month: 10 }
];

const seedRepairs: Repair[] = [
  { id: "RP-202611-01", room: "5", title: "ໄຟຟ້າດັບໃນຫ້ອງນ້ຳ", category: "electric", priority: "urgent", status: "in_progress", assignee: "ຊ່າງ ສົມສັກ ວົງສະຫວັນ", phone: "020 55 123 456", cost: 180000, reported: "2026-11-02", due: "2026-11-04", done: "", note: "ເບຣກເກີຂັດ ແລະ ສາຍໄຟເກົ່າ — ຕ້ອງປ່ຽນເບຣກເກີໃໝ່" },
  { id: "RP-202611-02", room: "10", title: "ແອເຢັນບໍ່ເຢັນ ລົມອອກອຸ່ນ", category: "aircon", priority: "high", status: "open", assignee: "ຊ່າງ ຄຳແສງ ສີພົມ", phone: "020 91 222 334", cost: 0, reported: "2026-11-03", due: "2026-11-06", done: "", note: "ສົງໄສນ້ຳຍາໝົດ ຫຼື ຄອນເດັນເປື້ອນ" },
  { id: "RP-202611-03", room: "1", title: "ປະຕູຫ້ອງນອນປິດບໍ່ສະນິດ", category: "building", priority: "normal", status: "open", assignee: "", phone: "", cost: 0, reported: "2026-11-05", due: "2026-11-08", done: "", note: "ບານພັກປະຕູຫຼົ່ນ ຕ້ອງປັບໃໝ່" },
  { id: "RP-202611-04", room: "2", title: "ໄຟເພດານກະພິບ", category: "electric", priority: "normal", status: "done", assignee: "ຊ່າງ ສົມສັກ ວົງສະຫວັນ", phone: "020 55 123 456", cost: 65000, reported: "2026-11-01", due: "2026-11-03", done: "2026-11-02", note: "ປ່ຽນຫຼອດໄຟ LED 2 ຫຼອດ" },
  { id: "RP-202610-03", room: "7", title: "ທໍ່ນ້ຳຮົ່ວໃຕ້ອ່າງລ້າງຈານ", category: "water", priority: "high", status: "done", assignee: "ຊ່າງ ບຸນທອງ ພົມມະຈັນ", phone: "020 77 445 901", cost: 95000, reported: "2026-10-21", due: "2026-10-23", done: "2026-10-22", note: "ປ່ຽນຂໍ້ຕໍ່ PVC ແລະ ຢາງອັດ" },
  { id: "RP-202610-04", room: "3", title: "ປ່ຽນຕຽງນອນ ແລະ ຕູ້ເສື້ອຜ້າ", category: "furniture", priority: "low", status: "done", assignee: "ຊ່າງ ສົມພອນ ພົມມະວົງ", phone: "020 58 664 112", cost: 450000, reported: "2026-10-12", due: "2026-10-18", done: "2026-10-17", note: "ປ່ຽນຕຽງ 6 ຟຸດ" },
  { id: "RP-202610-05", room: "8", title: "ປະຕູລິບຄ້າງ ປິດ-ເປີດຍາກ", category: "building", priority: "normal", status: "cancelled", assignee: "", phone: "", cost: 0, reported: "2026-10-08", due: "2026-10-10", done: "", note: "ຍົກເລີກ ເນື່ອງຈາກຍ້າຍອອກ" }
];

export function seedData(): AppData {
  return {
    settings: defaultSettings(),
    rooms: seedRooms,
    tenants: seedTenants,
    invoices: seedInvoices,
    repairs: seedRepairs
  };
}
