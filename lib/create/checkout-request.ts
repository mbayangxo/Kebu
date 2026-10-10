const attempts = new Map<string, { snapshot: string; id: string }>();

/** Keep the attempt across a lost response, refresh and offline sync; no buyer details in storage. */
export async function checkoutRequestId(scope: string, payload: unknown): Promise<string> {
  const snapshot = JSON.stringify(payload);
  const memory = attempts.get(scope);
  if (memory?.snapshot === snapshot) return memory.id;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(snapshot));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("");
  const key = `kebu-checkout-attempt:${scope}`;
  let id = crypto.randomUUID();
  try {
    const stored = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (stored?.hash === hash && typeof stored.id === "string" && /^[a-f0-9-]{36}$/i.test(stored.id)) id = stored.id;
    sessionStorage.setItem(key,JSON.stringify({hash,id}));
  } catch { /* Memory still preserves retries when browser storage is unavailable. */ }
  attempts.set(scope,{snapshot,id});
  return id;
}

export function completeCheckoutRequest(scope: string) {
  attempts.delete(scope);
  try { sessionStorage.removeItem(`kebu-checkout-attempt:${scope}`); } catch { /* Storage may be disabled. */ }
}
