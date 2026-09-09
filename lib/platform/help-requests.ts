import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const HELP_REQUEST_STATUSES = ["open", "in_progress", "helped", "closed"] as const;
export type HelpRequestStatus = (typeof HELP_REQUEST_STATUSES)[number];

export const helpRequestCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().min(8).max(24).optional(),
    )
    .optional(),
  subject: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(4000),
  source: z.enum(["contact", "help", "in_app", "email"]).optional().default("contact"),
});

export type HelpRequestCreateInput = z.infer<typeof helpRequestCreateSchema>;

export async function createHelpRequest(
  admin: SupabaseClient,
  input: HelpRequestCreateInput,
  userId?: string | null,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await admin
    .from("help_requests")
    .insert({
      user_id: userId ?? null,
      name: input.name,
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      subject: input.subject,
      body: input.body,
      source: input.source ?? "contact",
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message?.includes("help_requests")
        ? "Apply migration 083_help_requests_cron_runs.sql."
        : "Could not save help request.",
    };
  }
  return { ok: true, id: data.id as string };
}

export function isHelpedStatus(status: string): boolean {
  return status === "helped" || status === "closed";
}
