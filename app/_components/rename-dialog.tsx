"use client";

import { useMutation } from "convex/react";
import { useState, useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

type Props = {
  documentId: Id<"documents"> | null;
  currentTitle: string;
  onOpenChange: (open: boolean) => void;
};

export function RenameDialog({ documentId, currentTitle, onOpenChange }: Props) {
  const updateTitle = useMutation(api.documents.updateTitle);
  const [value, setValue] = useState(currentTitle);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(currentTitle);
  }, [currentTitle, documentId]);

  const open = documentId !== null;

  const handleSave = async () => {
    if (!documentId) return;
    setSaving(true);
    try {
      await updateTitle({ documentId, title: value });
      toast.success("Renamed");
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to rename"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename document</DialogTitle>
          <DialogDescription>
            Choose a new name for this document.
          </DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSave();
            }
          }}
          placeholder="Untitled document"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
