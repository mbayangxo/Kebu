/** Bound request allocation before JSON parsing; never trust Content-Length alone. */
export async function readCompanyJson(
  req: Request,
  maxBytes = 200000,
): Promise<unknown> {
  if (!req.body) return null;
  const reader = req.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(chunk.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
