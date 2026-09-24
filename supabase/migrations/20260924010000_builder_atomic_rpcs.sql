-- Migration: atomic RPCs for builder section operations
-- Provides true transactional guarantees for undo/redo and section reorder.
--
-- Authorization model:
--   Builder projects are strictly owner-only (no per-project collaborators).
--   Legitimate non-owner access (team members, support admins) goes through
--   the API layer (assertProjectEditorAccess in lib/create/project-access.ts),
--   which uses the service_role client — so auth.uid() is NULL at the DB level.
--
--   Access paths:
--     1. Owner (authenticated user JWT):  auth.uid() = owner_id → ALLOWED
--     2. Team/support (service_role):     auth.uid() IS NULL   → ALLOWED
--                                          (API layer pre-validated access)
--     3. Stranger (authenticated user JWT, wrong owner): auth.uid() ≠ owner_id → REJECTED
--     4. Anonymous/revoked:               no EXECUTE grant on anon role → REJECTED
--
-- GRANT is to 'authenticated' and 'service_role' only; 'anon' is not granted.

-- ── batch_update_section_props ─────────────────────────────────────────────
-- Atomically update props on multiple sections belonging to a project.
-- All updates succeed or all roll back — no partial persistence.
-- Input: p_project_id UUID, p_updates JSONB array [{id, props}]
-- Returns: number of rows updated
CREATE OR REPLACE FUNCTION batch_update_section_props(
  p_project_id uuid,
  p_updates    jsonb
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry  jsonb;
  v_count  int := 0;
  v_rows   int;
BEGIN
  -- Ownership guard: rejects any authenticated user who does not own the project.
  -- auth.uid() IS NULL → service_role call from API layer (team/support access
  -- already validated by assertProjectEditorAccess); the guard passes through.
  -- auth.uid() IS NOT NULL → authenticated user; must own the project.
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'access denied: project % does not belong to caller', p_project_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  FOR v_entry IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE project_sections
    SET    props      = (v_entry->>'props')::jsonb,
           updated_at = now()
    WHERE  id         = (v_entry->>'id')::uuid
      AND  page_id IN (
             SELECT id FROM project_pages WHERE project_id = p_project_id
           );
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_count := v_count + v_rows;
  END LOOP;

  -- Touch project timestamp for cache-busting / updated_at propagation.
  UPDATE projects SET updated_at = now() WHERE id = p_project_id;

  RETURN v_count;
END;
$$;

-- ── reorder_sections ──────────────────────────────────────────────────────
-- Atomically assign dense sort_order (0-based) to a list of section IDs.
-- All writes occur in the same transaction; concurrent calls are serialised
-- by the FOR UPDATE lock on the affected rows.
-- Input: p_project_id UUID, p_ordered_ids uuid[]
-- Returns: number of rows updated
CREATE OR REPLACE FUNCTION reorder_sections(
  p_project_id uuid,
  p_ordered_ids uuid[]
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id    uuid;
  v_idx   int := 0;
  v_count int := 0;
  v_rows  int;
BEGIN
  -- Ownership guard: same semantics as batch_update_section_props above.
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'access denied: project % does not belong to caller', p_project_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Lock rows to prevent concurrent reorders from interleaving.
  PERFORM id
  FROM    project_sections
  WHERE   id = ANY(p_ordered_ids)
    AND   page_id IN (
            SELECT id FROM project_pages WHERE project_id = p_project_id
          )
  FOR UPDATE;

  FOREACH v_id IN ARRAY p_ordered_ids
  LOOP
    UPDATE project_sections
    SET    sort_order = v_idx,
           updated_at = now()
    WHERE  id         = v_id
      AND  page_id IN (
             SELECT id FROM project_pages WHERE project_id = p_project_id
           );
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_count := v_count + v_rows;
    v_idx   := v_idx + 1;
  END LOOP;

  UPDATE projects SET updated_at = now() WHERE id = p_project_id;

  RETURN v_count;
END;
$$;

-- Grant execute to authenticated and service_role only.
-- 'anon' is deliberately excluded — unauthenticated callers cannot call these RPCs.
GRANT EXECUTE ON FUNCTION batch_update_section_props(uuid, jsonb)      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION reorder_sections(uuid, uuid[])               TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION batch_update_section_props(uuid, jsonb)     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reorder_sections(uuid, uuid[])              FROM PUBLIC;
