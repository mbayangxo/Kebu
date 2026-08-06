# Kebu Create Mode — Slice 1

## What shipped

Authenticated users can:

1. Open `/create`
2. Create a blank **website** project (Postgres)
3. Open `/create/[id]`
4. Add a **hero** section
5. Edit heading / subheading / button — **autosaves** to `project_sections.props`
6. Refresh — data remains
7. Another user cannot load the project (RLS + API 404)

## Apply migration (required for production)

In Supabase SQL editor (or CLI), run:

`supabase/migrations/004_create_projects.sql`

Until this is applied, APIs return a clear 500 explaining the table is missing.

## Routes

| Method | Path | Auth |
|--------|------|------|
| GET/POST | `/api/projects` | Required |
| GET | `/api/projects/[id]` | Owner only |
| POST/PATCH | `/api/projects/[id]/sections` | Owner only |

## Not in this slice

Block reorder/delete UI, templates, AI generation, publish/subdomain, stores, K21.
