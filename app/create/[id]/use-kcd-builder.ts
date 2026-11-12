"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { parseDocument, type KcdDocument, type NodeId, type Op, type PageId, type Transaction } from "@/lib/creative-core";
import { type LegacySectionType } from "@/lib/create/kcd-adapter";
import { initialBuilderRows, projectBuilderEdit, type BuilderRows } from "@/lib/create/kcd-builder-projection";
import { builderInsertOperation, builderInsertPageOperations, builderReorderPageOperations, builderPatchOperations, builderReorderOperations } from "@/lib/create/kcd-builder-operations";
import { OperationCoordinator, type OperationState } from "@/lib/create/kcd-operation-coordinator";
import { sendKcdTransaction } from "@/lib/create/kcd-operation-transport";
import { acquireOperationQueueLease, builderQueueBlocker, enqueueSaveOperations } from "@/lib/create/offline-queue";

const pageFingerprint = (doc: KcdDocument) => JSON.stringify(doc.pages.map(({ id, title, slug, orderKey }) => ({ id, title, slug, orderKey })));

/** Owns operation history and save state. Legacy chrome remains owned by useProjectAutosave. */
export function useKcdBuilder(projectId: string, applyRows: (rows: BuilderRows) => void, reportError: (message: string) => void, syncPageNavigation?: () => Promise<void>) {
  const client = useRef<OperationCoordinator | null>(null);
  const lease = useRef<(() => void) | null>(null);
  const callbacks = useRef({ applyRows, reportError, syncPageNavigation });
  useLayoutEffect(() => { callbacks.current = { applyRows, reportError, syncPageNavigation }; });
  const [state, setState] = useState<{ document: KcdDocument | null; status: OperationState; message: string | null; pending: boolean; canUndo: boolean; canRedo: boolean }>({ document: null, status: "idle", message: null, pending: false, canUndo: false, canRedo: false });

  const syncedPages = useRef("");
  const navRunning = useRef<Promise<void> | null>(null);
  const [navError, setNavError] = useState<string | null>(null);
  const [navPending, setNavPending] = useState(false);
  const syncNavigation = useCallback(async () => {
    if (navRunning.current) return navRunning.current;
    const document = client.current?.confirmedDocument;
    if (!document || !client.current?.canPublish || !callbacks.current.syncPageNavigation || pageFingerprint(document) === syncedPages.current) return;
    const fingerprint = pageFingerprint(document);
    setNavPending(true);
    navRunning.current = callbacks.current.syncPageNavigation().then(() => {
      syncedPages.current = fingerprint; setNavError(null);
    }).catch((error) => {
      const message = error instanceof Error ? error.message : "Navigation synchronization failed. Retry Save.";
      setNavError(message); callbacks.current.reportError(message);
    }).finally(() => { navRunning.current = null; setNavPending(false); });
    return navRunning.current;
  }, []);
  useEffect(() => { if (state.status === "idle" && !state.pending) void syncNavigation(); }, [state.document, state.status, state.pending, syncNavigation]);

  const initialize = useCallback((input: unknown) => {
    const parsed = parseDocument(input);
    if (!parsed.ok) throw new Error("The saved creative document is invalid. Editing is blocked.");
    if (client.current && !client.current.canPublish) throw new Error("Save or resolve the pending changes before reloading this draft.");
    const blocker = builderQueueBlocker(projectId);
    if (blocker) throw new Error(blocker);
    lease.current?.();
    lease.current = acquireOperationQueueLease(projectId);
    let displayedDocument = parsed.document;
    let displayedRows = initialBuilderRows(parsed.document);
    const coordinator = new OperationCoordinator(parsed.document, async (tx) => {
      try { return await sendKcdTransaction(projectId, tx); }
      catch (error) {
        coordinator.checkpointPending((transaction) => enqueueSaveOperations({ projectId, transaction }));
        throw error;
      }
    }, () => crypto.randomUUID(), () => {
      if (client.current !== coordinator) return;
      const document = coordinator.document;
      if (displayedDocument !== document) {
        displayedRows = projectBuilderEdit(displayedDocument, document, displayedRows);
        callbacks.current.applyRows(displayedRows);
        displayedDocument = document;
      }
      setState({ document, status: coordinator.status, message: coordinator.message, pending: !coordinator.canPublish, canUndo: coordinator.history.canUndo, canRedo: coordinator.history.canRedo });
    }, 750);
    syncedPages.current = pageFingerprint(parsed.document);
    setNavError(null); setNavPending(false);
    client.current = coordinator;
    callbacks.current.applyRows(displayedRows);
    setState({ document: parsed.document, status: "idle", message: null, pending: false, canUndo: false, canRedo: false });
  }, [projectId]);

  const prepareReload = useCallback(async () => {
    const coordinator = client.current;
    if (!coordinator) return;
    await coordinator.flush();
    if (!coordinator.canPublish) throw new Error(coordinator.message ?? "Save or resolve pending edits before reloading this draft.");
  }, []);

  useEffect(() => {
    const checkpoint = () => {
      try { client.current?.checkpointPending((transaction) => enqueueSaveOperations({ projectId, transaction })); }
      catch (error) { callbacks.current.reportError(error instanceof Error ? error.message : "Could not preserve pending changes. Keep this page open."); }
    };
    const online = () => { void client.current?.flush(); };
    const leaving = (event: BeforeUnloadEvent) => {
      if (!client.current || client.current.canPublish) return;
      checkpoint(); event.preventDefault(); event.returnValue = "";
    };
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", leaving);
    return () => {
      checkpoint(); lease.current?.(); lease.current = null;
      client.current = null;
      window.removeEventListener("online", online); window.removeEventListener("beforeunload", leaving);
    };
  }, [projectId]);

  async function submit(label: string, operations: Op[]) {
    if (!operations.length) return;
    if (!client.current) throw new Error("The operation editor has not loaded.");
    await client.current.submit(label, operations);
  }
  async function submitReviewed(transaction: Transaction) {
    if (!client.current) throw new Error("The operation editor has not loaded.");
    await client.current.submitReviewed(transaction);
  }
  function updateProps(id: string, patch: Record<string, unknown>) {
    try {
      const node = client.current?.document.nodes[id as NodeId];
      if (!node) throw new Error("This element is no longer in the draft.");
      void submit("Edit section", builderPatchOperations(node, patch)).catch((error: Error) => callbacks.current.reportError(error.message));
    } catch (error) { callbacks.current.reportError(error instanceof Error ? error.message : "Could not edit this element."); }
  }
  async function add(pageId: string, type: LegacySectionType, props: Record<string, unknown> | undefined, after?: string | null) {
    const coordinator = client.current;
    if (!coordinator) throw new Error("The operation editor has not loaded.");
    const id = crypto.randomUUID() as NodeId;
    await submit("Add section", [builderInsertOperation(coordinator.document, pageId as PageId, type, props, after, id)]);
    return id;
  }
  async function reorder(pageId: string, ids: string[]) {
    if (!client.current) throw new Error("The operation editor has not loaded.");
    await submit("Reorder sections", builderReorderOperations(client.current.document, pageId as PageId, ids));
  }
  async function addPage(title: string, slug: string) {
    if (!client.current) throw new Error("The operation editor has not loaded.");
    const id = crypto.randomUUID() as PageId;
    await submit("Add page", builderInsertPageOperations(client.current.document, title, slug, id, crypto.randomUUID() as NodeId, crypto.randomUUID() as NodeId));
    return id;
  }
  async function reorderPages(ids: string[]) {
    if (!client.current) throw new Error("The operation editor has not loaded.");
    await submit("Reorder pages", builderReorderPageOperations(client.current.document, ids));
  }
  async function travel(direction: "undo" | "redo") {
    try { await client.current?.travel(direction); }
    catch (error) { callbacks.current.reportError(error instanceof Error ? error.message : "Could not change history."); }
  }
  return { ...state, status: navPending ? "saving" as const : navError ? "queued" as const : state.status, pending: state.pending || navPending || Boolean(navError), message: navError ?? state.message, canUndo: state.canUndo && !navPending && !navError, canRedo: state.canRedo && !navPending && !navError, navigationBusy: navPending, initialize, prepareReload, updateProps, add, reorder, addPage, reorderPages, submit, submitReviewed, travel,
    getDocument: () => client.current?.document ?? null,
    flush: async () => { await client.current?.flush(); await syncNavigation(); },
    canPublish: () => Boolean(client.current?.canPublish) && !navPending && !navError && (!client.current || syncedPages.current === pageFingerprint(client.current.confirmedDocument)) && !builderQueueBlocker(projectId),
  };
}
