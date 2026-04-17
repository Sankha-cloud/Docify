import type { Editor } from "@tiptap/react";

const IMAGE_MIME_TYPES = "image/jpeg,image/png,image/gif,image/webp";

export function pickAndInsertImage(editor: Editor) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = IMAGE_MIME_TYPES;
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
  };
  input.click();
}
