import { redirect } from "next/navigation";

/** Legacy path — personal intake lives at /welcome */
export default function OpportunityIntakeRedirect() {
  redirect("/welcome?next=/opportunity");
}
