import { notFound } from "next/navigation";
import { AppearanceFixture } from "./appearance-fixture";

export const dynamic = "force-dynamic";

export default async function AppearanceQaPage({ searchParams }: { searchParams: Promise<{ frame?: string }> }) {
  // Never expose the fixture on a production deployment, or read customer data.
  if (process.env.NODE_ENV !== "development" && process.env.VERCEL_ENV !== "preview") notFound();
  const { frame } = await searchParams;
  return <AppearanceFixture phoneFrame={frame === "phone"} />;
}
