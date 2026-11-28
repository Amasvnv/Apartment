/**
 * ສ້າງໄຟລ໌ PDF ຈາກເອກະສານໃນໜ້າ ແລ້ວດາວໂຫຼດລົງເຄື່ອງໂດຍກົງ (ບໍ່ຜ່ານໜ້າຕ່າງພິມ).
 *
 * ແຕ່ລະ `.rcp-paper` ຖືກປັບໃຫ້ເປັນ "ແຜ່ນກະດາດ A4" ແລ້ວວາດເປັນຮູບຄວາມລະອຽດສູງ
 * ວາງລົງໜ້າ A4 ໜຶ່ງໜ້າຕໍ່ໜຶ່ງສະບັບ ໃຫ້ເຕັມໜ້າທັງກວ້າງ ແລະ ສູງ.
 */
const PAGE = { width: 210, height: 297 };
const MARGIN = 5;
/** ຄວາມລະອຽດເປົ້າໝາຍຕອນພິມ (DPI) — ສູງກວ່ານີ້ໄຟລ໌ຈະໃຫຍ່ໂດຍບໍ່ຈຳເປັນ */
const TARGET_DPI = 450;
/** ຄວາມກວ້າງກະດາດທີ່ອະນຸຍາດ (px) ຕອນຄິດໄລ່ໃຫ້ອັດຕາສ່ວນພໍດີ A4 */
const SHEET_MIN_WIDTH = 760;
const SHEET_MAX_WIDTH = 1200;

export async function savePdf(fileName: string) {
  const papers = Array.from(document.querySelectorAll<HTMLElement>(".rcp-paper"));
  if (!papers.length) throw new Error("ບໍ່ພົບເອກະສານທີ່ຈະສ້າງ PDF");

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf")
  ]);

  if (document.fonts?.ready) await document.fonts.ready;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const maxWidth = PAGE.width - MARGIN * 2;
  const maxHeight = PAGE.height - MARGIN * 2;
  /** ອັດຕາສ່ວນ ສູງ/ກວ້າງ ຂອງພື້ນທີ່ພິມ */
  const sheetRatio = maxHeight / maxWidth;
  const saved = papers.map((paper) => ({
    width: paper.style.width,
    maxWidth: paper.style.maxWidth,
    minHeight: paper.style.minHeight
  }));

  try {
    for (let index = 0; index < papers.length; index += 1) {
      const paper = papers[index];
      paper.classList.add("is-pdf");

      // ຫາຄວາມກວ້າງກະດາດ ທີ່ເຮັດໃຫ້ ສູງ/ກວ້າງ ຂອງເອກະສານ ເທົ່າກັບພື້ນທີ່ A4 ພໍດີ
      // (ກວ້າງຂຶ້ນ → ຂໍ້ຄວາມຕັດຫຼາຍກວ່າໜ້ອຍໜຶ່ງ ແລະ ເອກະສານເຕ້ຍລົງ)
      let width = 794;
      for (let round = 0; round < 8; round += 1) {
        paper.style.width = `${width}px`;
        paper.style.maxWidth = `${width}px`;
        paper.style.minHeight = `${Math.round(width * sheetRatio)}px`;
        const height = paper.getBoundingClientRect().height;
        const next = Math.round(
          Math.min(SHEET_MAX_WIDTH, Math.max(SHEET_MIN_WIDTH, height / sheetRatio))
        );
        if (Math.abs(next - width) <= 2) {
          width = next;
          break;
        }
        width = next;
      }

      paper.style.width = `${width}px`;
      paper.style.maxWidth = `${width}px`;
      const sheetHeight = Math.max(
        Math.round(width * sheetRatio),
        Math.ceil(paper.getBoundingClientRect().height)
      );
      paper.style.minHeight = `${sheetHeight}px`;

      const scale = Math.min(6, Math.max(3, Math.round(((maxWidth / 25.4) * TARGET_DPI / width) * 10) / 10));

      const canvas = await html2canvas(paper, {
        scale,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        windowWidth: 1280,
        windowHeight: 1400
      });

      if (index > 0) doc.addPage();

      let drawWidth = maxWidth;
      let drawHeight = (canvas.height / canvas.width) * drawWidth;
      if (drawHeight > maxHeight) {
        drawWidth *= maxHeight / drawHeight;
        drawHeight = maxHeight;
      }

      doc.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        (PAGE.width - drawWidth) / 2,
        (PAGE.height - drawHeight) / 2,
        drawWidth,
        drawHeight,
        undefined,
        "FAST"
      );
    }

    doc.save(`${fileName}.pdf`);
  } finally {
    papers.forEach((paper, index) => {
      paper.classList.remove("is-pdf");
      paper.style.width = saved[index].width;
      paper.style.maxWidth = saved[index].maxWidth;
      paper.style.minHeight = saved[index].minHeight;
    });
  }
}
