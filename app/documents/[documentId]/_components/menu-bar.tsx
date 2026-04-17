"use client";

import { Editor, useEditorState } from "@tiptap/react";
import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { RenameDialog } from "@/app/_components/rename-dialog";
import { LinkPopover } from "./link-popover";
import {
  downloadPlainText,
  downloadMarkdown,
  downloadDocx,
  downloadPdf,
} from "@/lib/export";
import { getErrorMessage } from "@/lib/errors";
import { pickAndInsertImage } from "@/lib/image-upload";

type Props = {
  editor: Editor;
  documentId: Id<"documents">;
  title: string;
  isOwner: boolean;
  onShareClick: () => void;
};

export function MenuBar({
  editor,
  documentId,
  title,
  isOwner,
  onShareClick,
}: Props) {
  const router = useRouter();
  const createDoc = useMutation(api.documents.create);
  const duplicate = useMutation(api.documents.duplicate);
  const softDelete = useMutation(api.documents.softDelete);
  const [renameOpen, setRenameOpen] = useState(false);
  const [insertLinkOpen, setInsertLinkOpen] = useState(false);

  const { isSelectionEmpty } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isSelectionEmpty: editor.state.selection.empty,
    }),
  });

  const handleNew = async () => {
    const id = await createDoc({});
    window.open(`/documents/${id}`, "_blank");
  };

  const handleCopy = async () => {
    const id = await duplicate({ documentId });
    window.open(`/documents/${id}`, "_blank");
  };

  const handleTrash = async () => {
    try {
      await softDelete({ documentId });
      toast.success("Moved to trash");
      router.push("/");
    } catch (error) {
      toast.error(getErrorMessage(error, "Delete failed"));
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger onMouseDown={(e) => e.preventDefault()} render={<Button variant="ghost" size="sm" />}>
            File
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onSelect={handleNew}>
              New document
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleCopy}>
              Make a copy
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onShareClick} disabled={!isOwner}>
              Share
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Download</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onSelect={() => downloadPdf(editor, title)}
                >
                  PDF (.pdf)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => downloadDocx(editor, title)}
                >
                  Word (.docx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => downloadMarkdown(editor, title)}
                >
                  Markdown (.md)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => downloadPlainText(editor, title)}
                >
                  Plain text (.txt)
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              onSelect={() => setRenameOpen(true)}
              disabled={!isOwner}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={handleTrash}
              disabled={!isOwner}
            >
              Move to trash
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => window.print()}>
              Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger onMouseDown={(e) => e.preventDefault()} render={<Button variant="ghost" size="sm" />}>
            Edit
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().undo().run()}
            >
              Undo
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().redo().run()}
            >
              Redo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isSelectionEmpty}
              onSelect={() => document.execCommand("cut")}
            >
              Cut
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isSelectionEmpty}
              onSelect={() => document.execCommand("copy")}
            >
              Copy
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  editor.chain().focus().insertContent(text).run();
                } catch {
                  toast.info("Use Ctrl+V to paste");
                }
              }}
            >
              Paste
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().selectAll().run()
              }
            >
              Select all
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().deleteSelection().run()
              }
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger onMouseDown={(e) => e.preventDefault()} render={<Button variant="ghost" size="sm" />}>
              Insert
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => pickAndInsertImage(editor)}>
                Image
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run()
                }
              >
                Table
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setInsertLinkOpen(true)}>
                Link
              </DropdownMenuItem>
              <DropdownMenuItem disabled>Chart (coming in v2)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <LinkPopover
            editor={editor}
            open={insertLinkOpen}
            onOpenChange={setInsertLinkOpen}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger onMouseDown={(e) => e.preventDefault()} render={<Button variant="ghost" size="sm" />}>
            Format
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleBold().run()}
            >
              Bold
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleItalic().run()}
            >
              Italic
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleUnderline().run()}
            >
              Underline
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => editor.chain().focus().toggleStrike().run()}
            >
              Strikethrough
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().setTextAlign("left").run()
              }
            >
              Align left
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
            >
              Align center
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().setTextAlign("right").run()
              }
            >
              Align right
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor.chain().focus().setTextAlign("justify").run()
              }
            >
              Justify
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-1">
          {isOwner && (
            <Button variant="outline" size="sm" onClick={onShareClick}>
              <Share2 className="size-4" /> Share
            </Button>
          )}
        </div>
      </div>

      <RenameDialog
        documentId={renameOpen ? documentId : null}
        currentTitle={title}
        onOpenChange={(open) => setRenameOpen(open)}
      />
    </>
  );
}
