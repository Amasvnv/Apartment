import type { ComponentType } from "react";
import {
  IconBuilding,
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
}

export const NAV_ITEMS: NavItem[] = [
  { key: "overview", label: "ພາບລວມ", path: "/", icon: IconLayoutDashboard },
  { key: "meter", label: "ຈົດມິເຕີ", path: "/meter", icon: IconGauge },
  { key: "rooms", label: "ຫ້ອງພັກ", path: "/rooms", icon: IconBuilding },
  { key: "tenants", label: "ຜູ້ເຊົ່າ", path: "/tenants", icon: IconUsers },
  { key: "invoices", label: "ໃບບີນເກັບເງິນ", path: "/invoices", icon: IconReceipt2, badge: "invoices" },
  { key: "bill-check", label: "ກວດເບິ່ງບີນ", path: "/bill-check", icon: IconSearch },
  { key: "repairs", label: "ສ້ອມແປງ", path: "/repairs", icon: IconTools, badge: "repairs" },
  { key: "activity", label: "ການເຄື່ອນໄຫວ", path: "/activity", icon: IconHistory },
  { key: "users", label: "ຜູ້ໃຊ້", path: "/users", icon: IconUserShield },
  { key: "settings", label: "ຕັ້ງຄ່າ", path: "/settings", icon: IconSettings }
];
