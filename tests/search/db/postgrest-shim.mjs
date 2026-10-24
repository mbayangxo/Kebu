#!/usr/bin/env node
/**
 * NOT PostgREST. A minimal, purpose-built HTTP shim that understands exactly
 * the two request shapes app/api/search/businesses and
 * app/api/public/businesses/[id] issue via @supabase/supabase-js, and
 * answers them with real queries against the local Postgres database built
 * by tests/search/db/local-pg.ts. It exists only so a real `next dev`
 * process, running the real route/page code, can be driven by Playwright
 * against real Postgres data in this sandbox, which has no reachable
 * Supabase project and no Docker daemon for a genuine local Supabase stack.
 * It is not a substitute for hosted acceptance against the real Supabase
 * REST layer, and the verification report says so.
 *
 * Usage: node postgrest-shim.mjs <postgres-connection-url> <port>
 */
import http from "node:http";
import pg from "pg";

const [, , dbUrl, portArg] = process.argv;
if (!dbUrl || !portArg) {
  console.error("usage: postgrest-shim.mjs <postgres-url> <port>");
  process.exit(1);
}
const port = Number(portArg);
const pool = new pg.Pool({ connectionString: dbUrl, max: 4 });

const BUSINESS_COLUMNS = [
  "id", "public_kebu_id", "legal_name", "trading_name", "country_code", "region",
  "category", "description", "website", "verification_level", "lifecycle_status", "updated_at",
];

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(json) });
  res.end(json);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "POST" && url.pathname === "/rest/v1/rpc/search_businesses") {
      const { p_query = null, p_country = null, p_limit = 20, p_offset = 0 } = await readJsonBody(req);
      const { rows } = await pool.query(
        "select * from public.search_businesses($1, $2, $3, $4)",
        [p_query, p_country, p_limit, p_offset],
      );
      return send(res, 200, rows);
    }

    if (req.method === "GET" && url.pathname === "/rest/v1/businesses") {
      const idFilter = url.searchParams.get("id"); // PostgREST shape: "eq.<uuid>"
      if (!idFilter || !idFilter.startsWith("eq.")) return send(res, 400, { error: "expected id=eq.<uuid>" });
      const id = idFilter.slice(3);
      const { rows } = await pool.query(
        `select ${BUSINESS_COLUMNS.map((c) => `"${c}"`).join(",")} from public.businesses where id = $1`,
        [id],
      );
      // Always a plain array — @supabase/supabase-js's .maybeSingle() collapses
      // 0/1/N rows client-side, so the shim doesn't need to special-case it.
      return send(res, 200, rows);
    }

    send(res, 404, { error: `shim has no route for ${req.method} ${url.pathname}` });
  } catch (err) {
    console.error("[postgrest-shim]", err);
    send(res, 500, { error: String(err && err.message ? err.message : err) });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[postgrest-shim] listening on http://127.0.0.1:${port}`);
});
