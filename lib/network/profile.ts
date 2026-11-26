import { z } from "zod";
import { NETWORK_NEEDS } from "./types";

const text = (max: number) => z.string().trim().min(1).max(max);
export const networkProfileInput = z.object({
  name: text(120),
  location: text(160),
  country: text(80),
  sector: text(100),
  headline: text(240),
  building: text(3000),
  offering: text(3000),
  looking_for: z.array(z.enum(NETWORK_NEEDS)).min(1).max(NETWORK_NEEDS.length)
    .transform(values => [...new Set(values)]),
  stage: z.enum(["Idea", "Early stage", "Growing", "Established"]),
  languages: z.array(text(60)).max(20).transform(values => [...new Set(values)]),
}).strict();

export type NetworkProfileInput = z.infer<typeof networkProfileInput>;
export const networkProfileSubmission = networkProfileInput.extend({ submission_id: z.uuid() });
export const DIRECTORY_FIELDS =
  "id,name,initials,location,country,sector,headline,building,offering,looking_for,stage,languages";
