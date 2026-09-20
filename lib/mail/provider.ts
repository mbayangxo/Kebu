export type MailSendInput = {
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
};

export type MailSendResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; reason: string };

export async function sendInternetMail(input: MailSendInput): Promise<MailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: "Internet mail provider is not configured." };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        cc: input.cc ?? [],
        subject: input.subject,
        text: input.text,
      }),
    });
    const body = await response.json().catch(() => ({})) as { id?: string; message?: string };
    if (!response.ok || !body.id) {
      return { ok: false, reason: body.message || "Mail provider rejected the message." };
    }
    return { ok: true, providerMessageId: body.id };
  } catch {
    return { ok: false, reason: "Mail provider network error." };
  }
}
