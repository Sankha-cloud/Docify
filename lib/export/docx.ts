import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { downloadBlob, sanitizeFilename } from "./common";
import type { TiptapNode } from "./types";

type ImageMeta = {
  data: Uint8Array;
  width: number;
  height: number;
  type: "png" | "jpg" | "gif" | "bmp";
};

export function detectImageType(src: string, bytes: Uint8Array): ImageMeta["type"] {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return "gif";
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return "bmp";
  const lower = src.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  if (lower.endsWith(".gif")) return "gif";
  if (lower.endsWith(".bmp")) return "bmp";
  return "png";
}

async function prefetchImages(
  root: TiptapNode,
): Promise<Map<string, ImageMeta>> {
  const srcs = new Set<string>();
  const collect = (n: TiptapNode) => {
    if (n.type === "image") {
      const s = n.attrs?.src as string | undefined;
      if (s) srcs.add(s);
    }
    (n.content ?? []).forEach(collect);
  };
  collect(root);
  if (srcs.size === 0) return new Map();

  // Prefer dimensions from already-rendered <img> elements in the editor.
  const domDims = new Map<string, { w: number; h: number }>();
  document
    .querySelectorAll<HTMLImageElement>("[data-tiptap-root] .ProseMirror img")
    .forEach((img) => {
      const s = img.getAttribute("src");
      if (!s) return;
      const w = img.naturalWidth || img.clientWidth;
      const h = img.naturalHeight || img.clientHeight;
      if (w && h) domDims.set(s, { w, h });
    });

  const out = new Map<string, ImageMeta>();
  await Promise.all(
    Array.from(srcs).map(async (src) => {
      try {
        const res = await fetch(src, { mode: "cors" });
        if (!res.ok) return;
        const buf = new Uint8Array(await res.arrayBuffer());
        const dims = domDims.get(src) ?? { w: 480, h: 360 };
        out.set(src, {
          data: buf,
          width: dims.w,
          height: dims.h,
          type: detectImageType(src, buf),
        });
      } catch (e) {
        console.warn("[docx] failed to fetch image", src, e);
      }
    }),
  );
  return out;
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
      ImageRun,
      HeadingLevel,
      AlignmentType,
      Table,
      TableRow,
      TableCell,
      WidthType,
      BorderStyle,
    } = docx;

    const json = editor.getJSON() as TiptapNode;
    const images = await prefetchImages(json);

    type Block = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;
    const blocks: Block[] = [];

    const alignFor = (node: TiptapNode) => {
      const a = node.attrs?.textAlign as string | undefined;
      if (a === "center") return AlignmentType.CENTER;
      if (a === "right") return AlignmentType.RIGHT;
      if (a === "justify") return AlignmentType.JUSTIFIED;
      return AlignmentType.LEFT;
    };

    // Convert a *sequence* of inline children into runs: handles text,
    // hardBreak, and inline images. Non-inline nodes encountered here are
    // flattened (should not normally happen).
    type InlineRun = InstanceType<typeof TextRun> | InstanceType<typeof ImageRun>;
    const inlineRuns = (children: TiptapNode[]): InlineRun[] => {
      const runs: InlineRun[] = [];
      for (const node of children) {
        if (node.type === "text") {
          const marks = node.marks ?? [];
          const textStyle = marks.find((m) => m.type === "textStyle");
          const color =
            (textStyle?.attrs?.color as string | undefined) ?? undefined;
          const highlight = marks.find((m) => m.type === "highlight");
          const highlightColor =
            (highlight?.attrs?.color as string | undefined) ?? undefined;
          runs.push(
            new TextRun({
              text: node.text ?? "",
              bold: marks.some((m) => m.type === "bold"),
              italics: marks.some((m) => m.type === "italic"),
              underline: marks.some((m) => m.type === "underline")
                ? {}
                : undefined,
              strike: marks.some((m) => m.type === "strike"),
              color: color ? color.replace(/^#/, "") : undefined,
              highlight: highlightColor ? "yellow" : undefined,
            }),
          );
        } else if (node.type === "hardBreak") {
          runs.push(new TextRun({ text: "", break: 1 }));
        } else if (node.type === "image") {
          const src = node.attrs?.src as string | undefined;
          const meta = src ? images.get(src) : undefined;
          if (meta) {
            const maxW = 480;
            const scale = meta.width > maxW ? maxW / meta.width : 1;
            runs.push(
              new ImageRun({
                data: meta.data,
                transformation: {
                  width: Math.round(meta.width * scale),
                  height: Math.round(meta.height * scale),
                },
                type: meta.type,
              }),
            );
          } else if (src) {
            runs.push(new TextRun({ text: `[image: ${src}]`, italics: true }));
          }
        } else if (node.content) {
          runs.push(...inlineRuns(node.content));
        }
      }
      return runs;
    };

    const paragraphForBlock = (
      node: TiptapNode,
      // docx's ParagraphOptions is a large union — use a loose type for
      // the extra bag and let docx validate at runtime.
      extra: Record<string, unknown> = {},
    ) =>
      new Paragraph({
        children: inlineRuns(node.content ?? []),
        alignment: alignFor(node),
        ...(extra as object),
      } as ConstructorParameters<typeof Paragraph>[0]);

    const walkList = (
      node: TiptapNode,
      level: number,
      numberingRef?: string,
    ) => {
      const ordered = node.type === "orderedList";
      const ref = ordered ? numberingRef ?? "default-numbering" : undefined;
      for (const li of node.content ?? []) {
        if (li.type !== "listItem") continue;
        const children = li.content ?? [];
        children.forEach((child, idx) => {
          if (child.type === "bulletList" || child.type === "orderedList") {
            walkList(child, level + 1, ref);
            return;
          }
          const isFirst = idx === 0;
          const runs =
            child.type === "paragraph" || child.type === "heading"
              ? inlineRuns(child.content ?? [])
              : inlineRuns([child]);
          blocks.push(
            new Paragraph({
              children: runs,
              alignment:
                child.type === "paragraph" || child.type === "heading"
                  ? alignFor(child)
                  : undefined,
              bullet: !ordered && isFirst ? { level } : undefined,
              numbering:
                ordered && isFirst && ref
                  ? { reference: ref, level }
                  : undefined,
              indent: !isFirst ? { left: 720 * (level + 1) } : undefined,
            }),
          );
        });
      }
    };

    const walkTable = (node: TiptapNode) => {
      const rows: InstanceType<typeof TableRow>[] = [];
      for (const row of node.content ?? []) {
        if (row.type !== "tableRow") continue;
        const cells: InstanceType<typeof TableCell>[] = [];
        for (const cell of row.content ?? []) {
          if (cell.type !== "tableCell" && cell.type !== "tableHeader")
            continue;
          const cellBlocks: InstanceType<typeof Paragraph>[] = [];
          for (const child of cell.content ?? []) {
            if (child.type === "paragraph") {
              cellBlocks.push(paragraphForBlock(child));
            } else {
              cellBlocks.push(new Paragraph({ children: inlineRuns([child]) }));
            }
          }
          if (cellBlocks.length === 0) cellBlocks.push(new Paragraph({}));
          cells.push(
            new TableCell({
              children: cellBlocks,
              width: {
                size: 100 / (row.content?.length || 1),
                type: WidthType.PERCENTAGE,
              },
            }),
          );
        }
        if (cells.length > 0) rows.push(new TableRow({ children: cells }));
      }
      if (rows.length === 0) return;
      const borders = {
        top: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
        left: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
        right: { style: BorderStyle.SINGLE, size: 4, color: "999999" },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 4,
          color: "cccccc",
        },
        insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "cccccc" },
      };
      blocks.push(
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders,
        }),
      );
      blocks.push(new Paragraph({ text: "" }));
    };

    const walk = (node: TiptapNode) => {
      switch (node.type) {
        case "doc":
          (node.content ?? []).forEach(walk);
          break;
        case "paragraph":
          blocks.push(paragraphForBlock(node));
          break;
        case "heading": {
          const level = (node.attrs?.level as number) ?? 1;
          const heading =
            level === 1
              ? HeadingLevel.HEADING_1
              : level === 2
                ? HeadingLevel.HEADING_2
                : level === 3
                  ? HeadingLevel.HEADING_3
                  : level === 4
                    ? HeadingLevel.HEADING_4
                    : level === 5
                      ? HeadingLevel.HEADING_5
                      : HeadingLevel.HEADING_6;
          blocks.push(paragraphForBlock(node, { heading }));
          break;
        }
        case "bulletList":
        case "orderedList":
          walkList(node, 0);
          break;
        case "blockquote":
          (node.content ?? []).forEach((child) => {
            if (child.type === "paragraph") {
              blocks.push(
                paragraphForBlock(child, {
                  indent: { left: 720 },
                  border: {
                    left: {
                      style: BorderStyle.SINGLE,
                      size: 12,
                      color: "cccccc",
                      space: 8,
                    },
                  },
                }),
              );
            } else {
              walk(child);
            }
          });
          break;
        case "codeBlock":
          blocks.push(
            new Paragraph({
              children: inlineRuns(node.content ?? []),
              style: "Code",
            }),
          );
          break;
        case "horizontalRule":
          blocks.push(
            new Paragraph({
              border: {
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 6,
                  color: "999999",
                  space: 1,
                },
              },
            }),
          );
          break;
        case "image":
          blocks.push(new Paragraph({ children: inlineRuns([node]) }));
          break;
        case "table":
          walkTable(node);
          break;
        default:
          if (node.content && node.content.length > 0) {
            blocks.push(new Paragraph({ children: inlineRuns(node.content) }));
          }
      }
    };

    walk(json);
    if (blocks.length === 0) blocks.push(new Paragraph({}));

    const doc = new Document({
      numbering: {
        config: [
          {
            reference: "default-numbering",
            levels: [
              {
                level: 0,
                format: "decimal",
                text: "%1.",
                alignment: AlignmentType.LEFT,
              },
              {
                level: 1,
                format: "lowerLetter",
                text: "%2.",
                alignment: AlignmentType.LEFT,
              },
              {
                level: 2,
                format: "lowerRoman",
                text: "%3.",
                alignment: AlignmentType.LEFT,
              },
              {
                level: 3,
                format: "decimal",
                text: "%4.",
                alignment: AlignmentType.LEFT,
              },
            ],
          },
        ],
      },
      sections: [{ properties: {}, children: blocks }],
    });
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, `${sanitizeFilename(title)}.docx`);
    toast.success("Downloaded .docx", { id: t });
  } catch (error) {
    console.error("[docx] export failed:", error);
    toast.error(getErrorMessage(error, "DOCX export failed"), { id: t });
  }
}
