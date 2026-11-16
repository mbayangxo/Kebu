import { AppShell } from "@/app/components/app-shell";
import { InterviewsPanel } from "@/app/components/liguey/interviews-panel";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string; application?: string }>;
}) {
  const p = await searchParams;
  return (
    <AppShell title="Liguey interviews">
      <InterviewsPanel
        businessId={p.businessId}
        applicationId={p.application}
      />
    </AppShell>
  );
}
