"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { type CodeFile, type CodeFiles, type CodeWorkspace, fileNames, filesSchema } from "@/lib/kebu-code/workspace";
import styles from "./workspace.module.css";

type Project=Pick<CodeWorkspace,"id"|"title"|"revision">;
type Store={id:string;title:string};
type Product={id:string;name:string;price_label:string|null;track_stock:boolean|null;stock_qty:number|null;has_variants:boolean|null};
type Catalog={products:Product[];hasMore:boolean};
type Proposal={base:number;summary:string;files:CodeFiles};
async function request(path="",body?:unknown){
  const r=await fetch("/api/code"+path,{cache:"no-store",...(body?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{})});
  const data=await r.json();
  if(!r.ok)throw new Error(data.error??"The workspace request failed.");
  return data;
}
function makePreview(files:CodeFiles){
  const template=document.createElement("template");
  template.innerHTML=files["index.html"];
  const allowed=new Set("a abbr article aside b blockquote br button caption code dd details div dl dt em figcaption figure footer h1 h2 h3 h4 h5 h6 header hr i label li main mark nav ol p pre section small span strong summary table tbody td th thead tr u ul".split(" "));
  for(const node of Array.from(template.content.querySelectorAll("*"))){
    if(!allowed.has(node.localName)){node.remove();continue;}
    for(const attr of Array.from(node.attributes))if(!["id","class","style","title","lang","dir","aria-label","colspan","rowspan","open"].includes(attr.name))node.removeAttribute(attr.name);
  }
  const stylesheet=files["styles.css"].replace(/<\/style/gi,"<\\/style");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><style>${stylesheet}</style></head><body>${template.innerHTML}</body></html>`;
}

export default function CodeWorkspaceView(){
  const [list,setList]=useState<Project[]>([]);
  const [project,setProject]=useState<CodeWorkspace>();
  const [draft,setDraft]=useState<CodeFiles>();
  const [file,setFile]=useState<CodeFile>("index.html");
  const [proposal,setProposal]=useState<Proposal>();
  const [preview,setPreview]=useState("");
  const [assistant,setAssistant]=useState(false);
  const [title,setTitle]=useState("");
  const [prompt,setPrompt]=useState("");
  const [store,setStore]=useState("");
  const [design,setDesign]=useState("");
  const [stores,setStores]=useState<Store[]>([]);
  const [storeId,setStoreId]=useState("");
  const [catalog,setCatalog]=useState<Catalog>();
  const [busy,setBusy]=useState(true);
  const [message,setMessage]=useState("");
  const [failure,setFailure]=useState("");
  const dirty=Boolean(project&&draft&&fileNames.some(name=>draft[name]!==project.files[name]));
  const changed=proposal&&project?fileNames.filter(name=>proposal.files[name]!==project.files[name]):[];

  function open(workspace:CodeWorkspace){
    setProject(workspace);setDraft(workspace.files);setProposal(undefined);setPreview("");setStoreId(workspace.store_project_id??"");setCatalog(undefined);
    setList(items=>[{id:workspace.id,title:workspace.title,revision:workspace.revision},...items.filter(x=>x.id!==workspace.id)]);
  }
  useEffect(()=>{
    let cancelled=false;
    request().then(data=>{if(!cancelled){setAssistant(data.assistantAvailable===true);setList(data.workspaces);}})
      .catch(error=>{if(!cancelled)setFailure(error.message);}).finally(()=>{if(!cancelled)setBusy(false);});
    return ()=>{cancelled=true;};
  },[]);
  async function run(work:()=>Promise<void>){
    if(busy)return;
    setBusy(true);setFailure("");setMessage("");
    try{await work();}catch(error){setFailure(error instanceof Error?error.message:"Something went wrong.");}
    finally{setBusy(false);}
  }
  function submit(e:FormEvent,work:()=>Promise<void>){e.preventDefault();void run(work);}
  async function save(files:CodeFiles){
    if(!project)return;
    const validated=filesSchema.safeParse(files);
    if(!validated.success)throw new Error("Check the source size limits and make sure index.html is not empty.");
    open((await request("",{action:"save",id:project.id,base:project.revision,files:validated.data})).workspace);
    setMessage("Revision saved.");
  }
  async function download(){
    if(!draft)return;
    const {default:JSZip}=await import("jszip");
    const zip=new JSZip();
    for(const name of fileNames)zip.file(name,draft[name]);
    const objectURL=URL.createObjectURL(await zip.generateAsync({type:"blob"}));
    const anchor=document.createElement("a");anchor.href=objectURL;anchor.download="kebu-app-source.zip";anchor.click();
    window.setTimeout(()=>URL.revokeObjectURL(objectURL),30000);
    setMessage("Source exported.");
  }
  const loading=busy&&!project;
  return <main className={styles.shell}>
    <header className={styles.top}><Link href="/account">← Kebu account</Link><span>PRIVATE WORKSPACE</span></header>
    <div className={styles.hero}><p>KEBU / DEVELOPER TOOLS</p><h1>Kebu Code</h1><p>Describe an app. Review the source. Save a revision.</p></div>
    {failure&&<p className={styles.problem} role="alert">{failure}</p>}{message&&<p className={styles.notice} role="status">{message}</p>}
    <div className={styles.layout}>
      <aside className={styles.card}><h2>Projects</h2>
        {list.length===0&&<p>{loading?"Loading workspaces…":"Create a private project to begin."}</p>}
        <div className={styles.projectList}>{list.map(item=><button type="button" className={styles.secondary} key={item.id} disabled={busy} aria-pressed={project?.id===item.id} onClick={()=>{
          if(dirty&&!window.confirm("Leave without saving your edits?"))return;
          void run(async()=>open((await request("?id="+encodeURIComponent(item.id))).workspace));
        }}>{item.title} · v{item.revision}</button>)}</div>
        <form className={styles.form} onSubmit={e=>submit(e,async()=>{
          if(dirty&&!window.confirm("Create a project and leave your unsaved edits?"))return;
          open((await request("",{action:"create",title})).workspace);setTitle("");
        })}><label htmlFor="code-title">Project name</label><input id="code-title" value={title} onChange={e=>setTitle(e.target.value)} required maxLength={80}/><button disabled={busy}>Create project</button></form>
      </aside>
      {project&&draft?<div className={styles.stack}>
        <section className={styles.card}><div className={styles.toolbar}><h2>{project.title}</h2><span>Revision {project.revision}{dirty?" · Unsaved edits":""}</span></div>
          <label htmlFor="code-file">Source file</label><select id="code-file" value={file} onChange={e=>setFile(e.target.value as CodeFile)}>{fileNames.map(name=><option key={name}>{name}</option>)}</select>
          <textarea className={styles.editor} aria-label={file+" source"} spellCheck={false} value={draft[file]} disabled={busy} onChange={e=>setDraft({...draft,[file]:e.target.value})}/>
          <div className={styles.toolbar}><button disabled={busy||!dirty} onClick={()=>void run(()=>save(draft))}>Save revision</button><button className={styles.secondary} onClick={()=>setPreview(makePreview(draft))}>Preview layout</button><button className={styles.secondary} disabled={busy} onClick={()=>void run(download)}>Download source</button></div>
          {preview&&<iframe className={styles.preview} sandbox="" title="Static layout preview" srcDoc={preview}/>}
          <p>Layout preview runs with scripts off. The ZIP includes your JavaScript for development in a separate environment.</p>
        </section>
        <section className={styles.card}><h2>Store connection</h2>
          <p>Connect a Kebu Store project you own to inspect its current catalog and stock. This is read-only.</p>
          <div className={styles.toolbar}><button className={styles.secondary} disabled={busy} onClick={()=>void run(async()=>{setStores((await request("?stores=1")).stores);setMessage("Your stores loaded.");})}>Load my stores</button>
            {project.store_project_id&&<button className={styles.secondary} disabled={busy} onClick={()=>void run(async()=>{setCatalog(await request("?id="+encodeURIComponent(project.id)+"&catalog=1"));setMessage("Read current store catalog.");})}>Read catalog and stock</button>}</div>
          <form className={styles.form} onSubmit={e=>submit(e,async()=>{
            open((await request("",{action:"connectStore",id:project.id,base:project.revision,storeId:storeId||null})).workspace);
            setMessage(storeId?"Store connected.":"Store disconnected.");
          })}>
            <label htmlFor="code-store-connection">Store</label>
            <select id="code-store-connection" value={storeId} onChange={e=>setStoreId(e.target.value)}>
              <option value="">No connected store</option>
              {project.store_project_id&&!stores.some(item=>item.id===project.store_project_id)&&<option value={project.store_project_id}>Current store · load to see name</option>}
              {stores.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <button disabled={busy||dirty||storeId===(project.store_project_id??"")}>Save store connection</button>
            {dirty&&<p>Save your source first to change the store connection.</p>}
          </form>
          {catalog&&<><h3>Active products</h3>
            {catalog.products.length===0&&<p>This store has no active products.</p>}
            <div className={styles.catalog}><table><thead><tr><th>Product</th><th>Price label</th><th>Stock</th></tr></thead><tbody>
              {catalog.products.map(product=><tr key={product.id}><td>{product.name}</td><td>{product.price_label??"—"}</td><td>{product.has_variants?"Check variants in Shop":product.track_stock?product.stock_qty??"Unavailable":"Not tracked"}</td></tr>)}
            </tbody></table></div>
            {catalog.hasMore&&<p>Showing the first 50 active products. For the full catalog, use Kebu Shop.</p>}
          </>}
        </section>
        <section className={styles.card}><h2>Ask Yande to change the app</h2><p>{assistant?"Yande proposes source changes from your last saved revision. You decide what to keep.":"AI generation is unavailable here. You can still edit, preview, save, and export code."}</p>
          <form className={styles.form} onSubmit={e=>submit(e,async()=>{
            setProposal(undefined);
            setProposal(await request("",{action:"propose",id:project.id,base:project.revision,prompt,design,store}));
            setMessage("Proposal ready. Your source is unchanged.");
          })}><label htmlFor="code-prompt">Describe the change</label><textarea id="code-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={1600} required/>
            <label htmlFor="code-design">Design direction (optional)</label><textarea id="code-design" value={design} onChange={e=>setDesign(e.target.value)} maxLength={1200} placeholder="Example: cream background, red accents, large flavor photos. Keep checkout and navigation unchanged."/>
            <label htmlFor="code-store">Published Kebu store subdomain (optional)</label><input id="code-store" value={store} onChange={e=>setStore(e.target.value)} maxLength={63} pattern="[a-z0-9]+(-[a-z0-9]+)*"/><p>Yande can link to a published storefront. Checkout, loyalty, gift cards and royalty accounting aren’t connected to your code workspace.</p>
            <button disabled={!assistant||busy||dirty}>Propose changes</button>{dirty&&<p>Save your edits before asking Yande for a proposal.</p>}
          </form>
          {proposal&&<div className={styles.proposal}><h3>Review changes</h3><p>{proposal.summary}</p>{changed.map(name=><details key={name}><summary>{name}</summary><div className={styles.compare}><div><h4>Saved</h4><pre>{project.files[name]}</pre></div><div><h4>Proposed</h4><pre>{proposal.files[name]}</pre></div></div></details>)}
            {changed.length===0&&<p>No source changes were proposed.</p>}
            <div className={styles.toolbar}><button disabled={busy||dirty||changed.length===0||proposal.base!==project.revision} onClick={()=>void run(()=>save(proposal.files))}>Save proposed revision</button><button className={styles.secondary} disabled={busy} onClick={()=>setProposal(undefined)}>Discard proposal</button></div>
          </div>}
        </section>
        <section className={styles.card}><h2>Revision history</h2>{!project.history.length&&<p>Previous versions will appear after your first save.</p>}{project.history.map(item=><div className={styles.toolbar} key={item.revision}><span>Revision {item.revision}</span><button className={styles.secondary} disabled={busy||dirty} onClick={()=>void run(async()=>{
          open((await request("",{action:"restore",id:project.id,base:project.revision,target:item.revision})).workspace);setMessage("Previous source restored as a new revision.");
        })}>Restore revision {item.revision}</button></div>)}</section>
      </div>:<section className={styles.card}><h2>Build your first browser app</h2><p>Open a project to work with HTML, CSS, and JavaScript. Your code is yours to download.</p></section>}
    </div>
  </main>;
}
