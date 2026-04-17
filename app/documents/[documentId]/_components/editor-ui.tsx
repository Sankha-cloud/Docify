"use client";

import "@liveblocks/react-tiptap/styles.css";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import LinkExtension from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { UserButton } from "@clerk/nextjs";
import NextLink from "next/link";
import { FileText } from "lucide-react";
import { DocumentTitle } from "./document-title";
import { MenuBar } from "./menu-bar";
import { Toolbar } from "./toolbar";
import { SaveStatusBadge, SaveStatus } from "./save-status";
import { AvatarStack } from "./avatar-stack";
import { DesktopWarning } from "./desktop-warning";
import { ShareDialog } from "@/app/_components/share-dialog";
import { PageIndicator } from "./page-indicator";

type Props = {
  documentId: Id<"documents">;
  doc: Doc<"documents">;
  isOwner: boolean;
  isEditable: boolean;
};

const SAVE_DEBOUNCE_MS = 500;

function parseInitialContent(content: string | undefined) {
  if (!content) return "";
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

export function EditorUI({ documentId, doc, isOwner, isEditable }: Props) {
  const updateContent = useMutation(api.documents.updateContent);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [zoom, setZoom] = useState(1);
  const [shareOpen, setShareOpen] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialContentRef = useRef(parseInitialContent(doc.content));

  const liveblocks = useLiveblocksExtension({
    initialContent: initialContentRef.current,
  });

  const editor = useEditor({
    immediatelyRender: false,
    editable: isEditable,
    extensions: [
      liveblocks,
      StarterKit.configure({
        undoRedo: false,
        link: false,
        underline: false,
      }),
      Underline,
      LinkExtension.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyleKit,
      Highlight.configure({ multicolor: true }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    editorProps: {
      attributes: {
        class: "docflow-page prose prose-neutral focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      if (!isEditable) return;
      setStatus("dirty");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setStatus("saving");
        try {
          await updateContent({
            documentId,
            content: JSON.stringify(editor.getJSON()),
          });
          setStatus("saved");
        } catch {
          setStatus("error");
        }
      }, SAVE_DEBOUNCE_MS);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (!editor) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading editor...</span>
      </main>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background">
        <DesktopWarning />
        <div className="flex h-14 items-center gap-3 px-4">
          <NextLink href="/" className="flex items-center gap-2 font-semibold">
            <FileText className="size-5" aria-hidden />
          </NextLink>
          <DocumentTitle
            documentId={documentId}
            title={doc.title}
            editable={isEditable}
          />
          <SaveStatusBadge status={isEditable ? status : "idle"} />
          <div className="ml-auto flex items-center gap-3">
            <AvatarStack />
            <UserButton />
          </div>
        </div>
        <div className="px-4 pb-1">
          <MenuBar
            editor={editor}
            documentId={documentId}
            title={doc.title}
            isOwner={isOwner}
            onShareClick={() => setShareOpen(true)}
          />
        </div>
        {isEditable && (
          <Toolbar editor={editor} zoom={zoom} onZoomChange={setZoom} />
        )}
      </header>

      <main
        className="flex-1 overflow-y-auto bg-[#eef1f5] py-8"
        data-tiptap-root
      >
        <div
          className="origin-top"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
        >
          <EditorContent editor={editor} />
        </div>
      </main>

      <PageIndicator />

      <ShareDialog
        documentId={shareOpen ? documentId : null}
        onOpenChange={(open) => setShareOpen(open)}
      />
    </div>
  );
}
