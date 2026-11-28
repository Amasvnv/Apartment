import { Box, Text } from "@mantine/core";
import { QRCodeCanvas } from "qrcode.react";
import { billCheckShortUrl, billCheckUrl } from "../lib/billCheck";

/**
 * ບລັອກ QR ສຳລັບລູກຄ້າ: ສະແກນແລ້ວເປີດໃບບີນຂອງຫ້ອງນັ້ນໃນໜ້າ /bill-check
 * ອອກແບບໃຫ້ພິມໄດ້ຄົມຊັດ (ພື້ນຫຼັງຂາວ, ສີເຂັ້ມ, ບໍ່ມີເງົາ)
 */
export default function BillCheckQr({ room }: { room?: string | number }) {
  return (
    <Box className="rcp-scan">
      <Box className="rcp-scan-code">
        <QRCodeCanvas
          value={billCheckUrl(room)}
          size={156}
          level="M"
          marginSize={0}
          fgColor="#0b2545"
          bgColor="#ffffff"
          title={`QR ກວດໃບບີນ ຫ້ອງ ${room ?? ""}`}
          style={{ width: 78, height: 78, display: "block" }}
        />
      </Box>
      <Box className="rcp-scan-body">
        <Box className="rcp-scan-head">
          <Text className="rcp-scan-kicker">ກວດໃບບີນອອນລາຍ</Text>
          <Text className="rcp-scan-tag">ບໍ່ຕ້ອງເຂົ້າສູ່ລະບົບ</Text>
        </Box>
        <Text className="rcp-scan-title">ສະແກນ QR ເພື່ອເບິ່ງໃບບີນ ແລະ ສະຖານະຊຳລະ</Text>
        <Text className="rcp-scan-text">
          ເປີດກ້ອງ ຫຼື ແອັບສະແກນ QR ແລ້ວສ່ອງໃສ່ລະຫັດ — ລະບົບຈະເປີດໃບບີນຫ້ອງ {room ?? "—"} ໃຫ້ເບິ່ງທັນທີ
        </Text>
        <Text className="rcp-scan-url">{billCheckShortUrl(room)}</Text>
      </Box>
    </Box>
  );
}
