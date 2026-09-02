/** Send one marketing email via Resend (requires RESEND_API_KEY + verified from domain). */
export async function sendCampaignEmail(opts: {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from =
    opts.fromName && opts.fromName.trim()
      ? `${opts.fromName.trim()} <${opts.from.replace(/^.*<|>.*$/g, "") || opts.from}>`
      : opts.from;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      reply_to: opts.replyTo,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });

  return res.ok;
}
