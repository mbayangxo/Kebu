import { z } from "zod";
import { brandBrainRecordSchema } from "./brand-brain";
export const brandBrainBindingSchema = z.strictObject({
  projectId:z.string().uuid(), profileId:z.string().uuid().nullable(),
  revision:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
});
export type BrandBrainBinding = z.infer<typeof brandBrainBindingSchema>;
export const brandBrainBindingResponseSchema = z.object({binding:brandBrainBindingSchema,record:brandBrainRecordSchema.nullable(),unavailable:z.boolean()});
export function bindingFromRow(projectId:string,row:Record<string,unknown>|null) {
  return brandBrainBindingSchema.parse({projectId,profileId:row?.profile_id??null,revision:row?.revision??0});
}
