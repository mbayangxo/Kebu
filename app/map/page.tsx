import { redirect } from "next/navigation";

/** Legacy hard-coded map — live Country Explorer is DB-backed at /opportunity/countries */
export default function MapPage() {
  redirect("/opportunity/countries");
}
