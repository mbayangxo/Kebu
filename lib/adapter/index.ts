/**
 * Aesthetic Adapter — Phase 1 + Phase 2 public API.
 *
 * Phase 1: contract types, schemas, validators.
 * Phase 2: IR → WebsiteDefinition compiler, capability negotiation, gap report.
 */

// Versions
export {
  ADAPTER_VERSION,
  AESTHETIC_CONTRACT_VERSION,
  IR_VERSION,
  MOTION_CONTRACT_VERSION,
  FONT_CONTRACT_VERSION,
  CUSTOM_COMPONENT_CONTRACT_VERSION,
  PROVENANCE_VERSION,
  type AdapterVersion,
  type AestheticContractVersion,
  type IRVersion,
  type MotionContractVersion,
  type FontContractVersion,
} from "./versions";

// Motion
export {
  transformStateSchema,
  scrollRelationshipSchema,
  loopingSchema,
  hoverBehaviorSchema,
  reducedMotionFallbackSchema,
  nativePrimitiveSchema,
  motionCompilationPathSchema,
  deviceMotionOverrideSchema,
  motionSpecSchema,
  motionContractV1Schema,
  type TransformState,
  type ScrollRelationship,
  type Looping,
  type HoverBehavior,
  type ReducedMotionFallback,
  type NativePrimitive,
  type MotionCompilationPath,
  type DeviceMotionOverride,
  type MotionSpec,
  type MotionContractV1,
} from "./motion";

// Assets
export {
  assetLicenseSchema,
  assetProvenanceSchema,
  assetTypeSchema,
  assetSpecSchema,
  type AssetLicense,
  type AssetProvenance,
  type AssetType,
  type AssetSpec,
} from "./assets";

// Fonts
export {
  fontSourceSchema,
  fontLicenseSchema,
  fontRoleSchema,
  fontLoadingStrategySchema,
  fontContractV1Schema,
  KEBU_BUNDLED_FONTS,
  isKebuBundledFont,
  type FontSource,
  type FontLicense,
  type FontRole,
  type FontLoadingStrategy,
  type FontContractV1,
  type KebuBundledFont,
} from "./fonts";

// Diagnostics
export {
  diagnosticSeveritySchema,
  DIAGNOSTIC_CODES,
  diagnosticCodeSchema,
  diagnosticLocationSchema,
  diagnosticEntrySchema,
  diagnosticReportSchema,
  buildDiagnosticReport,
  emptyDiagnosticReport,
  makeDiagnostic,
  type DiagnosticSeverity,
  type DiagnosticCode,
  type DiagnosticLocation,
  type DiagnosticEntry,
  type DiagnosticReport,
} from "./diagnostics";

// Components
export {
  htmlTrustLevelSchema,
  cssTrustLevelSchema,
  jsTrustLevelSchema,
  reactTrustLevelSchema,
  permittedCapabilitySchema,
  customComponentSecuritySchema,
  componentCompilationPathSchema,
  interactiveSpecSchema,
  customComponentSpecSchema,
  isComponentBlocked,
  isMaterialAndBlocked,
  type PermittedCapability,
  type CustomComponentSecurity,
  type ComponentCompilationPath,
  type InteractiveSpec,
  type CustomComponentSpec,
} from "./components";

// Certification
export {
  fidelityDimensionSchema,
  fidelityResultSchema,
  fidelityEntrySchema,
  certificationStatusLabelSchema,
  certificationStatusSchema,
  allFidelityPass,
  failedFidelity,
  pendingCertification,
  type FidelityDimension,
  type FidelityResult,
  type FidelityEntry,
  type CertificationStatusLabel,
  type CertificationStatus,
} from "./certification";

// Provenance
export {
  sourceTypeSchema,
  transformationEntrySchema,
  designProvenanceSchema,
  type SourceType,
  type TransformationEntry,
  type DesignProvenance,
} from "./provenance";

// IR and contracts
export {
  OWNER_PORTFOLIO_SECTION_TYPES,
  isOwnerPortfolioType,
  capabilityClassificationSchema,
  capabilityNameSchema,
  capabilityDeclarationSchema,
  capabilityOverflowSchema,
  accessibilityMetadataSchema,
  responsiveVisibilitySchema,
  irFlatSectionSchema,
  irDeviceCompositionSchema,
  irSectionSchema,
  irPageSchema,
  colorSystemSchema,
  adapterDesignIRSchema,
  aestheticContractSectionSchema,
  aestheticContractPageSchema,
  aestheticContractV1Schema,
  type OwnerPortfolioSectionType,
  type CapabilityClassification,
  type CapabilityName,
  type CapabilityDeclaration,
  type CapabilityOverflow,
  type AccessibilityMetadata,
  type ResponsiveVisibility,
  type IRFlatSection,
  type IRDeviceComposition,
  type IRSection,
  type IRPage,
  type ColorSystem,
  type AdapterDesignIR,
  type AestheticContractSection,
  type AestheticContractPage,
  type AestheticContractV1,
} from "./ir";

// Validators
export {
  validateMotionSpec,
  validateMotionContractV1,
  validateFontContractV1,
  validateAssetSpec,
  validateCustomComponentSpec,
  validateIRSection,
  validateAdapterDesignIR,
  validateAestheticContractV1,
  detectHostileContent,
  safeParseJson,
  type ValidationResult,
} from "./validate";

// ── Phase 2: Compiler ──────────────────────────────────────────────────────────

// Compilation report types
export {
  compilationBehaviorSchema,
  capabilityCompilationEntrySchema,
  extensionRequirementSchema,
  compilationReportSchema,
  type CompilationBehavior,
  type CapabilityCompilationEntry,
  type ExtensionRequirement,
  type CompilationReport,
  type CompilationResult,
} from "./compile-report";

// Capability negotiation
export {
  TARGET_CAPABILITY_MAP,
  PROPOSED_EXTENSIONS,
  negotiateCapabilities,
  type CapabilityNegotiationResult,
} from "./compile-capabilities";

// Main compiler
export {
  COMPILER_VERSION,
  compileIR,
} from "./compile";

// Extensions gap report
export {
  buildGapReport,
  formatGapReport,
  type GapReportRow,
} from "./compile-extensions";
