import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { generationHash } from "./hash";
import type { GenerationRun } from "./contracts";
export function previewToken(run: GenerationRun) {
  const secret = process.env.CREATIVE_PREVIEW_SECRET;
  if (!secret || secret.length < 32) throw new Error("Private preview signing is not configured.");
  return createHmac("sha256", secret).update(`${run.id}:${run.revision}:${generationHash(run.data.candidate)}`).digest("hex");
}
export function validPreviewToken(run: GenerationRun, token: string | null) {
  if (!token || !/^[a-f0-9]{64}$/.test(token) || run.state !== "working" || !run.lease_until || Date.parse(run.lease_until) <= Date.now()) return false;
  const expected = Buffer.from(previewToken(run)); const supplied = Buffer.from(token);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
