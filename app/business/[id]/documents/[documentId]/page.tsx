import { AppShell } from "@/app/components/app-shell";
import { LibraryDocumentsPanel } from "@/app/components/library/library-documents-panel";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; documentId: string }>;
}) {
  const { id, documentId } = await params;
  return (
    <AppShell title="Company document">
      <main className="p-6">
        <LibraryDocumentsPanel
          key={id}
          businessId={id}
          documentId={documentId}
        />
      </main>
    </AppShell>
  );
}
