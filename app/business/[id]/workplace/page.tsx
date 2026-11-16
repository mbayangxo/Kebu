import { AppShell } from "@/app/components/app-shell";
import { CompanyWorkplace } from "@/app/components/company/workplace";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <AppShell title="Company workplace">
      <CompanyWorkplace businessId={(await params).id} />
    </AppShell>
  );
}
