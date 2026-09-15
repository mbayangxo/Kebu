import { redirect } from "next/navigation";

/**
 * The legacy in-memory store builder. Redirects to the real site builder,
 * which persists to Supabase and supports the full merchant flow.
 */
export default function LegacyStoreNewRedirect() {
  redirect("/create/new");
}
