/** Parse an actual Supabase Cookie header supplied through private QA config. */
export function builderAuthCookies(header: string, baseUrl: string) {
  let origin: URL;
  try { origin = new URL(baseUrl); } catch { throw Error("Builder acceptance requires a valid QA origin."); }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/"
    || (origin.protocol !== "https:" && !(origin.protocol === "http:" && loopback))) {
    throw Error("Builder acceptance requires HTTPS or a loopback HTTP origin without credentials or query parameters.");
  }
  if (!header.trim() || /[\r\n]/.test(header)) throw Error("Supply an actual Supabase Cookie header through private QA configuration.");
  const seen = new Set<string>();
  const auth: { name: string; value: string; prefix: string; chunk?: number }[] = [];
  for (const part of header.replace(/^cookie:\s*/i, "").split(";")) {
    const index = part.indexOf("=");
    if (index < 1) throw Error("Invalid QA Cookie header; do not supply Set-Cookie attributes or an opaque token.");
    const name = part.slice(0, index).trim(), value = part.slice(index + 1).trim();
    if (seen.has(name)) throw Error("QA Cookie header contains duplicate cookie names.");
    seen.add(name);
    const match = /^(sb-[a-z0-9_-]+-auth-token)(?:\.(\d+))?$/i.exec(name);
    if (!match) continue;
    if (!value || Array.from(value).some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) >= 127 || ['"', ',', '\\'].includes(char))) {
      throw Error("Supabase QA session cookie is empty or malformed.");
    }
    auth.push({ name, value, prefix: match[1], chunk: match[2] === undefined ? undefined : Number(match[2]) });
  }
  if (!auth.length || new Set(auth.map(cookie => cookie.prefix)).size !== 1) {
    throw Error("Supply cookies for exactly one Supabase QA session; a cookie named session does not authenticate this app.");
  }
  if (auth.length > 1 || auth[0].chunk !== undefined) {
    const chunks = auth.map(cookie => cookie.chunk).sort((a, b) => (a ?? -1) - (b ?? -1));
    if (chunks.some((chunk, index) => chunk !== index)) throw Error("Supabase QA cookie chunks must be complete and contiguous from zero.");
  }
  // Do not forward unrelated cookies. Never put cookie values into errors/logs.
  return auth.map(({ name, value }) => ({ name, value, url: origin.origin, secure: origin.protocol === "https:", sameSite: "Lax" as const }));
}
