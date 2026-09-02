import { redirect } from "next/navigation";

/** Kebu Score lives on My business — not a top-level nav destination. */
export default function KaScoreRedirectPage() {
  redirect("/account#readiness");
}
