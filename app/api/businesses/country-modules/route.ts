import { NextResponse } from "next/server";
import { requireUser } from "@/lib/create/auth";
import { getCountryModule, listSupportedCountryModules } from "@/lib/kebu-id/countries";

export const dynamic = "force-dynamic";

/** Country registration modules (structures + regions). Auth required. */
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const country = url.searchParams.get("country")?.toUpperCase();

  if (country) {
    const mod = getCountryModule(country);
    if (!mod) {
      return NextResponse.json(
        { error: "Country module not available yet.", supported: listSupportedCountryModules().map((m) => m.countryCode) },
        { status: 404 }
      );
    }
    return NextResponse.json({ module: mod });
  }

  return NextResponse.json({
    modules: listSupportedCountryModules().map((m) => ({
      countryCode: m.countryCode,
      countryName: m.countryName,
      moduleVersion: m.moduleVersion,
      legalStructures: m.legalStructures,
      regions: m.regions,
    })),
  });
}
