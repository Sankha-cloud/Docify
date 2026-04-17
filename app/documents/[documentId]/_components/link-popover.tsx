"use client";

import { Editor } from "@tiptap/react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link2, Search, Type, ArrowRight } from "lucide-react";

interface LinkPopoverProps {
  editor: Editor;
  /** Active state for the trigger button highlight */
  isActive?: boolean;
  /** Preserve editor focus when trigger is mouse-pressed (toolbar use) */
  onMouseDown?: React.MouseEventHandler;
  /** Controlled open — omit to let the component manage its own open state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Trigger button content. Omit to render a hidden anchor (menu-bar use). */
  children?: React.ReactNode;
}

export function LinkPopover({
  editor,
  isActive,
  onMouseDown,
  open: controlledOpen,
  onOpenChange,
  children,
}: LinkPopoverProps) {
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen! : internalOpen;

  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [existingHref, setExistingHref] = useState("");
  const savedSelection = useRef<{ from: number; to: number } | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      const { from, to } = editor.state.selection;
      savedSelection.current = { from, to };
      const current = editor.getAttributes("link").href as string | undefined;
      setLinkUrl(current ?? "");
      setExistingHref(current ?? "");
      setLinkText(editor.state.doc.textBetween(from, to));
    }
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const close = () => {
    if (!isControlled) setInternalOpen(false);
    onOpenChange?.(false);
    setLinkUrl("");
    setLinkText("");
    setExistingHref("");
  };

  const applyLink = () => {
    const raw = linkUrl.trim();
    if (!raw) return;
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const displayText = linkText.trim();
    const sel = savedSelection.current;

    if (displayText && sel) {
      // setTextSelection re-selects the original range, then insertContent
      // replaces it — avoids the "inserted content deeper than insertion
      // position" ProseMirror error that deleteRange + insertContentAt causes
      // when the post-delete position lands on a block boundary.
      editor
        .chain()
        .focus()
        .setTextSelection(sel)
        .insertContent({
          type: "text",
          text: displayText,
          marks: [{ type: "link", attrs: { href } }],
        })
        .run();
    } else {
      const chain = editor.chain().focus();
      if (sel) chain.setTextSelection(sel);
      chain.extendMarkRange("link").setLink({ href }).run();
    }
    close();
  };

  const removeLink = () => {
    const chain = editor.chain().focus();
    if (savedSelection.current) chain.setTextSelection(savedSelection.current);
    chain.extendMarkRange("link").unsetLink().run();
    close();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        onMouseDown={onMouseDown}
        render={
          <Button
            variant={isActive ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="Insert link"
            className={!children ? "sr-only" : undefined}
          />
        }
      >
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 gap-0 p-0">
        {/* Display text */}
        <div className="flex items-center gap-2.5 border-b px-3 py-2.5">
          <Type className="size-4 shrink-0 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Display text"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
          />
        </div>
        {/* URL input */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Paste or search link"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
          />
          <Button size="sm" onClick={applyLink}>
            Apply
          </Button>
        </div>
        {/* Existing URL preview */}
        {existingHref && (
          <div className="flex items-center gap-2.5 border-b px-3 py-2">
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <a
              href={existingHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate text-sm text-primary hover:underline"
            >
              {existingHref}
            </a>
            <button
              type="button"
              onClick={removeLink}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          </div>
        )}
        {/* Footer */}
        <div className="flex cursor-default items-center justify-between px-3 py-2 text-sm text-muted-foreground">
          <span>Headings, bookmarks and tabs</span>
          <ArrowRight className="size-4" />
        </div>
      </PopoverContent>
    </Popover>
  );
}
