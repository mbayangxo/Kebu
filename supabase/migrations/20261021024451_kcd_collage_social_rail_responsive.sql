-- Align existing collage social fields with the ordinary responsive editor.
-- Registry metadata only; no authored rows, schemas, grants, RLS or RPC changes.
update public.kcd_node_types
set overridable = (
  select array_agg(distinct key order by key)
  from unnest(overridable || array['socialLinks', 'socialRailVisible', 'socialRailBg', 'socialRailLeftPct', 'socialRailTopPct', 'socialRailIconSize']::text[]) as keys(key)
)
where type = 'legacy-section:legally-blonde-hero' and version = 1;
