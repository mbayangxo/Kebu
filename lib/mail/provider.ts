export type MailProviderAttachment = {
  filename: string;
  contentBase64: string;
  contentType?: string;
};

export type MailProviderName = "resend";

export type MailSendInput = {
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  text: string;
  attachments?: MailProviderAttachment[];
  replyTo?: string[];
};

export type MailSendResult =
  | { ok: true; provider: MailProviderName; providerMessageId: string }
  | { ok: false; provider: MailProviderName; reason: string; retryable: boolean };

export async function sendInternetMail(
  input: MailSendInput,
  provider: MailProviderName = "resend",
): Promise<MailSendResult> {
  if (provider !== "resend") {
    return { ok: false, provider: "resend", reason: "Unsupported mail provider.", retryable: false };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      provider,
      reason: "Internet mail provider is not configured.",
      retryable: false,
    };
  }

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
        reply_to: input.replyTo ?? [],
        attachments: (input.attachments ?? []).map((attachment) => ({
          filename: attachment.filename,
          content: attachment.contentBase64,
          content_type: attachment.contentType,
        })),
      }),
    });

    const body = await response.json().catch(() => ({})) as {
      id?: string;
      message?: string;
      statusCode?: number;
    };

    if (!response.ok || !body.id) {
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      return {
        ok: false,
        provider,
        reason: body.message || "Mail provider rejected the message.",
        retryable,
      };
    }

    return { ok: true, provider, providerMessageId: body.id };
  } catch {
    return {
      ok: false,
      provider,
      reason: "Mail provider network error.",
      retryable: true,
    };
  }
}
