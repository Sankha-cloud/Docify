import type { Editor } from "@tiptap/react";
import { toast } from "sonner";
import { downloadBlob, sanitizeFilename } from "./common";

export function downloadPlainText(editor: Editor, title: string) {
  const text = editor.getText();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `${sanitizeFilename(title)}.txt`);
  toast.success("Downloaded .txt");
}
