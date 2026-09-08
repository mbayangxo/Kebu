import Link from "next/link";

/** Cancel URL after JOKO product checkout — order remains unpaid. */
export default async function OrderCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Payment cancelled</h1>
      <p className="mt-3 text-sm leading-relaxed opacity-80">
        Your order was saved but is not paid. You can go back to the shop and try again, or message the
        merchant on WhatsApp.
      </p>
      {order ? (
        <p className="mt-4 font-mono text-xs opacity-60">Order {order}</p>
      ) : null}
      <Link href="/" className="mt-8 text-sm font-semibold underline">
        Back to Kebu
      </Link>
    </main>
  );
}
