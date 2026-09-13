/**
 * Kebu MCP Server — HTTP transport (MCP protocol 2024-11-05)
 *
 * Gives Claude Code and Claude.ai full read/write access to every Kebu
 * data surface: projects, products, orders, customers, analytics,
 * businesses, subscribers, discounts, sections.
 *
 * Auth: Bearer <MCP_BEARER_TOKEN> in the Authorization header.
 * DB:   Supabase service role key — bypasses RLS, full table access.
 *
 * Connect from Claude Code:
 *   claude mcp add kebu --transport http --url https://<your-domain>/api/mcp \
 *     --header "Authorization: Bearer $MCP_BEARER_TOKEN"
 *
 * Or add to .claude/settings.json:
 *   { "mcpServers": { "kebu": { "type": "http", "url": "...", "headers": { "Authorization": "Bearer ..." } } } }
 */

import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

// ─── Supabase service client (full access) ─────────────────────────────────

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key || url.includes("placeholder")) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ─── Auth ───────────────────────────────────────────────────────────────────

function authorized(req: NextRequest): boolean {
  const token = process.env.MCP_BEARER_TOKEN;
  if (!token) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${token}`;
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
  // Projects
  {
    name: "list_projects",
    description: "List all Kebu projects (shops + websites). Filter by project_type: 'shop' or 'website'.",
    inputSchema: {
      type: "object",
      properties: {
        project_type: { type: "string", enum: ["shop", "website"], description: "Filter by type" },
        owner_id: { type: "string", description: "Filter by owner user ID" },
        limit: { type: "number", description: "Max results (default 50)" },
      },
    },
  },
  {
    name: "get_project",
    description: "Get full details of a Kebu project by ID.",
    inputSchema: {
      type: "object",
      properties: { project_id: { type: "string", description: "Project UUID" } },
      required: ["project_id"],
    },
  },
  {
    name: "update_project",
    description: "Update a project's title, subdomain, or description.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        title: { type: "string" },
        subdomain: { type: "string" },
        description: { type: "string" },
      },
      required: ["project_id"],
    },
  },
  // Products
  {
    name: "list_products",
    description: "List all products in a shop.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Shop project UUID" },
        limit: { type: "number", description: "Max results (default 100)" },
        search: { type: "string", description: "Filter by name keyword" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_product",
    description: "Get a product and all its variants.",
    inputSchema: {
      type: "object",
      properties: { product_id: { type: "string" } },
      required: ["product_id"],
    },
  },
  {
    name: "create_product",
    description: "Create a new product in a shop.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        price_xof: { type: "number", description: "Price in XOF (West African CFA franc)" },
        price_label: { type: "string", description: "Display price e.g. '5 000 FCFA'" },
        category: { type: "string" },
        image_url: { type: "string" },
        in_stock: { type: "boolean", default: true },
      },
      required: ["project_id", "name"],
    },
  },
  {
    name: "update_product",
    description: "Update any fields of an existing product.",
    inputSchema: {
      type: "object",
      properties: {
        product_id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        price_xof: { type: "number" },
        price_label: { type: "string" },
        category: { type: "string" },
        image_url: { type: "string" },
        in_stock: { type: "boolean" },
        is_active: { type: "boolean" },
      },
      required: ["product_id"],
    },
  },
  {
    name: "delete_product",
    description: "Delete a product by ID.",
    inputSchema: {
      type: "object",
      properties: { product_id: { type: "string" } },
      required: ["product_id"],
    },
  },
  // Orders
  {
    name: "list_orders",
    description: "List orders for a shop. Filter by status: pending | paid | fulfilled | cancelled.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        status: { type: "string", enum: ["pending", "paid", "fulfilled", "cancelled"] },
        limit: { type: "number", description: "Max results (default 100)" },
        since: { type: "string", description: "ISO date — only orders after this date" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_order",
    description: "Get full details of an order including line items and customer info.",
    inputSchema: {
      type: "object",
      properties: { order_id: { type: "string" } },
      required: ["order_id"],
    },
  },
  {
    name: "update_order_status",
    description: "Update an order's status (mark paid, fulfilled, or cancelled).",
    inputSchema: {
      type: "object",
      properties: {
        order_id: { type: "string" },
        status: { type: "string", enum: ["pending", "paid", "fulfilled", "cancelled"] },
        note: { type: "string", description: "Optional internal note" },
      },
      required: ["order_id", "status"],
    },
  },
  // Customers
  {
    name: "list_customers",
    description: "List customers who have placed orders in a shop.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        limit: { type: "number", description: "Max results (default 100)" },
        search: { type: "string", description: "Filter by name or phone" },
      },
      required: ["project_id"],
    },
  },
  {
    name: "get_customer",
    description: "Get a customer's details and order history.",
    inputSchema: {
      type: "object",
      properties: { customer_id: { type: "string" } },
      required: ["customer_id"],
    },
  },
  // Analytics
  {
    name: "get_analytics",
    description: "Get shop analytics: orders, revenue (XOF), pageviews, by-day breakdown for a time period.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        days: { type: "number", description: "Look-back window in days (1, 7, 30, or 365). Default 30." },
      },
      required: ["project_id"],
    },
  },
  // Businesses
  {
    name: "list_businesses",
    description: "List all Kebu business profiles.",
    inputSchema: {
      type: "object",
      properties: {
        owner_id: { type: "string", description: "Filter by owner user ID" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_business",
    description: "Get full business profile by ID.",
    inputSchema: {
      type: "object",
      properties: { business_id: { type: "string" } },
      required: ["business_id"],
    },
  },
  {
    name: "update_business",
    description: "Update a business profile (name, description, phone, address, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        business_id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        phone: { type: "string" },
        whatsapp: { type: "string" },
        city: { type: "string" },
        country: { type: "string" },
        category: { type: "string" },
        website_url: { type: "string" },
      },
      required: ["business_id"],
    },
  },
  // Subscribers
  {
    name: "list_subscribers",
    description: "List email/WhatsApp subscribers for a project.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        limit: { type: "number" },
      },
      required: ["project_id"],
    },
  },
  // Discounts
  {
    name: "list_discounts",
    description: "List discount codes for a shop.",
    inputSchema: {
      type: "object",
      properties: { project_id: { type: "string" } },
      required: ["project_id"],
    },
  },
  {
    name: "create_discount",
    description: "Create a discount code for a shop.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        code: { type: "string", description: "e.g. PROMO20" },
        percent_off: { type: "number", description: "Percentage discount (0–100)" },
        max_uses: { type: "number", description: "Maximum number of uses (omit for unlimited)" },
        expires_at: { type: "string", description: "ISO date expiry (omit for no expiry)" },
      },
      required: ["project_id", "code", "percent_off"],
    },
  },
  // Builder / Sections
  {
    name: "list_sections",
    description: "List builder sections (content blocks) for a site page.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        page_id: { type: "string", description: "Page UUID (omit for homepage)" },
      },
      required: ["project_id"],
    },
  },
  // Users
  {
    name: "list_users",
    description: "List Kebu users (for admin/support use).",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Filter by email" },
        limit: { type: "number" },
      },
    },
  },
];

// ─── Tool handlers ───────────────────────────────────────────────────────────

type Args = Record<string, unknown>;

async function executeTool(name: string, args: Args): Promise<unknown> {
  const sb = serviceClient();
  if (!sb) throw new Error("Database not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");

  switch (name) {
    // ── Projects ──────────────────────────────────────────────────────────
    case "list_projects": {
      let q = sb
        .from("projects")
        .select("id, title, project_type, subdomain, owner_id, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(Number(args.limit ?? 50));
      if (args.project_type) q = q.eq("project_type", String(args.project_type));
      if (args.owner_id) q = q.eq("owner_id", String(args.owner_id));
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    }

    case "get_project": {
      const { data, error } = await sb
        .from("projects")
        .select("*")
        .eq("id", String(args.project_id))
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    case "update_project": {
      const { project_id, ...fields } = args;
      const { data, error } = await sb
        .from("projects")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", String(project_id))
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    // ── Products ──────────────────────────────────────────────────────────
    case "list_products": {
      let q = sb
        .from("products")
        .select("id, name, description, price_label, price_xof, category, image_url, in_stock, is_active, created_at")
        .eq("project_id", String(args.project_id))
        .order("created_at", { ascending: false })
        .limit(Number(args.limit ?? 100));
      if (args.search) q = q.ilike("name", `%${args.search}%`);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    }

    case "get_product": {
      const [product, variants] = await Promise.all([
        sb.from("products").select("*").eq("id", String(args.product_id)).single(),
        sb.from("product_variants").select("*").eq("product_id", String(args.product_id)).order("position"),
      ]);
      if (product.error) throw new Error(product.error.message);
      return { ...product.data, variants: variants.data ?? [] };
    }

    case "create_product": {
      const { project_id, ...rest } = args;
      const { data, error } = await sb
        .from("products")
        .insert({ project_id: String(project_id), ...rest, is_active: true })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    case "update_product": {
      const { product_id, ...fields } = args;
      const { data, error } = await sb
        .from("products")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", String(product_id))
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    case "delete_product": {
      const { error } = await sb.from("products").delete().eq("id", String(args.product_id));
      if (error) throw new Error(error.message);
      return { deleted: true, product_id: args.product_id };
    }

    // ── Orders ────────────────────────────────────────────────────────────
    case "list_orders": {
      let q = sb
        .from("orders")
        .select(
          "id, status, total_xof, currency, customer_name, customer_phone, customer_email, source, created_at, updated_at"
        )
        .eq("project_id", String(args.project_id))
        .order("created_at", { ascending: false })
        .limit(Number(args.limit ?? 100));
      if (args.status) q = q.eq("status", String(args.status));
      if (args.since) q = q.gte("created_at", String(args.since));
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    }

    case "get_order": {
      const [order, items] = await Promise.all([
        sb.from("orders").select("*").eq("id", String(args.order_id)).single(),
        sb.from("order_items").select("*").eq("order_id", String(args.order_id)),
      ]);
      if (order.error) throw new Error(order.error.message);
      return { ...order.data, items: items.data ?? [] };
    }

    case "update_order_status": {
      const updates: Record<string, unknown> = {
        status: String(args.status),
        updated_at: new Date().toISOString(),
      };
      if (args.note) updates.internal_note = String(args.note);
      if (args.status === "paid") updates.paid_at = new Date().toISOString();
      if (args.status === "fulfilled") updates.fulfilled_at = new Date().toISOString();
      const { data, error } = await sb
        .from("orders")
        .update(updates)
        .eq("id", String(args.order_id))
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    // ── Customers ─────────────────────────────────────────────────────────
    case "list_customers": {
      let q = sb
        .from("customers")
        .select("id, name, phone, email, order_count, total_spent_xof, created_at")
        .eq("project_id", String(args.project_id))
        .order("created_at", { ascending: false })
        .limit(Number(args.limit ?? 100));
      if (args.search) {
        q = q.or(`name.ilike.%${args.search}%,phone.ilike.%${args.search}%`);
      }
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    }

    case "get_customer": {
      const [customer, orders] = await Promise.all([
        sb.from("customers").select("*").eq("id", String(args.customer_id)).single(),
        sb
          .from("orders")
          .select("id, status, total_xof, created_at")
          .eq("customer_id", String(args.customer_id))
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      if (customer.error) throw new Error(customer.error.message);
      return { ...customer.data, recent_orders: orders.data ?? [] };
    }

    // ── Analytics ─────────────────────────────────────────────────────────
    case "get_analytics": {
      const days = Number(args.days ?? 30);
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const { data: orders, error } = await sb
        .from("orders")
        .select("id, status, total_xof, created_at")
        .eq("project_id", String(args.project_id))
        .gte("created_at", since);
      if (error) throw new Error(error.message);
      const all = orders ?? [];
      const paid = all.filter((o) => o.status === "paid" || o.status === "fulfilled");
      const revenue = paid.reduce((sum, o) => sum + (Number(o.total_xof) || 0), 0);
      return {
        period_days: days,
        total_orders: all.length,
        paid_orders: paid.length,
        revenue_xof: revenue,
        revenue_label: `${revenue.toLocaleString("fr-FR")} FCFA`,
        conversion_rate_pct: all.length ? Math.round((paid.length / all.length) * 100) : 0,
        orders_by_status: {
          pending: all.filter((o) => o.status === "pending").length,
          paid: paid.length,
          cancelled: all.filter((o) => o.status === "cancelled").length,
        },
      };
    }

    // ── Businesses ────────────────────────────────────────────────────────
    case "list_businesses": {
      let q = sb
        .from("businesses")
        .select("id, name, category, city, country, phone, owner_id, created_at")
        .order("created_at", { ascending: false })
        .limit(Number(args.limit ?? 50));
      if (args.owner_id) q = q.eq("owner_id", String(args.owner_id));
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    }

    case "get_business": {
      const { data, error } = await sb
        .from("businesses")
        .select("*")
        .eq("id", String(args.business_id))
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    case "update_business": {
      const { business_id, ...fields } = args;
      const { data, error } = await sb
        .from("businesses")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", String(business_id))
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    // ── Subscribers ───────────────────────────────────────────────────────
    case "list_subscribers": {
      const { data, error } = await sb
        .from("newsletter_subscribers")
        .select("id, email, phone, source, created_at")
        .eq("project_id", String(args.project_id))
        .order("created_at", { ascending: false })
        .limit(Number(args.limit ?? 200));
      if (error) throw new Error(error.message);
      return data;
    }

    // ── Discounts ─────────────────────────────────────────────────────────
    case "list_discounts": {
      const { data, error } = await sb
        .from("discounts")
        .select("*")
        .eq("project_id", String(args.project_id))
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    }

    case "create_discount": {
      const { data, error } = await sb
        .from("discounts")
        .insert({
          project_id: String(args.project_id),
          code: String(args.code).toUpperCase(),
          percent_off: Number(args.percent_off),
          max_uses: args.max_uses ? Number(args.max_uses) : null,
          expires_at: args.expires_at ? String(args.expires_at) : null,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }

    // ── Builder sections ──────────────────────────────────────────────────
    case "list_sections": {
      let q = sb
        .from("sections")
        .select("id, type, props, position, page_id, created_at")
        .eq("project_id", String(args.project_id))
        .order("position");
      if (args.page_id) q = q.eq("page_id", String(args.page_id));
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    }

    // ── Users (admin) ─────────────────────────────────────────────────────
    case "list_users": {
      let q = sb.auth.admin.listUsers();
      const { data, error } = await q;
      if (error) throw new Error((error as { message: string }).message);
      let users = data.users;
      if (args.email) {
        const needle = String(args.email).toLowerCase();
        users = users.filter((u) => u.email?.toLowerCase().includes(needle));
      }
      const limit = Number(args.limit ?? 50);
      return users.slice(0, limit).map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }));
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── JSON-RPC helpers ────────────────────────────────────────────────────────

function ok(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: "2.0", id, result }, { headers: corsHeaders() });
}

function err(id: unknown, code: number, message: string) {
  return Response.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { status: code === -32001 ? 401 : 200, headers: corsHeaders() }
  );
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// ─── Route handlers ──────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

/** Discovery endpoint — returns server info without auth required. */
export async function GET() {
  return Response.json(
    {
      name: "kebu",
      version: "1.0.0",
      description: "Kebu MCP server — full read/write access to shops, products, orders, customers, analytics, and more.",
      protocolVersion: "2024-11-05",
      auth: "Bearer token required (Authorization: Bearer <MCP_BEARER_TOKEN>)",
      tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
      connect: {
        claude_code: "claude mcp add kebu --transport http --url <YOUR_DOMAIN>/api/mcp --header 'Authorization: Bearer <TOKEN>'",
        settings_json: {
          mcpServers: {
            kebu: {
              type: "http",
              url: "<YOUR_DOMAIN>/api/mcp",
              headers: { Authorization: "Bearer <MCP_BEARER_TOKEN>" },
            },
          },
        },
      },
    },
    { headers: corsHeaders() }
  );
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return err(null, -32001, "Unauthorized — set Authorization: Bearer <MCP_BEARER_TOKEN>");
  }

  let body: { id?: unknown; method?: unknown; params?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return err(null, -32700, "Parse error — request body must be JSON");
  }

  const { id = null, method, params } = body;

  try {
    switch (method) {
      case "initialize":
        return ok(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "kebu", version: "1.0.0" },
        });

      case "notifications/initialized":
        return ok(id, {});

      case "ping":
        return ok(id, {});

      case "tools/list":
        return ok(id, { tools: TOOLS });

      case "tools/call": {
        const p = (params ?? {}) as { name?: unknown; arguments?: unknown };
        const toolName = String(p.name ?? "");
        const toolArgs = (p.arguments ?? {}) as Args;
        if (!toolName) return err(id, -32602, "Missing tool name");

        const result = await executeTool(toolName, toolArgs);
        return ok(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        });
      }

      case "resources/list":
        return ok(id, { resources: [] });

      case "prompts/list":
        return ok(id, { prompts: [] });

      default:
        return err(id, -32601, `Method not found: ${String(method)}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return err(id, -32603, msg);
  }
}
