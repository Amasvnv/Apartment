import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle } from "@tabler/icons-react";
import type { CSSProperties } from "react";

export type StatusTone = "success" | "danger" | "info";

const TONE = {
  success: { color: "teal", line: "#12a06a", icon: <IconCircleCheck size={20} /> },
  danger: { color: "red", line: "#e5484d", icon: <IconAlertTriangle size={20} /> },
  info: { color: "blue", line: "#1663c4", icon: <IconInfoCircle size={20} /> }
} as const;

const timeNow = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** ແຈ້ງສະຖານະຫຼັງບັນທຶກ / ແກ້ໄຂ / ລຶບ ພ້ອມເສັ້ນສີບອກເວລາ */
export function notifyStatus(tone: StatusTone, title: string, message: string) {
  const meta = TONE[tone];
  notifications.show({
    position: "bottom-right",
    color: meta.color,
    radius: "lg",
    autoClose: 4000,
    withBorder: true,
    className: "status-toast",
    style: { "--toast-line": meta.line } as CSSProperties,
    icon: meta.icon,
    title,
    message: `${message} · ເວລາ ${timeNow()}`
  });
}
