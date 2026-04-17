export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-12 bg-muted/30">
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl font-semibold tracking-tight">DocFlow</span>
        <span className="text-sm text-muted-foreground">
          Collaborative documents, made simple.
        </span>
      </div>
      {children}
    </main>
  );
}
