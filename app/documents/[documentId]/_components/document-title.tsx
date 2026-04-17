"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

type Props = {
  documentId: Id<"documents">;
  title: string;
  editable: boolean;
};

export function DocumentTitle({ documentId, title, editable }: Props) {
  const updateTitle = useMutation(api.documents.updateTitle);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(title);
  }, [title]);

  useEffect(() => {
    document.title = title ? `${title} · DocFlow` : "DocFlow";
  }, [title]);

  const save = async () => {
    const trimmed = value.trim();
    const next = trimmed.length === 0 ? "Untitled document" : trimmed;
    if (next === title) {
      setValue(next);
      return;
    }
    try {
      await updateTitle({ documentId, title: next });
      setValue(next);
    } catch (error) {
      toast.error(getErrorMessage(error, "Rename failed"));
      setValue(title);
    }
  };

  if (!editable) {
    return <span className="truncate text-sm font-medium">{title}</span>;
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          inputRef.current?.blur();
        } else if (e.key === "Escape") {
          setValue(title);
          inputRef.current?.blur();
        }
      }}
      className="w-64 truncate rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-medium hover:border-border focus:border-ring focus:outline-none"
      aria-label="Document title"
    />
  );
}
