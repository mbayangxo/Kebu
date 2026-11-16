import { EmployerVerificationPanel } from "@/app/components/liguey/employer-verification-panel";
import { AppShell } from "@/app/components/app-shell";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <AppShell title="Employer review">
      <EmployerVerificationPanel businessId={(await params).id} />
    </AppShell>
  );
}
