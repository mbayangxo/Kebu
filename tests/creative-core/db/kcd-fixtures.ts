/**
 * Fixtures for the 3C S4 database suites: seeded owners/projects, reading a project back through
 * the adapter, and calling apply_node_ops as a given role.
 */
import { randomUUID } from "crypto";
import { expectFor, type KcdDocument, type Op, type Transaction } from "@/lib/creative-core";
import { rowsToDocument, type ProjectRows } from "@/lib/create/kcd-adapter";
import { asAnon, asService, asUser, type Pool, type PoolClient } from "./kcd-db";

export async function createUser(pool: Pool): Promise<string> {
  const { rows } = await pool.query(`INSERT INTO auth.users (email) VALUES ($1) RETURNING id`, [`kcd-${randomUUID()}@test.kebu.invalid`]);
  return rows[0].id;
}

export interface Seeded {
  ownerId: string;
  projectId: string;
  pageIds: string[];
  sectionIds: string[][];
}

/** A project with pages of legacy sections, written the way 3B writes them (no KCD columns). */
export async function seedProject(pool: Pool, opts: { ownerId?: string; pages?: number; sections?: number; kcd?: boolean } = {}): Promise<Seeded> {
  const ownerId = opts.ownerId ?? (await createUser(pool));
  const { rows: [p] } = await pool.query(`INSERT INTO public.projects (owner_id, title) VALUES ($1, 'KCD S4') RETURNING id`, [ownerId]);
  const pageIds: string[] = [];
  const sectionIds: string[][] = [];
  for (let i = 0; i < (opts.pages ?? 1); i++) {
    const { rows: [pg] } = await pool.query(
      `INSERT INTO public.project_pages (project_id, slug, title, sort_order) VALUES ($1, $2, $3, $4) RETURNING id`,
      [p.id, i === 0 ? "home" : `page-${i}`, i === 0 ? "Home" : `Page ${i}`, i],
    );
    pageIds.push(pg.id);
    const ids: string[] = [];
    for (let k = 0; k < (opts.sections ?? 3); k++) {
      const { rows: [s] } = await pool.query(
        `INSERT INTO public.project_sections (page_id, section_type, sort_order, props) VALUES ($1, $2, $3, $4) RETURNING id`,
        [pg.id, k % 2 ? "text" : "hero", k, JSON.stringify(k % 2 ? { heading: `Text ${k}`, body: "Body" } : { heading: `Hero ${k}`, align: "center" })],
      );
      ids.push(s.id);
    }
    sectionIds.push(ids);
  }
  if (opts.kcd) await pool.query(`UPDATE public.projects SET document_schema_version = 'kcd-1' WHERE id = $1`, [p.id]);
  return { ownerId, projectId: p.id, pageIds, sectionIds };
}

export async function readRows(pool: Pool | PoolClient, projectId: string): Promise<ProjectRows> {
  const { rows: [project] } = await pool.query(`SELECT id, title, theme, document_schema_version FROM public.projects WHERE id = $1`, [projectId]);
  const { rows: pages } = await pool.query(
    `SELECT id, slug, title, sort_order, device_layouts, layout_version FROM public.project_pages WHERE project_id = $1 ORDER BY sort_order, id`,
    [projectId],
  );
  const { rows: sections } = await pool.query(
    `SELECT s.id, s.page_id, s.section_type, s.sort_order, s.props, s.parent_id, s.order_key, s.node_version::int AS node_version, s.type_version
     FROM public.project_sections s JOIN public.project_pages pg ON pg.id = s.page_id WHERE pg.project_id = $1 ORDER BY s.id`,
    [projectId],
  );
  for (const pg of pages) pg.layout_version = Number(pg.layout_version);
  return { project, pages, sections };
}

export async function readDocument(pool: Pool | PoolClient, projectId: string): Promise<KcdDocument> {
  return rowsToDocument(await readRows(pool, projectId)).document;
}

export function tx(doc: KcdDocument, ops: Op[], overrides: Partial<Transaction> = {}): Transaction {
  return { txId: randomUUID(), origin: "user", label: "S4 test", ops, expect: expectFor(doc, ops), ...overrides };
}

export type ApplyResultSql = {
  status: "committed" | "rejected" | "conflicted";
  replayed?: boolean;
  code?: string;
  message?: string;
  opIndex?: number | null;
  conflicts?: { id: string; expected: number | null; actual: number }[];
  versions?: Record<string, number>;
  removed?: string[];
  rebalanced?: string[];
  orderKeys?: Record<string, string>;
};

const call = async (c: PoolClient, projectId: string, t: unknown): Promise<ApplyResultSql> =>
  (await c.query(`SELECT public.apply_node_ops($1, $2::jsonb) AS r`, [projectId, JSON.stringify(t)])).rows[0].r;

export const applyAsOwner = (pool: Pool, userId: string, projectId: string, t: unknown) => asUser(pool, userId, (c) => call(c, projectId, t));
export const applyAsService = (pool: Pool, projectId: string, t: unknown) => asService(pool, (c) => call(c, projectId, t));
export const applyAsAnon = (pool: Pool, projectId: string, t: unknown) => asAnon(pool, (c) => call(c, projectId, t));

export type JournalRow = Record<string, unknown> & { status: string; result_versions: unknown };

export async function journal(pool: Pool, projectId: string): Promise<JournalRow[]> {
  const { rows } = await pool.query(`SELECT * FROM public.creative_op_journal WHERE project_id = $1 ORDER BY id`, [projectId]);
  return rows as JournalRow[];
}

/** Postgres error of a promise, or null. */
export async function pgError(p: Promise<unknown>): Promise<{ code: string; message: string } | null> {
  try {
    await p;
    return null;
  } catch (e) {
    return { code: (e as { code?: string }).code ?? "", message: (e as Error).message };
  }
}
