-- Add optional frame properties to existing collage responsive metadata only.
-- No authored rows, grants, RLS or RPC contracts change. Production unapplied.
update public.kcd_node_types
set overridable = (
  select array_agg(distinct key order by key)
  from unnest(overridable || array['layerFrameAspectRatio', 'layerFrameFit']::text[]) as keys(key)
)
where type = 'legacy-section:legally-blonde-hero' and version = 1;
