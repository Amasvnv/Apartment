/**
 * ສ້າງໄຟລ໌ PDF ຈາກເອກະສານໃນໜ້າ ແລ້ວດາວໂຫຼດລົງເຄື່ອງໂດຍກົງ (ບໍ່ຜ່ານໜ້າຕ່າງພິມ).
 *
 * ແຕ່ລະ `.rcp-paper` ຖືກວາດເປັນຮູບຄວາມລະອຽດສູງ ແລ້ວວາງລົງໜ້າ A4
 * ໜຶ່ງໜ້າຕໍ່ໜຶ່ງສະບັບ — ຖ້າເນື້ອຫາສູງເກີນໜ້າ ຈະຫຍໍ້ຂະໜາດລົງໃຫ້ພໍດີ
 * ເພື່ອບໍ່ໃຫ້ມີຫຍັງຖືກຕັດ.
 */
const PAGE = { width: 210, height: 297 };
const MARGIN = 5;

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

  for (let index = 0; index < papers.length; index += 1) {
    const canvas = await html2canvas(papers[index], {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      // ບັງຄັບຄວາມກວ້າງ viewport ຂອງສຳເນົາ ໃຫ້ໃຊ້ layout ແບບ desktop ສະເໝີ
      windowWidth: 1280,
      windowHeight: 1400,
      onclone: (cloned) => {
        cloned.querySelectorAll<HTMLElement>(".rcp-paper").forEach((node) => node.classList.add("is-pdf"));
      }
    });

    if (index > 0) doc.addPage();

    let width = maxWidth;
    let height = (canvas.height / canvas.width) * width;
    if (height > maxHeight) {
      width *= maxHeight / height;
      height = maxHeight;
    }

    doc.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      (PAGE.width - width) / 2,
      MARGIN,
      width,
      height,
      undefined,
      "FAST"
    );
  }

  doc.save(`${fileName}.pdf`);
}
