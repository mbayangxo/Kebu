import { DeveloperEditor } from "@/app/components/marketplace/developer-editor";
export default async function AppPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;return <DeveloperEditor id={id}/>;
}
