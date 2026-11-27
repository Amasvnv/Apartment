import type { ComponentType } from "react";
import {
  IconBuilding,
  IconChartHistogram,
  IconGauge,
  IconHistory,
  IconLayoutDashboard,
  IconReceipt2,
  IconSearch,
  IconSettings,
  IconTools,
  IconUserShield,
  IconUsers
} from "@tabler/icons-react";

export type NavIcon = ComponentType<{ size?: number | string; stroke?: number | string }>;

export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: NavIcon;
  badge?: "invoices" | "repairs";
  group: "overview" | "operations" | "system";
  primary?: boolean;
}

export const NAV_GROUPS: { key: NavItem["group"]; label: string }[] = [
  { key: "overview", label: "ພາບລວມ" },
  { key: "operations", label: "ປະຕິບັດງານ" },
  { key: "system", label: "ລະບົບ" }
];

export const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "ພາບລວມ", path: "/", icon: IconLayoutDashboard, group: "overview", primary: true },
  { key: "reports", label: "ລາຍງານ", path: "/reports", icon: IconChartHistogram, group: "overview" },
  { key: "meter", label: "ຈົດມິເຕີ", path: "/meter", icon: IconGauge, group: "operations", primary: true },
  { key: "invoices", label: "ໃບບີນເກັບເງິນ", path: "/invoices", icon: IconReceipt2, badge: "invoices", group: "operations", primary: true },
  { key: "rooms", label: "ຫ້ອງພັກ", path: "/rooms", icon: IconBuilding, group: "operations" },
  { key: "tenants", label: "ຜູ້ເຊົ່າ", path: "/tenants", icon: IconUsers, group: "operations", primary: true },
  { key: "repairs", label: "ສ້ອມແປງ", path: "/repairs", icon: IconTools, badge: "repairs", group: "operations" },
  { key: "bill-check", label: "ກວດເບິ່ງບີນ", path: "/bill-check", icon: IconSearch, group: "system" },
  { key: "activity", label: "ການເຄື່ອນໄຫວ", path: "/activity", icon: IconHistory, group: "system" },
  { key: "users", label: "ຜູ້ໃຊ້", path: "/users", icon: IconUserShield, group: "system" },
  { key: "settings", label: "ຕັ້ງຄ່າ", path: "/settings", icon: IconSettings, group: "system" }
];
