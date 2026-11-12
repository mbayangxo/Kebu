const catalog = { spark: 100, bouquet: 300 } as const;

export async function sandboxGift(input: {
  sender: string; recipient: string; requestId: string; roomId: string; gift: unknown; verifyOnly: boolean;
}) {
  const base = process.env.JOKKO_GIFT_SANDBOX_URL;
  const key = process.env.JOKKO_GIFT_SANDBOX_KEY;
  if (process.env.VERCEL || !base || !/^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(base) || !key || key.length < 32) {
    return { status: "disabled" };
  }
  if (typeof input.gift !== "string" || !Object.hasOwn(catalog, input.gift)) return { status: "invalid" };
  const expected = catalog[input.gift as keyof typeof catalog];
  try {
    const result = await fetch(`${base}/v1/live-gifts`, {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(5000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await result.json();
    if (result.ok && data.status === "completed" && data.mode === "sandbox" && data.currency === "CAURIS"
      && data.amount === expected && data.roomId === input.roomId && data.requestId === input.requestId
      && data.gift === input.gift && typeof data.receiptId === "string") {
      return { status: "completed", receiptId: data.receiptId as string, amount: expected };
    }
    if (result.status === 422 && ["insufficient", "wallet_not_linked", "limit", "conflict", "invalid", "closed"].includes(data.status)) {
      return { status: data.status as string };
    }
  } catch { /* A transport failure cannot establish whether the transfer committed. */ }
  return { status: "pending" };
}
