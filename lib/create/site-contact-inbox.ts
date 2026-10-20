import { z } from "zod";

export type SiteContactMessage = {
  id: string; section_id: string; form_name: string;
  payload: Record<string, string>; submitter_email: string | null;
  submitter_name: string | null; submitter_phone: string | null; created_at: string;
};
const email = z.string().trim().email().max(254).refine(value => !/[\r\n]/.test(value));
export function contactReplyLinks(message: SiteContactMessage): { kebu: string; email: string } | null {
  const parsed = email.safeParse(message.submitter_email);
  if (!parsed.success) return null;
  const subject = `Re: ${message.form_name || "Website enquiry"}`.replace(/[\r\n]/g, " ").slice(0, 240);
  return {
    kebu: `/email?${new URLSearchParams({ composeTo: parsed.data, composeSubject: subject })}`,
    email: `mailto:${encodeURIComponent(parsed.data)}?subject=${encodeURIComponent(subject)}`,
  };
}
export function mailComposeFromParams(params: { get: (key: string) => string | null }): { to: string; subject: string } | null {
  const parsed = email.safeParse(params.get("composeTo"));
  if (!parsed.success) return null;
  return { to: parsed.data, subject: (params.get("composeSubject") ?? "").replace(/[\r\n]/g, " ").slice(0, 240) };
}
