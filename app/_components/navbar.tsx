"use client";

import { UserButton } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { FileText, Search } from "lucide-react";
import Link from "next/link";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
};

export function Navbar({ search, onSearchChange }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <FileText className="size-5" aria-hidden />
          <span>DocFlow</span>
        </Link>
        <div className="relative flex-1 max-w-xl mx-auto">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search documents"
            className="pl-9"
            aria-label="Search documents"
          />
        </div>
        <UserButton />
      </div>
    </header>
  );
}
