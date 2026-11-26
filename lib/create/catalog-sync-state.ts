import { z } from "zod";

export const catalogSyncStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("synced") }),
  z.object({ status: z.literal("pending"), message: z.string() }),
]);
export type CatalogSyncState = z.infer<typeof catalogSyncStateSchema>;

export const CATALOG_SYNC_PENDING: CatalogSyncState = {
  status: "pending",
  message: "Your catalog is saved. The website draft still needs syncing. Retry sync before publishing.",
};
