import { Box, Button, Group, Modal, Text } from "@mantine/core";
import { IconAlertTriangle, IconCircleCheck, IconTrash } from "@tabler/icons-react";
import type { ReactNode } from "react";

export type ConfirmState = "idle" | "busy" | "done" | "error";

interface ConfirmDialogProps {
  opened: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel: string;
  doneLabel: string;
  state: ConfirmState;
  error?: string;
  targetIcon?: ReactNode;
  targetColor?: string;
  targetTitle?: string;
  targetMeta?: string;
  targetAmount?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDialog({
  opened,
  title,
  description,
  confirmLabel,
  busyLabel,
  doneLabel,
  state,
  error,
  targetIcon,
  targetColor = "#1663c4",
  targetTitle,
  targetMeta,
  targetAmount,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  const tone = state === "done" ? "done" : state === "error" ? "error" : "idle";
  const statusText =
    state === "busy"
      ? busyLabel
      : state === "done"
        ? doneLabel
        : state === "error"
          ? error || "ເກີດຂໍ້ຜິດພາດ — ກະລຸນາລອງໃໝ່"
          : "ກົດຢືນຢັນເພື່ອດຳເນີນການ";

  return (
    <Modal
      opened={opened}
      onClose={state === "busy" ? () => undefined : onCancel}
      centered
      size={430}
      radius={20}
      withCloseButton={false}
      closeOnClickOutside={state !== "busy"}
      closeOnEscape={state !== "busy"}
      classNames={{ content: "rep-confirm", body: "rep-confirm-body" }}
    >
      <Box className="rep-confirm-pad">
        <Group className="rep-confirm-head" align="flex-start" gap={14} wrap="nowrap">
          <Box className="rep-confirm-ico" data-state={state}>
            {state === "done" ? <IconCircleCheck size={22} /> : <IconAlertTriangle size={22} />}
          </Box>
          <Box>
            <Text className="rep-confirm-title">{title}</Text>
            <Text className="rep-confirm-sub">{description}</Text>
          </Box>
        </Group>

        {targetTitle ? (
          <Box className="rep-confirm-target">
            {targetIcon ? (
              <Box
                className="rep-confirm-target-ico"
                style={{
                  color: targetColor,
                  background: `color-mix(in srgb, ${targetColor} 12%, transparent)`
                }}
              >
                {targetIcon}
              </Box>
            ) : null}
            <Box className="rep-confirm-target-body">
              <Text className="rep-confirm-target-title">{targetTitle}</Text>
              {targetMeta ? <Text className="rep-confirm-target-meta">{targetMeta}</Text> : null}
            </Box>
            {targetAmount ? <Text className="rep-confirm-cost tnum">{targetAmount}</Text> : null}
          </Box>
        ) : null}

        <Box className="cfm-status" data-tone={tone}>
          <Text className="cfm-status-text">{statusText}</Text>
          <Box className="cfm-progress" data-state={state} aria-hidden>
            <span />
          </Box>
        </Box>

        <Group className="rep-confirm-actions" gap={10} wrap="nowrap">
          <Button variant="default" radius="xl" onClick={onCancel} disabled={state === "busy"}>
            ຍົກເລີກ
          </Button>
          <Button
            className="rep-confirm-btn-danger"
            radius="xl"
            leftSection={<IconTrash size={16} />}
            onClick={onConfirm}
            loading={state === "busy"}
            disabled={state === "done"}
          >
            {state === "busy" ? busyLabel : confirmLabel}
          </Button>
        </Group>
      </Box>
    </Modal>
  );
}
