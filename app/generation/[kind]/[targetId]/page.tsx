import { notFound } from "next/navigation";
import { z } from "zod";
import { targetSchema } from "@/lib/generation/contracts";
import { GenerationWorkbench } from "@/app/components/generation/generation-workbench";
export default async function GenerationPage({ params }: { params: Promise<{ kind: string; targetId: string }> }) {
  const p = await params, kind = targetSchema.safeParse(p.kind);
  if (!kind.success || !z.string().uuid().safeParse(p.targetId).success) notFound();
  return <GenerationWorkbench kind={kind.data} targetId={p.targetId} />;
}
