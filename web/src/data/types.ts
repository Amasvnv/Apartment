export type PermAction = "view" | "edit" | "delete";
export type UserRole = "manager" | "tech" | "staff" | "viewer";
export type StayStatus = "resident" | "away";
export type RoomStatus = "occupied" | "vacant" | "repair";
export type RepairPriority = "low" | "normal" | "high" | "urgent";
export type RepairStatus = "open" | "in_progress" | "done" | "cancelled";
export type RepairCategory = "electric" | "water" | "furniture" | "aircon" | "building" | "other";

export interface Room {
  no: string;
  floor: number;
  type: string;
  rent: number;
  status: RoomStatus;
  tenant: string | null;
  phone: string | null;
  meterElec: number;
  meterWater: number;
}

export interface Tenant {
  name: string;
  phone: string;
  room: string;
  contract: string;
  moveIn: string;
  people: number;
  deposit: number;
  rent: number;
  stayStatus: StayStatus;
}

export interface Invoice {
  no: string;
  room: string;
  tenant: string;
  kwh: number;
  m3: number;
  rent: number;
  service: number;
  other: number;
  paid: boolean;
  due: string;
  year: number;
  month: number;
}

export interface Repair {
  id: string;
  room: string;
  title: string;
  category: RepairCategory;
  priority: RepairPriority;
  status: RepairStatus;
  assignee: string;
  phone: string;
  cost: number;
  reported: string;
  due: string;
  done: string;
  note: string;
}

export interface AptUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  pin: string;
  active: boolean;
  perms: Partial<Record<string, PermAction[]>>;
}

export interface ActivityItem {
  t: number;
  kind: string;
  title: string;
  detail: string;
  by?: string;
  byRole?: string;
}

export interface Rates {
  rent: number;
  electricRate: number;
  waterTotal: number;
  trashTotal: number;
  serviceFee: number;
}

export interface ExtraFee {
  name: string;
  amount: number;
  active: boolean;
}

export interface Apartment {
  name: string;
  address: string;
  manager: string;
  currency: string;
  rent: number;
  rentByMonth: Record<string, number>;
  ratesByMonth: Record<string, Partial<Rates>>;
  monthNotes: Record<string, string>;
  monthNotes2: Record<string, string>;
  electricRate: number;
  waterRate: number;
  waterTotal: number;
  serviceFee: number;
  trashFee: number;
  trashTotal: number;
  otherFees: ExtraFee[];
  extraFeesByMonth: Record<string, ExtraFee[]>;
  tenantsByMonth: Record<string, Tenant[]>;
  meterReadings: Record<string, Record<string, number>>;
  activity: ActivityItem[];
  users: AptUser[];
  current: { year: number; month: number };
}

export interface AppData {
  settings: Apartment;
  rooms: Room[];
  tenants: Tenant[];
  invoices: Invoice[];
  repairs: Repair[];
  rev?: number;
}

export type DbMode = "supabase" | "server" | "local";

export interface MonthRef {
  year: number;
  month: number;
}
