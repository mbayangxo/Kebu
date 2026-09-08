import { SAMPLE_OPPORTUNITIES } from "@/lib/data/sample-opportunities";
import type { Opportunity } from "@/lib/types";

/** Admin seed set — curated programs with sources (not the full legacy sample file). */
export const CURATED_OPPORTUNITY_SEED: Opportunity[] = SAMPLE_OPPORTUNITIES.slice(0, 5);
