import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { KebuIcon } from "@/app/components/kebu/kebu-icon";
import { createClient } from "@/lib/supabase/server";
import { KEBU } from "@/lib/kebu-brand";
import { LibraryDrivePanel } from "@/app/components/library/library-drive-panel";
import { LibraryDocumentsPanel } from "@/app/components/library/library-documents-panel";

type Props={searchParams:Promise<{view?:string}>};
type View="files"|"documents"|"designs"|"sites";

function parseView(value?:string):View{
  return value==="documents"||value==="designs"||value==="sites"?value:"files";
}

function formatBytes(value:number|null){
  if(!value||value<1)return "—";
  if(value<1024)return value+" B";
  if(value<1024*1024)return Math.round(value/1024)+" KB";
  return (value/(1024*1024)).toFixed(1)+" MB";
}

export default async function LibraryPage({searchParams}:Props){
  const {view:rawView}=await searchParams;
  const view=parseView(rawView);
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login?next=/library");

  const [uploadsResult,designsResult,projectsResult]=await Promise.all([
    supabase.from("studio_uploads").select("id, kind, url, file_name, mime, byte_size, created_at").eq("owner_id",user.id).order("created_at",{ascending:false}).limit(60),
    supabase.from("create_designs").select("id, title, design_type, updated_at").eq("owner_id",user.id).order("updated_at",{ascending:false}).limit(24),
    supabase.from("projects").select("id, title, project_type, updated_at").eq("owner_id",user.id).order("updated_at",{ascending:false}).limit(24),
  ]);
  const uploads=uploadsResult.data??[],designs=designsResult.data??[],projects=projectsResult.data??[];

  const tabs:[View,string,number|null][]=[
    ["files","Files",uploads.length],["documents","Documents",null],["designs","Designs",designs.length],["sites","Sites",projects.length],
  ];

  return <AppShell title="Library">
    <div className="mx-auto max-w-[1450px] px-4 py-4 sm:px-6 lg:px-7">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-4" style={{borderColor:KEBU.border}}>
        <div><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-black/30">Library</p><h1 className="mt-1 text-[30px] tracking-[-.04em]" style={{fontFamily:"var(--font-fraunces)"}}>Everything you keep.</h1><p className="mt-1 text-[10px] text-black/40">Files, documents, designs and sites belong in one place.</p></div>
        <div className="flex gap-2"><Link href="/studio/new" className="rounded-full border px-4 py-2 text-[9px] font-semibold" style={{borderColor:KEBU.border}}>New design</Link><Link href="/studio" className="rounded-full bg-black px-4 py-2 text-[9px] font-semibold text-white">Open Studio</Link></div>
      </header>

      <nav className="flex gap-5 overflow-x-auto border-b" style={{borderColor:KEBU.border}}>
        {tabs.map(([id,label,count])=><Link key={id} href={"/library?view="+id} className="shrink-0 border-b-2 py-3 text-[10px] font-semibold" style={{borderColor:view===id?KEBU.orange:"transparent",color:view===id?KEBU.black:KEBU.muted}}>{label}{count!==null?<span className="ml-1.5 text-[8px] text-black/30">{count}</span>:null}</Link>)}
      </nav>

      <div className="py-4">
        {view==="files"?<>
          <LibraryDrivePanel/>
          <section className="mt-5 border-t pt-4" style={{borderColor:KEBU.border}}>
            <div className="mb-2 flex items-center justify-between"><p className="text-[11px] font-semibold">Recent files</p><span className="text-[8px] text-black/30">{uploads.length}</span></div>
            <div className="border-y" style={{borderColor:KEBU.border}}>
              {uploads.slice(0,20).map((item,index)=><a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 border-b py-3 last:border-b-0" style={{borderColor:KEBU.border}}><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF1E9]"><KebuIcon name="library" size={14} style={{color:KEBU.orange}}/></span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold">{item.file_name||"Untitled file"}</span><span className="block text-[8px] text-black/35">{item.kind||item.mime||"file"} · {formatBytes(item.byte_size)}</span></span><span className="text-black/20">↗</span></a>)}
              {!uploads.length?<p className="py-8 text-center text-[9px] text-black/35">No uploaded files yet.</p>:null}
            </div>
          </section>
        </>:null}

        {view==="documents"?<LibraryDocumentsPanel/>:null}

        {view==="designs"?<section><div className="mb-3 flex items-center justify-between"><p className="text-[11px] font-semibold">Designs</p><Link href="/studio/new" className="text-[9px] text-black/35">+ New design</Link></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{designs.map((design,index)=><Link key={design.id} href={"/studio/"+design.id} className="overflow-hidden rounded-[14px] border bg-white" style={{borderColor:KEBU.border}}><div className="h-[110px]" style={{background:index%2?"linear-gradient(135deg,#531109,#ff6a00)":"linear-gradient(135deg,#191919,#7b5148)"}}/><div className="p-3"><p className="truncate text-[10px] font-semibold">{design.title}</p><p className="mt-1 text-[8px] text-black/35">{design.design_type.replaceAll("_"," ")}</p></div></Link>)}</div>{!designs.length?<p className="py-10 text-center text-[9px] text-black/35">No designs yet.</p>:null}</section>:null}

        {view==="sites"?<section><div className="mb-3 flex items-center justify-between"><p className="text-[11px] font-semibold">Sites & stores</p><Link href="/create/new" className="text-[9px] text-black/35">+ New site</Link></div><div className="border-y" style={{borderColor:KEBU.border}}>{projects.map(project=><Link key={project.id} href={"/create/"+project.id} className="flex items-center gap-3 border-b py-3 last:border-b-0" style={{borderColor:KEBU.border}}><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF1E9]"><KebuIcon name="builder" size={14} style={{color:KEBU.orange}}/></span><span className="min-w-0 flex-1"><span className="block truncate text-[10px] font-semibold">{project.title}</span><span className="block text-[8px] text-black/35">{project.project_type}</span></span><span className="text-black/20">→</span></Link>)}{!projects.length?<p className="py-8 text-center text-[9px] text-black/35">No sites yet.</p>:null}</div></section>:null}
      </div>
    </div>
  </AppShell>;
}
