import { NextRequest, NextResponse } from "next/server";

/** Legacy Flutterwave webhook for in-memory store. No longer active. */
export async function POST(_req: NextRequest) {
  return NextResponse.json({ received: true }, { status: 200 });
}
