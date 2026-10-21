import { NextResponse } from "next/server";
import { kebuCheckoutMethodsAvailable } from "@/lib/payments/kebu-checkout";

export const dynamic = "force-dynamic";

/** Which Kebu Checkout methods are live right now — no secrets, just booleans. Used by any buy button. */
export async function GET() {
  return NextResponse.json({ methods: kebuCheckoutMethodsAvailable() });
}
