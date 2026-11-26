/**
 * Builder ⇄ Kebu Creative Core adapter (3C freeze §10). The only place where 3B storage shapes
 * (rows, website-v1) meet the renderer-agnostic document model.
 */
export { AdapterError, type AdapterErrorCode, type LiftIssue } from "./errors";
export { KCD_ADAPTER_NAMESPACE, mintAnonymousSectionId, mintPageId, mintSectionId, uuidV5 } from "./ids";
export { builderRegistry, legacyDefinition, LEGACY_DEFINITIONS, type LegacySectionType } from "./legacy-registry";
export { liftStoredProps, repackStoredProps, sectionFieldsOf, type SectionFields } from "./stored-props";
export { legacyOfDocument, legacyOfNode, legacyOfPage, type LegacyNodeData, type LegacyOrigin } from "./legacy";
export {
  CHROME_PARTS,
  canonicalSiteChrome,
  chromeFor,
  chromeRootOptions,
  chromeSuppressedIds,
  composeKcdPage,
  isChromeProjection,
  pageRenderRoots,
  type CanonicalChrome,
} from "./chrome";
export { documentToRows, rowsToDocument, type AdapterResult, type PageRow, type ProjectRow, type ProjectRows, type SectionRow } from "./rows";
export { documentToWebsiteV1, websiteV1ToDocument } from "./website-v1";
export { WEB_DOM_MANIFEST, kcdRenderDefinition } from "./render-view";
export { builderKcdView, type BuilderParts, type BuilderView } from "./builder-view";
