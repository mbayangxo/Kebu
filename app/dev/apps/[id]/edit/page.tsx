import { redirect } from "next/navigation";
export default async function EditApp({params}:{params:Promise<{id:string}>}){
  redirect("/dev/apps/"+(await params).id);
}
