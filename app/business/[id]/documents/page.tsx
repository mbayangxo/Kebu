import { AppShell } from "@/app/components/app-shell";
import { LibraryDocumentsPanel } from "@/app/components/library/library-documents-panel";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell title="Company documents">
      <main className="p-6">
        <LibraryDocumentsPanel key={id} businessId={id} />
      </main>
    </AppShell>
  );
}
