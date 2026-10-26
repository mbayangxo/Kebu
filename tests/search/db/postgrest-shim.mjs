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

    if (req.method === "POST" && url.pathname === "/rest/v1/rpc/search_products") {
      const { p_query = null, p_limit = 20, p_offset = 0 } = await readJsonBody(req);
      const { rows } = await pool.query("select * from public.search_products($1, $2, $3)", [p_query, p_limit, p_offset]);
      return send(res, 200, rows);
    }

    // Mirrors the route's own always-applied filters (is_active/status='published')
    // rather than parsing the embedded-select query string literally — same spirit
    // as the /businesses handler above, which ignores the exact select list too.
    if (req.method === "GET" && url.pathname === "/rest/v1/project_products") {
      const idFilter = url.searchParams.get("id");
      if (!idFilter || !idFilter.startsWith("eq.")) return send(res, 400, { error: "expected id=eq.<uuid>" });
      const id = idFilter.slice(3);
      const { rows } = await pool.query(
        `select pp.id, pp.name, pp.description, pp.price_label, pp.image_url, pp.is_active, pp.updated_at,
                p.status as project_status, p.subdomain as project_subdomain
         from public.project_products pp
         join public.projects p on p.id = pp.project_id
         where pp.id = $1 and pp.is_active = true and p.status = 'published'`,
        [id],
      );
      const shaped = rows.map((r) => ({
        id: r.id, name: r.name, description: r.description, price_label: r.price_label,
        image_url: r.image_url, is_active: r.is_active, updated_at: r.updated_at,
        projects: { status: r.project_status, subdomain: r.project_subdomain },
      }));
      return send(res, 200, shaped);
    }

    if (req.method === "GET" && url.pathname === "/rest/v1/marketplace_templates") {
      const idFilter = url.searchParams.get("id");
      if (!idFilter || !idFilter.startsWith("eq.")) return send(res, 400, { error: "expected id=eq.<uuid>" });
      const id = idFilter.slice(3);
      const { rows } = await pool.query(
        `select mt.id, mt.name, mt.description, mt.category, mt.price_cents, mt.preview_url, mt.status, mt.updated_at,
                dp.display_name
         from public.marketplace_templates mt
         left join public.developer_profiles dp on dp.id = mt.developer_id
         where mt.id = $1 and mt.status = 'published'`,
        [id],
      );
      const shaped = rows.map((r) => ({
        id: r.id, name: r.name, description: r.description, category: r.category, price_cents: r.price_cents,
        preview_url: r.preview_url, status: r.status, updated_at: r.updated_at,
        developer_profiles: r.display_name ? { display_name: r.display_name } : null,
      }));
      return send(res, 200, shaped);
    }

    if (req.method === "POST" && url.pathname === "/rest/v1/rpc/search_opportunities") {
      const { p_user_id = null, p_query = null, p_limit = 20, p_offset = 0 } = await readJsonBody(req);
      const { rows } = await pool.query(
        "select * from public.search_opportunities($1, $2, $3, $4)",
        [p_user_id, p_query, p_limit, p_offset],
      );
      return send(res, 200, rows);
    }

    if (req.method === "POST" && url.pathname === "/rest/v1/rpc/search_people") {
      const { p_query = null, p_limit = 20, p_offset = 0 } = await readJsonBody(req);
      const { rows } = await pool.query("select * from public.search_people($1, $2, $3)", [p_query, p_limit, p_offset]);
      return send(res, 200, rows);
    }

    if (req.method === "GET" && url.pathname === "/rest/v1/developer_profiles") {
      const idFilter = url.searchParams.get("id");
      if (!idFilter || !idFilter.startsWith("eq.")) return send(res, 400, { error: "expected id=eq.<uuid>" });
      const id = idFilter.slice(3);
      const { rows } = await pool.query(
        `select id, display_name, bio, website_url, status, updated_at
         from public.developer_profiles where id = $1 and status = 'approved'`,
        [id],
      );
      return send(res, 200, rows);
    }

    if (req.method === "POST" && url.pathname === "/rest/v1/rpc/search_country_intel") {
      const { p_mode = null, p_query = null, p_limit = 20, p_offset = 0 } = await readJsonBody(req);
      const { rows } = await pool.query(
        "select * from public.search_country_intel($1, $2, $3, $4)",
        [p_mode, p_query, p_limit, p_offset],
      );
      return send(res, 200, rows);
    }

    if (req.method === "GET" && url.pathname === "/rest/v1/country_profiles") {
      const codeFilter = url.searchParams.get("country_code");
      if (!codeFilter || !codeFilter.startsWith("eq.")) return send(res, 400, { error: "expected country_code=eq.<CC>" });
      const code = codeFilter.slice(3);
      const { rows } = await pool.query(
        `select country, country_code, capital, population, gdp, economy_overview, startup_ecosystem,
                technology_ecosystem, universities, major_exports, major_imports, trade_agreements,
                industrial_zones, manufacturing_sectors, logistics, cultural_notes, historical_notes,
                historical_empires, ethnic_groups, business_etiquette, diaspora_notes, data_confidence,
                publish_status, last_verified_at
         from public.country_profiles where country_code = $1 and publish_status = 'published'`,
        [code],
      );
      return send(res, 200, rows);
    }

    if (req.method === "POST" && url.pathname === "/rest/v1/rpc/search_sites") {
      const { p_query = null, p_limit = 20, p_offset = 0 } = await readJsonBody(req);
      const { rows } = await pool.query("select * from public.search_sites($1, $2, $3)", [p_query, p_limit, p_offset]);
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
