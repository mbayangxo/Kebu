import { redirect } from "next/navigation";

/** Legacy create path — registration wizard is the Slice 1 entry. */
export default function NewBusinessRedirect() {
  redirect("/business/register");
}
