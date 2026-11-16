import { redirect } from "next/navigation";
import { builtinAccess, ligueyEnabled } from "@/lib/live/app-access";
export default async function LigueyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!ligueyEnabled())
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1>Liguey</h1>
        <p>Liguey is not enabled in this environment yet.</p>
      </main>
    );
  const access = await builtinAccess("liguey");
  if (!access.user) redirect("/login?next=/app-store");
  if (access.error)
    return (
      <main className="p-6" role="alert">
        Could not check your added apps. Please retry.
      </main>
    );
  if (!access.installed) redirect("/app-store");
  return children;
}
