import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CollectionInput } from "./product-collections";

export async function saveShopCollection(
  db: SupabaseClient,
  projectId: string,
  collectionId: string | null,
  fields: Partial<Omit<CollectionInput, "productIds">>,
  productIds?: string[],
) {
  const { data, error } = await db.rpc("save_shop_collection", {
    p_project: projectId,
    p_collection: collectionId,
    p_fields: fields,
    p_products: productIds ?? null,
  });
  if (!error) return NextResponse.json({ collection: data });

  const failures: Record<string, [number, string]> = {
    PT400: [400, "Select distinct products from this shop."],
    PT404: [404, "Project or collection not found."],
    "23505": [409, "That collection slug already exists."],
    "22P02": [400, "Invalid collection identifier."],
  };
  const [status, message] = failures[error.code] ?? [500, "Could not save collection."];
  return NextResponse.json({ error: message }, { status });
}
