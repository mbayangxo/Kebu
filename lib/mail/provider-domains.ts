export type ProviderDnsRecord = {
  record?: string;
  name?: string;
  type?: string;
  ttl?: string | number;
  status?: string;
  value?: string;
  priority?: number;
};

export type ProviderDomainState = {
  id: string;
  name: string;
  status: string;
  records: ProviderDnsRecord[];
};

function apiKey() {
  return process.env.RESEND_API_KEY?.trim() || null;
}

async function resendRequest(path: string, init?: RequestInit) {
  const key = apiKey();
  if (!key) throw new Error("Mail domain provider is not configured.");

  const response = await fetch("https://api.resend.com" + path, {
    ...init,
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof body.message === "string"
        ? body.message
        : typeof body.error === "string"
          ? body.error
          : "Mail domain provider rejected the request.";
    throw new Error(message);
  }
  return body;
}

export async function registerMailDomain(domain: string): Promise<ProviderDomainState> {
  const body = await resendRequest("/domains", {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });

  return {
    id: String(body.id ?? ""),
    name: String(body.name ?? domain),
    status: String(body.status ?? "pending"),
    records: Array.isArray(body.records) ? body.records as ProviderDnsRecord[] : [],
  };
}

export async function verifyMailDomain(providerDomainId: string) {
  await resendRequest("/domains/" + encodeURIComponent(providerDomainId) + "/verify", { method: "POST" });
  return getMailDomain(providerDomainId);
}

export async function getMailDomain(providerDomainId: string): Promise<ProviderDomainState> {
  const body = await resendRequest("/domains/" + encodeURIComponent(providerDomainId));
  return {
    id: String(body.id ?? providerDomainId),
    name: String(body.name ?? ""),
    status: String(body.status ?? "pending"),
    records: Array.isArray(body.records) ? body.records as ProviderDnsRecord[] : [],
  };
}
