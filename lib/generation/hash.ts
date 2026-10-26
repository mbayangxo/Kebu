import { createHash } from "node:crypto";
import { canonicalStringify } from "@/lib/creative-core";
export function generationHash(value: unknown) { return createHash("sha256").update(canonicalStringify(value)).digest("hex"); }
