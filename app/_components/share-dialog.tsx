"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ChevronDown, Copy, X } from "lucide-react";
import { getErrorMessage } from "@/lib/errors";

type Props = {
  documentId: Id<"documents"> | null;
  onOpenChange: (open: boolean) => void;
};

type Role = "editor" | "viewer";

export function ShareDialog({ documentId, onOpenChange }: Props) {
  const open = documentId !== null;
  const collaborators = useQuery(
    api.access.listByDocument,
    documentId ? { documentId } : "skip",
  );
  const invite = useMutation(api.access.invite);
  const updateRole = useMutation(api.access.updateRole);
  const remove = useMutation(api.access.remove);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    if (!documentId) return;
    const trimmed = email.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await invite({ documentId, email: trimmed, role });
      toast.success(`Invited ${trimmed}`);
      setEmail("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Invite failed"));
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    if (!documentId) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/documents/${documentId}`,
      );
      toast.success("Link copied!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            Invite people to view or edit this document.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleInvite();
              }
            }}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" className="shrink-0" />}
            >
              {role === "editor" ? "Editor" : "Viewer"}
              <ChevronDown className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setRole("editor")}>
                Editor
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRole("viewer")}>
                Viewer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={handleInvite}
            disabled={sending || email.trim().length === 0}
          >
            Invite
          </Button>
        </div>

        <div className="max-h-64 space-y-1 overflow-auto">
          {collaborators === undefined ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : collaborators.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No collaborators yet.
            </div>
          ) : (
            collaborators.map((c) => (
              <div
                key={c._id}
                className="flex items-center gap-3 rounded-md p-2 hover:bg-accent/50"
              >
                <Avatar className="size-8">
                  <AvatarFallback>
                    {c.email[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 truncate text-sm">{c.email}</div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
                    {c.role === "editor" ? "Editor" : "Viewer"}
                    <ChevronDown className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() =>
                        void updateRole({ accessId: c._id, role: "editor" })
                      }
                    >
                      Editor
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        void updateRole({ accessId: c._id, role: "viewer" })
                      }
                    >
                      Viewer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => void remove({ accessId: c._id })}
                  aria-label="Remove collaborator"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={handleCopyLink}>
            <Copy className="size-4" /> Copy link
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
