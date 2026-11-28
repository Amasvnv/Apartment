import { Box, Text } from "@mantine/core";

export default function BillNote({ note1, note2 }: { note1?: string; note2?: string }) {
  const notes = [note1 || "", note2 || ""].map((item) => item.trim()).filter(Boolean);
  if (!notes.length) return null;

  return (
    <Box className="rcp-note">
      <Box className="rcp-note-head">
        <Text className="rcp-note-title">ໝາຍເຫດ</Text>
        <Text className="rcp-note-tag">ຂໍ້ກຳນົດ ແລະ ຂໍ້ຕົກລົງຂອງອາຄານ</Text>
      </Box>
      {notes.map((item, index) => (
        <Text key={index} className="rcp-note-text">
          {item}
        </Text>
      ))}
    </Box>
  );
}
