/** Only a random receipt capability is persisted. Never store checkout form data. */
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const checkoutRecoveryKey = (subdomain: string) => `kebu:checkout-pending:${subdomain}`;

export function readPendingCheckout(storage: Storage, subdomain: string): string | null {
  let value: string | null;
  try { value = storage.getItem(checkoutRecoveryKey(subdomain)); }
  catch { throw new Error("Browser storage is unavailable. Contact the store before ordering again."); }
  if (value === null) return null;
  // Invalid storage must not silently allow an uncertain checkout to be replaced.
  if (!uuid.test(value)) throw new Error("Checkout recovery data is unreadable. Contact the store before ordering again.");
  return value;
}

export function rememberCheckout(storage: Storage, subdomain: string, attemptId: string): void {
  if (!uuid.test(attemptId)) throw new Error("Could not create a checkout recovery ID. No order was sent.");
  const pending = readPendingCheckout(storage, subdomain);
  if (pending && pending !== attemptId) throw new Error("Check your previous checkout before ordering again.");
  try { storage.setItem(checkoutRecoveryKey(subdomain), attemptId); }
  catch { throw new Error("Could not save checkout recovery. Enable browser storage and try again. No order was sent."); }
  if (readPendingCheckout(storage, subdomain) !== attemptId) throw new Error("Could not save checkout recovery. No order was sent.");
}

export function forgetCheckout(storage: Storage, subdomain: string, attemptId: string): void {
  if (readPendingCheckout(storage, subdomain) === attemptId) storage.removeItem(checkoutRecoveryKey(subdomain));
}
