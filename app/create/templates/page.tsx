import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Templates renamed to Aesthetics. */
export default function CreateTemplatesRedirect() {
  redirect("/create/aesthetics");
}
