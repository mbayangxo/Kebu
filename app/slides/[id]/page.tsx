import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/app/components/app-shell";
import { SlideEditor } from "@/app/components/slides/slide-editor";

type Params = { params: Promise<{ id: string }> };

export default async function DeckPage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/slides/${id}`);

  return (
    <AppShell title="Presentation">
      <div className="mx-auto h-[calc(100vh-56px)] max-w-[1600px] px-4 sm:px-6 lg:px-7">
        <SlideEditor id={id} />
      </div>
    </AppShell>
  );
}
