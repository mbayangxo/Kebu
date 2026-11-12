import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/app-shell";
import { SheetEditor } from "@/app/components/sheets/sheet-editor";

type Params = { params: Promise<{ id: string }> };

export default async function SheetPage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/sheets/${id}`);

  return (
    <AppShell title="Sheet">
      <div className="mx-auto h-[calc(100vh-56px)] max-w-[1450px] px-4 sm:px-6 lg:px-7">
        <SheetEditor id={id} />
      </div>
    </AppShell>
  );
}
