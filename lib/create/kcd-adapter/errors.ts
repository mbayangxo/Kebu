/**
 * Adapter failures and lift reports.
 *
 * An `AdapterError` means the input cannot be represented losslessly and the adapter refuses
 * rather than drop data. A `LiftIssue` means the input was converted losslessly, but some
 * stored value is not valid in the model and therefore does not take effect through it.
 * The original value is kept verbatim and written back unchanged.
 */
export type AdapterErrorCode =
  | "invalid-input"
  | "invalid-id"
  | "duplicate-id"
  | "orphan-section"
  | "forbidden-key"
  | "unrepresentable-layout"
  | "unsupported-node";

export class AdapterError extends Error {
  readonly code: AdapterErrorCode;
  constructor(code: AdapterErrorCode, message: string) {
    super(message);
    this.name = "AdapterError";
    this.code = code;
  }
}

export interface LiftIssue {
  /** Node or page the value belongs to; absent for document-level values. */
  nodeId?: string;
  pageId?: string;
  /** Stored key, e.g. "_a11y" or "deviceOverrides.tablet". */
  field: string;
  message: string;
}
