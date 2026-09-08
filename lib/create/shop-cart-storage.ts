/** Browser cart for a live site subdomain — not server-saved until draft/checkout. */

export type ShopCartLine = {
  productId: string;
  /** When product has variants — required for checkout. */
  variantId?: string | null;
  variantName?: string;
  productName: string;
  priceLabel: string;
  quantity: number;
};

export function cartLineKey(line: Pick<ShopCartLine, "productId" | "variantId">): string {
  return `${line.productId}:${line.variantId ?? ""}`;
}

function key(subdomain: string) {
  return `kebu_shop_cart_v1_${subdomain}`;
}

export function cartSessionKey(subdomain: string): string {
  const k = `kebu_cart_session_${subdomain}`;
  try {
    let s = localStorage.getItem(k);
    if (!s || s.length < 8) {
      s = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(k, s);
    }
    return s;
  } catch {
    return `s_anon_${Date.now()}`;
  }
}

export function readShopCart(subdomain: string): ShopCartLine[] {
  try {
    const raw = localStorage.getItem(key(subdomain));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ShopCartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeShopCart(subdomain: string, lines: ShopCartLine[]) {
  try {
    localStorage.setItem(key(subdomain), JSON.stringify(lines));
  } catch {
    /* quota */
  }
}

export function addToShopCart(subdomain: string, line: Omit<ShopCartLine, "quantity"> & { quantity?: number }) {
  const qty = Math.min(20, Math.max(1, line.quantity ?? 1));
  const cur = readShopCart(subdomain);
  const key = cartLineKey(line);
  const i = cur.findIndex((l) => cartLineKey(l) === key);
  if (i >= 0) {
    cur[i] = { ...cur[i]!, quantity: Math.min(20, cur[i]!.quantity + qty) };
  } else {
    cur.push({
      productId: line.productId,
      variantId: line.variantId ?? null,
      variantName: line.variantName,
      productName: line.productName,
      priceLabel: line.priceLabel,
      quantity: qty,
    });
  }
  writeShopCart(subdomain, cur);
  return cur;
}

export function clearShopCart(subdomain: string) {
  writeShopCart(subdomain, []);
}

export function cartItemCount(subdomain: string): number {
  return readShopCart(subdomain).reduce((s, l) => s + l.quantity, 0);
}
