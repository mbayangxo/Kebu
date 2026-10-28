-- Align canonical editing and direction with website-v1's existing 20-page limit.
-- Preserve the complete installed RPC bodies, privileges and security settings.
do $$
declare body text; updated text;
begin
  body := pg_get_functiondef('public.kcd__apply(uuid,jsonb)'::regprocedure);
  updated := replace(replace(body,
    'where project_id=p_project_id) >= 12', 'where project_id=p_project_id) >= 20'),
    'Maximum 12 pages per site', 'Maximum 20 pages per site');
  if updated = body or position('where project_id=p_project_id) >= 20' in updated) = 0 then
    raise exception 'Unexpected canonical page-limit definition';
  end if;
  execute updated;

  body := pg_get_functiondef('public.valid_experience_dna(jsonb)'::regprocedure);
  updated := replace(body, 'jsonb_array_length(p->''pages'') not between 1 and 12',
    'jsonb_array_length(p->''pages'') not between 1 and 20');
  if updated = body then raise exception 'Unexpected direction page-limit definition'; end if;
  execute updated;
end $$;
