-- Document projects use the same owner identity and revision workflow as Code.
CREATE TABLE public.kebu_code_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  content text NOT NULL DEFAULT '' CHECK (octet_length(content) <= 24000),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  history jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(history) = 'array' AND jsonb_array_length(history) <= 8 AND octet_length(history::text) <= 410000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX kebu_code_documents_owner_updated ON public.kebu_code_documents(owner_id, updated_at DESC, id);
ALTER TABLE public.kebu_code_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kebu_code_documents FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.kebu_code_documents TO authenticated;
GRANT INSERT (title), UPDATE (content, revision, history, updated_at) ON public.kebu_code_documents TO authenticated;
CREATE POLICY code_document_read ON public.kebu_code_documents FOR SELECT TO authenticated USING (owner_id = (select auth.uid()));
CREATE POLICY code_document_create ON public.kebu_code_documents FOR INSERT TO authenticated WITH CHECK (owner_id = (select auth.uid()));
CREATE POLICY code_document_save ON public.kebu_code_documents FOR UPDATE TO authenticated USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));
CREATE POLICY code_document_delete ON public.kebu_code_documents FOR DELETE TO authenticated USING (owner_id = (select auth.uid()));
-- Supabase anonymous sign-ins also carry the authenticated Postgres role.
CREATE POLICY code_document_permanent_accounts ON public.kebu_code_documents AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false')
  WITH CHECK (coalesce((select auth.jwt())->>'is_anonymous', 'false') = 'false');
