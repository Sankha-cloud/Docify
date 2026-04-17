import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { sanitizeFilename } from "./common";

// html2canvas-pro is a drop-in fork of html2canvas that natively parses
// modern CSS color functions (oklch, oklab, lab, lch, color()). Next.js /
// Turbopack / Tailwind v4 emit these freely, and the legacy html2canvas@1.4
// parser throws on any of them. Upstream html2canvas is effectively
// unmaintained; html2canvas-pro is the maintained fix.
export async function downloadPdf(editor: Editor, title: string) {
  const t = toast.loading("Preparing PDF...");
  try {
    const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
      import("jspdf"),
      import("html2canvas-pro"),
    ]);
    const html2canvas = (
      html2canvasMod as unknown as { default: typeof html2canvasMod.default }
    ).default;
    const el = document.querySelector(
      "[data-tiptap-root] .ProseMirror",
    ) as HTMLElement | null;
    if (!el) throw new Error("Editor not found");

    const canvas = await html2canvas(el, {
      scale: 2,
      backgroundColor: "#fff",
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 48;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 24;

    pdf.addImage(imgData, "PNG", 24, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - 48;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 24;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 24, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 48;
    }

    pdf.save(`${sanitizeFilename(title)}.pdf`);
    toast.success("Downloaded .pdf", { id: t });
  } catch (error) {
    console.error("[pdf] export failed:", error);
    toast.error(getErrorMessage(error, "PDF export failed"), { id: t });
  }
}
