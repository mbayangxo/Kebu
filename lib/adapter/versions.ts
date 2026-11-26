/**
 * Explicit version constants for every contract and IR type in the Aesthetic Adapter.
 *
 * Version these separately so each concern can evolve independently.
 * Consumers should store the version at serialization time and check it on
 * deserialization to detect schema drift before it becomes a silent data loss.
 */

export const ADAPTER_VERSION = "1.0.0" as const;

/** AestheticContractV1 schema version */
export const AESTHETIC_CONTRACT_VERSION = "1" as const;

/** AdapterDesignIR schema version */
export const IR_VERSION = "1" as const;

/** MotionSpec / MotionContractV1 schema version */
export const MOTION_CONTRACT_VERSION = "1" as const;

/** FontContractV1 schema version */
export const FONT_CONTRACT_VERSION = "1" as const;

/** CustomComponentSpec schema version */
export const CUSTOM_COMPONENT_CONTRACT_VERSION = "1" as const;

/** DesignProvenance schema version */
export const PROVENANCE_VERSION = "1" as const;

export type AdapterVersion = typeof ADAPTER_VERSION;
export type AestheticContractVersion = typeof AESTHETIC_CONTRACT_VERSION;
export type IRVersion = typeof IR_VERSION;
export type MotionContractVersion = typeof MOTION_CONTRACT_VERSION;
export type FontContractVersion = typeof FONT_CONTRACT_VERSION;
