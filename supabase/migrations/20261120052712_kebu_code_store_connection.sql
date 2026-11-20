-- Owner-bound development connection; does not grant order or inventory mutations.
ALTER TABLE public.kebu_code_workspaces
  ADD COLUMN store_project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
GRANT UPDATE (store_project_id) ON public.kebu_code_workspaces TO authenticated;

CREATE POLICY code_store_owner_check ON public.kebu_code_workspaces AS RESTRICTIVE
  FOR UPDATE TO authenticated USING (true) WITH CHECK (
    store_project_id IS NULL OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = store_project_id AND p.owner_id = (SELECT auth.uid()) AND p.project_type = 'store'
    )
  );
