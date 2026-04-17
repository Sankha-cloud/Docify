"use client";

import { Editor, useEditorState } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  ChevronDown,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Plus,
} from "lucide-react";
import { useState, ComponentProps } from "react";
import { LinkPopover } from "./link-popover";
import { pickAndInsertImage } from "@/lib/image-upload";

type Props = {
  editor: Editor;
  zoom: number;
  onZoomChange: (z: number) => void;
};

const FONT_FAMILIES = [
  { label: "Sans", value: "" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Monospace", value: "ui-monospace, monospace" },
];

const HEADINGS: { label: string; level: 0 | 1 | 2 | 3 }[] = [
  { label: "Normal text", level: 0 },
  { label: "Heading 1", level: 1 },
  { label: "Heading 2", level: 2 },
  { label: "Heading 3", level: 3 },
];

// Prevents the editor from losing selection when the toolbar button is pressed.
const preserveFocus = (e: React.MouseEvent | React.PointerEvent) => {
  e.preventDefault();
};

type TBProps = ComponentProps<typeof Button> & {
  active?: boolean;
};

function ToolbarBtn({ active, onMouseDown, ...props }: TBProps) {
  return (
    <Button
      {...props}
      variant={active ? "secondary" : props.variant ?? "ghost"}
      size={props.size ?? "icon-sm"}
      onMouseDown={(e) => {
        preserveFocus(e);
        onMouseDown?.(e);
      }}
    />
  );
}

export function Toolbar({ editor, zoom, onZoomChange }: Props) {
  // Subscribe to the editor's state so the toolbar re-renders on every
  // transaction (typing, selection change, stored-mark changes, etc.).
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      const textStyleType = editor.schema.marks.textStyle;
      const storedSize = textStyleType
        ? (editor.state.storedMarks?.find((m) => m.type === textStyleType)
            ?.attrs.fontSize as string | undefined)
        : undefined;
      const selectionSize = editor.getAttributes("textStyle").fontSize as
        | string
        | undefined;
      return {
        fontSize: storedSize ?? selectionSize,
        isBold: editor.isActive("bold"),
        isItalic: editor.isActive("italic"),
        isUnderline: editor.isActive("underline"),
        isStrike: editor.isActive("strike"),
        isLink: editor.isActive("link"),
        isBulletList: editor.isActive("bulletList"),
        isOrderedList: editor.isActive("orderedList"),
        isBlockquote: editor.isActive("blockquote"),
        isCodeBlock: editor.isActive("codeBlock"),
        alignLeft: editor.isActive({ textAlign: "left" }),
        alignCenter: editor.isActive({ textAlign: "center" }),
        alignRight: editor.isActive({ textAlign: "right" }),
        alignJustify: editor.isActive({ textAlign: "justify" }),
        headingLevel:
          [1, 2, 3].find((level) =>
            editor.isActive("heading", { level }),
          ) ?? 0,
      };
    },
  });

  const currentSize = state?.fontSize
    ? parseInt(state.fontSize.replace("px", ""), 10) || 14
    : 14;

  const setSize = (next: number) => {
    const clamped = Math.max(8, Math.min(72, next));
    // No .focus() — focusing can collapse/replace the selection and clear
    // storedMarks before setMark adds them. setMark already routes via the
    // editor's dispatch, so the command still applies.
    editor.chain().setFontSize(`${clamped}px`).run();
  };

  const addImage = () => pickAndInsertImage(editor);

  const activeHeading =
    HEADINGS.find((h) => h.level === (state?.headingLevel ?? 0)) ??
    HEADINGS[0];

  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-background/95 px-2 py-1.5 sticky top-14 z-20">
      <ToolbarBtn
        aria-label="Undo"
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo className="size-4" />
      </ToolbarBtn>
      <ToolbarBtn
        aria-label="Redo"
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo className="size-4" />
      </ToolbarBtn>
      <Separator orientation="vertical" className="mx-1 h-5" />

      <DropdownMenu>
        <DropdownMenuTrigger
          onMouseDown={preserveFocus}
          render={<Button variant="ghost" size="sm" />}
        >
          {activeHeading.label}
          <ChevronDown className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {HEADINGS.map((h) => (
            <DropdownMenuItem
              key={h.level}
              onSelect={() =>
                h.level === 0
                  ? editor.chain().focus().setParagraph().run()
                  : editor.chain().focus().toggleHeading({ level: h.level }).run()
              }
            >
              {h.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          onMouseDown={preserveFocus}
          render={<Button variant="ghost" size="sm" />}
        >
          Font
          <ChevronDown className="size-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {FONT_FAMILIES.map((f) => (
            <DropdownMenuItem
              key={f.label}
              onSelect={() =>
                f.value
                  ? editor.chain().focus().setFontFamily(f.value).run()
                  : editor.chain().focus().unsetFontFamily().run()
              }
            >
              <span style={{ fontFamily: f.value || undefined }}>
                {f.label}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center rounded-md border">
        <ToolbarBtn
          size="icon-xs"
          aria-label="Decrease font size"
          onClick={() => setSize(currentSize - 1)}
        >
          <Minus className="size-3" />
        </ToolbarBtn>
        <span className="w-7 text-center text-xs tabular-nums">
          {currentSize}
        </span>
        <ToolbarBtn
          size="icon-xs"
          aria-label="Increase font size"
          onClick={() => setSize(currentSize + 1)}
        >
          <Plus className="size-3" />
        </ToolbarBtn>
      </div>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarBtn
        active={state?.isBold}
        aria-label="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={state?.isItalic}
        aria-label="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={state?.isUnderline}
        aria-label="Underline"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={state?.isStrike}
        aria-label="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-4" />
      </ToolbarBtn>

      <LinkPopover
        editor={editor}
        isActive={state?.isLink}
        onMouseDown={preserveFocus}
      >
        <LinkIcon className="size-4" />
      </LinkPopover>

      <ToolbarBtn aria-label="Insert image" onClick={addImage}>
        <ImageIcon className="size-4" />
      </ToolbarBtn>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarBtn
        active={state?.alignLeft}
        aria-label="Align left"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="size-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={state?.alignCenter}
        aria-label="Align center"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="size-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={state?.alignRight}
        aria-label="Align right"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="size-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={state?.alignJustify}
        aria-label="Justify"
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="size-4" />
      </ToolbarBtn>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarBtn
        active={state?.isBulletList}
        aria-label="Bullet list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={state?.isOrderedList}
        aria-label="Numbered list"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={state?.isBlockquote}
        aria-label="Blockquote"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-4" />
      </ToolbarBtn>
      <ToolbarBtn
        active={state?.isCodeBlock}
        aria-label="Code block"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code className="size-4" />
      </ToolbarBtn>

      <div className="ml-auto flex items-center gap-1">
        <ToolbarBtn
          size="icon-xs"
          aria-label="Zoom out"
          onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))}
        >
          <Minus className="size-3" />
        </ToolbarBtn>
        <span className="w-10 text-center text-xs tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
        <ToolbarBtn
          size="icon-xs"
          aria-label="Zoom in"
          onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
        >
          <Plus className="size-3" />
        </ToolbarBtn>
      </div>
    </div>
  );
}
