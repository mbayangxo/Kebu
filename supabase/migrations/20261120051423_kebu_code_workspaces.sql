-- Private, bounded source snapshots. Application saves compare the last reviewed revision.
CREATE TABLE public.kebu_code_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  files jsonb NOT NULL CHECK (jsonb_typeof(files) = 'object' AND octet_length(files::text) <= 50000),
  history jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(history) = 'array' AND jsonb_array_length(history) <= 8 AND octet_length(history::text) <= 410000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX kebu_code_workspaces_owner_updated ON public.kebu_code_workspaces(owner_id, updated_at DESC);
ALTER TABLE public.kebu_code_workspaces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kebu_code_workspaces FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.kebu_code_workspaces TO authenticated;
GRANT INSERT (title, files), UPDATE (files, revision, history, updated_at) ON public.kebu_code_workspaces TO authenticated;
CREATE POLICY code_owner_read ON public.kebu_code_workspaces FOR SELECT TO authenticated USING (owner_id = (select auth.uid()));
CREATE POLICY code_owner_create ON public.kebu_code_workspaces FOR INSERT TO authenticated WITH CHECK (owner_id = (select auth.uid()));
CREATE POLICY code_owner_save ON public.kebu_code_workspaces FOR UPDATE TO authenticated
  USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));
