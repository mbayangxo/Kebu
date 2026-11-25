import Link from "next/link";
import { RecipeLab } from "./recipe-lab";

export const metadata = { title: "Recipe Lab · KEBU", robots: { index: false, follow: false } };

export default async function RecipeLabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 text-[#16142b]">
    <Link href={`/business/${id}`} className="text-sm underline">Back to company</Link>
    <div><p className="text-sm font-semibold">KEBU · Private company workspace</p>
      <h1 className="mt-1 text-4xl font-semibold tracking-tight">Recipe Lab</h1>
      <p className="mt-2 text-sm">Save formulations and see what each batch and serving costs as ingredient prices change.</p></div>
    <RecipeLab id={id} />
  </main>;
}
