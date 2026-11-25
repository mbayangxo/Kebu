export type StoreStock = {
  storeId: string;
  sku: string;
  onHand: number;
  reserved: number;
  /** Confirmed inbound plus quantities covered by outstanding drafts. */
  incoming: number;
  minimum: number;
  target: number;
  priority: number;
};
export type WarehouseStock = {
  sku: string;
  onHand: number;
  /** Includes outstanding transfer commitments. */
  reserved: number;
  safetyStock: number;
};

function units(...values: number[]) {
  if (values.some(value => !Number.isSafeInteger(value) || value < 0)) throw new Error("Stock counts must be nonnegative integers.");
}

/** Produces suggestions only; this function does not reserve stock, notify anyone, or place an order. */
export function planReplenishment(stores: StoreStock[], warehouse: WarehouseStock[]) {
  const free = new Map<string, number>();
  for (const row of warehouse) {
    units(row.onHand, row.reserved, row.safetyStock);
    if (!row.sku || free.has(row.sku)) throw new Error("Expected one warehouse balance per SKU.");
    free.set(row.sku, Math.max(0, row.onHand - row.reserved - row.safetyStock));
  }

  const seen = new Set<string>();
  return [...stores].sort((a, b) => a.priority - b.priority || a.storeId.localeCompare(b.storeId) || a.sku.localeCompare(b.sku))
    .flatMap(row => {
      units(row.onHand, row.reserved, row.incoming, row.minimum, row.target, row.priority);
      const key = JSON.stringify([row.storeId, row.sku]);
      if (!row.storeId || !row.sku || seen.has(key) || row.target < row.minimum) throw new Error("Invalid or duplicate store stock policy.");
      seen.add(key);
      // An oversold store must also cover its commitments before rebuilding free stock.
      const projected = row.onHand - row.reserved + row.incoming;
      if (projected >= row.minimum) return [];
      const needed = row.target - projected;
      units(needed);
      const warehouseAvailable = free.get(row.sku);
      if (warehouseAvailable === undefined) {
        return [{ storeId: row.storeId, sku: row.sku, needed, transferDraft: 0, supplierDraft: 0, warehouseCheckRequired: true }];
      }
      const transferDraft = Math.min(warehouseAvailable, needed);
      free.set(row.sku, warehouseAvailable - transferDraft);
      return [{ storeId: row.storeId, sku: row.sku, needed, transferDraft, supplierDraft: needed - transferDraft, warehouseCheckRequired: false }];
    });
}
