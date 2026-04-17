import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { downloadBlob, sanitizeFilename } from "./common";
import type { TiptapNode } from "./types";

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
