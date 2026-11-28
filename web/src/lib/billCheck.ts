/** ລິ້ງໜ້າກວດໃບບີນສຳລັບລູກຄ້າ (ເຜີຍແຜ່ຜ່ານ GitHub Pages) */
export const BILL_CHECK_URL = "https://amasvnv.github.io/Apartment/#/bill-check";

/**
 * ລິ້ງກວດໃບບີນຂອງຫ້ອງໃດໜຶ່ງ — ສະແກນແລ້ວເປີດໃບບີນຂອງຫ້ອງນັ້ນທັນທີ
 * (ໜ້າ /bill-check ອ່ານຄ່າ room ຈາກ query string).
 */
export function billCheckUrl(room?: string | number): string {
  const value = String(room ?? "").trim();
  return value ? `${BILL_CHECK_URL}?room=${encodeURIComponent(value)}` : BILL_CHECK_URL;
}

/** ສະແດງລິ້ງແບບສັ້ນ (ບໍ່ມີ https://) ໃສ່ໃນເອກະສານ */
export function billCheckShortUrl(room?: string | number): string {
  return billCheckUrl(room).replace(/^https?:\/\//, "");
}
