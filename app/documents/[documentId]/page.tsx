import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { EditorShell } from "./_components/editor-shell";
import { Id } from "@/convex/_generated/dataModel";

async function DocumentGate({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const { documentId } = await params;
  return <EditorShell documentId={documentId as Id<"documents">} />;
}

export default function DocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </main>
      }
    >
      <DocumentGate params={params} />
    </Suspense>
  );
}
