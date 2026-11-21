"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { documentContent, referenceSchema, type CodeDocument, type DocumentReference } from "@/lib/kebu-code/document";
import styles from "../workspace.module.css";

type Item = Pick<CodeDocument, "id" | "title" | "revision">;
type Proposal = { base: number; content: string; missing: string[] };
async function request(query = "", body?: object) {
  const response = await fetch("/api/code/documents" + query, {
    cache: "no-store", ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error ?? "The document request failed. Try again.");
  return data;
}

export default function Documents() {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [ready, setReady] = useState(false);
  const [assistant, setAssistant] = useState(false);
  const [current, setCurrent] = useState<CodeDocument>();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [references, setReferences] = useState<DocumentReference[]>([]);
  const [proposal, setProposal] = useState<Proposal>();
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const lock = useRef(false);
  const dirty = Boolean(current && content !== current.content);
  const valid = documentContent.safeParse(content).success;

  function list(data: { documents: Item[]; hasMore: boolean; assistantAvailable: boolean }, offset: number) {
    setItems(data.documents); setHasMore(data.hasMore); setAssistant(data.assistantAvailable);
    setPage(offset); setReady(true);
  }
  useEffect(() => {
    let active = true;
    request().then(data => { if (active) list(data, 0); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!dirty && !proposal && !brief && !references.length) return;
    function prevent(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, proposal, brief, references.length]);

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong."); }
    finally { lock.current = false; setBusy(false); }
  }
  function open(document: CodeDocument) {
    setCurrent(document); setContent(document.content); setBrief(""); setReferences([]); setProposal(undefined);
  }
  function mayLeave() {
    return !(dirty || proposal || brief || references.length) || window.confirm("Leave this document and discard unsaved work?");
  }
  async function write(action: object, message: string) {
    if (!current) return;
    const { document } = await request("", { ...action, id: current.id, base: current.revision });
    setCurrent(document); setContent(document.content); setProposal(undefined);
    setItems(old => old.map(item => item.id === document.id ? { ...item, revision: document.revision } : item));
    setNotice(message);
  }
  async function addReferences(files: File[]) {
    if (!files.length) return;
    if (files.length + references.length > 2) throw new Error("Attach up to two reference files.");
    const next = await Promise.all(files.map(async file => {
      if (file.size > 8000) throw new Error("Each reference must be 8 KB or smaller.");
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      const parsed = referenceSchema.safeParse({ name: file.name, text: decoded });
      if (!parsed.success || !decoded.trim()) throw new Error("Choose a nonempty UTF-8 .txt, .md or .csv file.");
      return parsed.data;
    }));
    setReferences([...references, ...next]);
    setProposal(undefined);
  }

  return <main className={styles.shell}>
    <header className={styles.top}><Link href="/code" onClick={event => { if (!mayLeave()) event.preventDefault(); }}>← Code projects</Link><span>KEBU CODE / PRIVATE WORKSPACE</span></header>
    <div className={styles.hero}><p>WORKSPACE / WRITING</p><h1>Documents</h1><p>Draft a business proposal, handover, or brief. Edit it here and take a copy with you.</p></div>
    {error && <p role="alert" className={styles.problem}>{error}</p>}
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    <div className={styles.layout}>
      <aside className={styles.card}>
        <h2>Your documents</h2>
        {!ready && <button type="button" disabled={busy} onClick={() => void run(async () => list(await request(), 0))}>{busy ? "Loading…" : "Retry loading"}</button>}
        {ready && !items.length && <p>{page ? "No documents on this page." : "Start with a private document."}</p>}
        <div className={styles.projectList}>{items.map(item => <button type="button" className={styles.secondary} key={item.id}
          disabled={busy || current?.id === item.id} aria-pressed={current?.id === item.id}
          onClick={() => { if (mayLeave()) void run(async () => open((await request("?id=" + item.id)).document)); }}>{item.title} · v{item.revision}</button>)}</div>
        {(hasMore || page > 0) && <div className={styles.toolbar}>
          <button disabled={busy || page === 0} onClick={() => void run(async () => list(await request("?page=" + (page - 1)), page - 1))}>Previous</button>
          <button disabled={busy || !hasMore} onClick={() => void run(async () => list(await request("?page=" + (page + 1)), page + 1))}>Next</button>
        </div>}
        <form className={styles.form} onSubmit={event => {
          event.preventDefault();
          if (mayLeave()) void run(async () => {
            const { document } = await request("", { action: "create", title });
            open(document); setTitle("");
            if (page === 0) {
              if (items.length === 50) setHasMore(true);
              setItems(old => [document, ...old.filter(item => item.id !== document.id)].slice(0, 50));
            }
            setNotice("Private document created.");
          });
        }}>
          <label htmlFor="document-title">Document name</label>
          <input id="document-title" required maxLength={80} value={title} disabled={busy || !ready} onChange={event => setTitle(event.target.value)} />
          <button disabled={busy || !ready}>Create document</button>
        </form>
      </aside>
      {current ? <div className={styles.stack}>
        <section className={styles.card}>
          <div className={styles.toolbar}><h2>{current.title}</h2><span>Revision {current.revision}{dirty ? " · Unsaved edits" : ""}</span></div>
          <label htmlFor="document-text">Document (Markdown)</label>
          <textarea id="document-text" className={styles.documentEditor} value={content} maxLength={16000} disabled={busy}
            onChange={event => { setContent(event.target.value); setProposal(undefined); }} />
          {!valid && <p role="alert">Shorten the document to 24 KB or remove unsupported control characters before saving or exporting.</p>}
          <div className={styles.toolbar}>
            <button disabled={busy || !dirty || !valid} onClick={() => void run(() => write({ action: "save", content }, "Revision saved."))}>Save revision</button>
            <button className={styles.secondary} disabled={busy} onClick={() => {
              if (mayLeave()) void run(async () => open((await request("?id=" + current.id)).document));
            }}>Reopen saved version</button>
            {(["docx", "md"] as const).map(format => <button key={format} className={styles.secondary} disabled={busy || !valid || !content.trim()} onClick={() => void run(async () => {
              const { downloadDocument } = await import("@/lib/kebu-code/document-export");
              await downloadDocument(current.title, content, format); setNotice("Document exported.");
            })}>Download {format === "docx" ? "Word" : "Markdown"}</button>)}
          </div>
        </section>
        <section className={styles.card}>
          <h2>Ask Yande</h2>
          <p>{assistant ? "Describe what you need or what should change. Review the draft before saving it." : "Yande isn’t available here. You can still write, save, and export."}</p>
          <form className={styles.form} onSubmit={event => { event.preventDefault(); void run(async () => {
            setProposal(undefined);
            setProposal(await request("", { action: "draft", id: current.id, base: current.revision, brief, references }));
            setNotice("Draft ready for review. Your saved document hasn’t changed.");
          }); }}>
            <label htmlFor="document-brief">What should Yande write?</label>
            <textarea id="document-brief" placeholder="Draft a wholesale proposal based on my price list. Flag anything I need to confirm." required maxLength={3000}
              value={brief} disabled={busy} onChange={event => { setBrief(event.target.value); setProposal(undefined); }} />
            <label htmlFor="document-references">Reference files (optional)</label>
            <input id="document-references" type="file" accept=".txt,.md,.csv" multiple disabled={busy || !assistant || references.length >= 2}
              aria-describedby="document-reference-help" onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void run(() => addReferences(files)); }} />
            <p id="document-reference-help">Up to two .txt, .md, or .csv files, 8 KB each. References are sent to the AI provider when you draft. They are not saved with the document. Keep secrets and personal data out of your brief and files.</p>
            {references.map((reference, index) => <div className={styles.toolbar} key={index}><span>{reference.name}</span>
              <button aria-label={"Remove " + reference.name} className={styles.secondary} type="button" disabled={busy}
                onClick={() => { setReferences(old => old.filter((_, i) => i !== index)); setProposal(undefined); }}>Remove</button></div>)}
            {dirty && <p>Save your edits before asking for a new draft.</p>}
            <button disabled={!assistant || busy || dirty || !brief.trim()}>{busy ? "Working…" : "Propose draft"}</button>
          </form>
          {proposal && <div className={styles.proposal}>
            <h3>Review proposed draft</h3>
            {proposal.missing.length > 0 && <><p>Details to confirm:</p><ul>{proposal.missing.map((gap, index) => <li key={index}>{gap}</li>)}</ul></>}
            <pre className={styles.documentReview}>{proposal.content}</pre>
            <div className={styles.toolbar}>
              <button disabled={busy || dirty || proposal.base !== current.revision} onClick={() => {
                setContent(proposal.content); setProposal(undefined); setNotice("Draft moved to the editor. Review and save when ready.");
              }}>Use draft in editor</button>
              <button className={styles.secondary} disabled={busy} onClick={() => setProposal(undefined)}>Discard draft</button>
            </div>
          </div>}
        </section>
        <section className={styles.card}><h2>Revision history</h2>
          {!current.history.length && <p>Previous versions appear after you save an edit.</p>}
          {current.history.map(item => <div className={styles.toolbar} key={item.revision}>
            <span>Revision {item.revision}</span><button className={styles.secondary} disabled={busy || dirty || Boolean(proposal)}
              onClick={() => void run(() => write({ action: "restore", target: item.revision }, "Previous text restored as a new revision."))}>Restore revision {item.revision}</button>
          </div>)}
          <button className={styles.danger} disabled={busy} onClick={() => {
            if (!window.confirm("Permanently delete this document and its saved revisions?")) return;
            void run(async () => {
              await request("", { action: "delete", id: current.id, base: current.revision });
              setItems(old => old.filter(item => item.id !== current.id)); setCurrent(undefined);
              setContent(""); setBrief(""); setReferences([]); setProposal(undefined); setNotice("Document deleted.");
            });
          }}>Delete document</button>
        </section>
      </div> : <section className={styles.card}><h2>Turn an idea into a working document</h2><p>Give a new document a name, then write it yourself or ask Yande to draft it using your brief and reference files.</p></section>}
    </div>
  </main>;
}
