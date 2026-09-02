import { redirect } from "next/navigation";

/** Replaced by /welcome — Kebu learns about you before business. */
export default function LegacyOnboardingRedirect() {
  redirect("/welcome");
}
