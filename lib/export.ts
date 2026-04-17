import type { Editor } from "@tiptap/react";
import { toast } from "sonner";

function sanitizeFilename(name: string) {
  return name.replace(/[^\w\s.-]+/g, "").trim() || "document";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadPlainText(editor: Editor, title: string) {
  const text = editor.getText();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `${sanitizeFilename(title)}.txt`);
  toast.success("Downloaded .txt");
}

type TiptapMark = { type: string; attrs?: Record<string, unknown> };
type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
  text?: string;
  content?: TiptapNode[];
};

function nodeToMarkdown(node: TiptapNode, listDepth = 0): string {
  const children = (node.content ?? [])
    .map((n) => nodeToMarkdown(n, listDepth))
    .join("");

  switch (node.type) {
    case "doc":
      return children;
    case "paragraph":
      return children + "\n\n";
    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      return `${"#".repeat(level)} ${children}\n\n`;
    }
    case "bulletList":
      return (
        (node.content ?? [])
          .map(
            (li) =>
              `${"  ".repeat(listDepth)}- ${nodeToMarkdown(li, listDepth + 1).trim()}\n`,
          )
          .join("") + "\n"
      );
    case "orderedList":
      return (
        (node.content ?? [])
          .map(
            (li, i) =>
              `${"  ".repeat(listDepth)}${i + 1}. ${nodeToMarkdown(li, listDepth + 1).trim()}\n`,
          )
          .join("") + "\n"
      );
    case "listItem":
      return children;
    case "blockquote":
      return (
        children
          .trim()
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n") + "\n\n"
      );
    case "codeBlock":
      return `\`\`\`\n${children}\n\`\`\`\n\n`;
    case "horizontalRule":
      return "---\n\n";
    case "hardBreak":
      return "  \n";
    case "image": {
      const src = node.attrs?.src as string | undefined;
      const alt = (node.attrs?.alt as string) ?? "";
      return src ? `![${alt}](${src})` : "";
    }
    case "text": {
      let text = node.text ?? "";
      const marks = node.marks ?? [];
      for (const mark of marks) {
        if (mark.type === "bold") text = `**${text}**`;
        else if (mark.type === "italic") text = `*${text}*`;
        else if (mark.type === "strike") text = `~~${text}~~`;
        else if (mark.type === "code") text = `\`${text}\``;
        else if (mark.type === "link") {
          const href = mark.attrs?.href as string | undefined;
          if (href) text = `[${text}](${href})`;
        }
      }
      return text;
    }
    default:
      return children;
  }
}

export function downloadMarkdown(editor: Editor, title: string) {
  const json = editor.getJSON() as TiptapNode;
  const md = nodeToMarkdown(json).trim() + "\n";
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, `${sanitizeFilename(title)}.md`);
  toast.success("Downloaded .md");
}

export async function downloadPdf(editor: Editor, title: string) {
  const t = toast.loading("Preparing PDF...");
  try {
    const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
      import("jspdf"),
      import("html2canvas"),
    ]);
    const html2canvas = (html2canvasMod as unknown as { default: typeof html2canvasMod.default }).default;
    const el = document.querySelector(
      "[data-tiptap-root] .ProseMirror",
    ) as HTMLElement | null;
    if (!el) throw new Error("Editor not found");

    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#fff" });
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
    toast.error(error instanceof Error ? error.message : "PDF export failed", {
      id: t,
    });
  }
}

export async function downloadDocx(editor: Editor, title: string) {
  const t = toast.loading("Preparing DOCX...");
  try {
    const docx = await import("docx");
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      HeadingLevel,
      AlignmentType,
    } = docx;

    const json = editor.getJSON() as TiptapNode;
    const paragraphs: InstanceType<typeof Paragraph>[] = [];

    const runs = (node: TiptapNode): InstanceType<typeof TextRun>[] => {
      if (node.type === "text") {
        const marks = node.marks ?? [];
        return [
          new TextRun({
            text: node.text ?? "",
            bold: marks.some((m) => m.type === "bold"),
            italics: marks.some((m) => m.type === "italic"),
            underline: marks.some((m) => m.type === "underline")
              ? {}
              : undefined,
            strike: marks.some((m) => m.type === "strike"),
          }),
        ];
      }
      return (node.content ?? []).flatMap(runs);
    };

    const alignFor = (node: TiptapNode) => {
      const a = node.attrs?.textAlign as string | undefined;
      if (a === "center") return AlignmentType.CENTER;
      if (a === "right") return AlignmentType.RIGHT;
      if (a === "justify") return AlignmentType.JUSTIFIED;
      return AlignmentType.LEFT;
    };

    const walk = (node: TiptapNode) => {
      switch (node.type) {
        case "doc":
          (node.content ?? []).forEach(walk);
          break;
        case "paragraph":
          paragraphs.push(
            new Paragraph({ children: runs(node), alignment: alignFor(node) }),
          );
          break;
        case "heading": {
          const level = (node.attrs?.level as number) ?? 1;
          const heading =
            level === 1
              ? HeadingLevel.HEADING_1
              : level === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3;
          paragraphs.push(
            new Paragraph({
              children: runs(node),
              heading,
              alignment: alignFor(node),
            }),
          );
          break;
        }
        case "bulletList":
        case "orderedList":
          (node.content ?? []).forEach((li, i) => {
            const isOrdered = node.type === "orderedList";
            paragraphs.push(
              new Paragraph({
                children: runs(li),
                bullet: isOrdered ? undefined : { level: 0 },
                numbering: isOrdered
                  ? { reference: "default-numbering", level: 0 }
                  : undefined,
                text: isOrdered ? `${i + 1}. ` : undefined,
              }),
            );
          });
          break;
        case "blockquote":
          (node.content ?? []).forEach(walk);
          break;
        case "codeBlock":
          paragraphs.push(
            new Paragraph({ children: runs(node), style: "Code" }),
          );
          break;
        default:
          (node.content ?? []).forEach(walk);
      }
    };

    walk(json);
    if (paragraphs.length === 0) paragraphs.push(new Paragraph({}));

    const doc = new Document({
      sections: [{ properties: {}, children: paragraphs }],
    });
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, `${sanitizeFilename(title)}.docx`);
    toast.success("Downloaded .docx", { id: t });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "DOCX export failed", {
      id: t,
    });
  }
}
