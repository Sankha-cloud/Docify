"use client";

import { useState } from "react";
import { Navbar } from "./navbar";
import { TemplateGallery } from "./template-gallery";
import { DocumentList } from "./document-list";

export function HomeContent() {
  const [search, setSearch] = useState("");
  return (
    <>
      <Navbar search={search} onSearchChange={setSearch} />
      <main className="flex-1 mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
        <TemplateGallery />
        <DocumentList search={search} />
      </main>
    </>
  );
}
