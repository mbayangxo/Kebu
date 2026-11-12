-- Align the existing collage editor's responsive properties with SQL authority.
-- Additive registry metadata only: no authored props, rows, RPC contracts or RLS change.
-- Preserve every historical allowlist entry; application/schema validation still applies.
update public.kcd_node_types
set overridable = (
  select array_agg(distinct key order by key)
  from unnest(overridable || array['extraCutouts', 'layerScales', 'layerWidthScale', 'layerHeightScale', 'layerCrop', 'layerZIndex', 'layerOpacity', 'layerRotation', 'layerPositions', 'layerScroll', 'sceneVideos', 'showNavigation', 'lockedLayers', 'hiddenLayers', 'title', 'subtitle', 'titleAsText', 'titleTextFontFamily', 'titleTextFontSize', 'titleTextFontWeight', 'titleTextLetterSpacing', 'titleTextLineHeight', 'titleTextColor', 'sectionMinHeightPx', 'embeddedFooterPaddingTop', 'embeddedFooterPaddingBottom', 'navDisplay']::text[]) as keys(key)
)
where type = 'legacy-section:legally-blonde-hero' and version = 1;
