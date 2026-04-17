"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2, Download, Share2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  documentId: Id<"documents">;
  isOwner: boolean;
  onRename: () => void;
  onShare: () => void;
};

export function DocumentMenu({ documentId, isOwner, onRename, onShare }: Props) {
  const softDelete = useMutation(api.documents.softDelete);

  const handleTrash = async () => {
    try {
      await softDelete({ documentId });
      toast.success("Moved to trash");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={(e) => e.stopPropagation()}
            aria-label="Document actions"
          />
        }
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem onSelect={onRename} disabled={!isOwner}>
          <Pencil className="size-4" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onShare} disabled={!isOwner}>
          <Share2 className="size-4" /> Share
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => toast.info("Open the document to download")}
        >
          <Download className="size-4" /> Download
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={!isOwner}
          onSelect={handleTrash}
        >
          <Trash2 className="size-4" /> Move to trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
