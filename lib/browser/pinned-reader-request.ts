import { request as requestHttp } from "node:http";
import { request as requestHttps, type RequestOptions } from "node:https";
import { isIP } from "node:net";
import type { SafePublicTarget } from "@/lib/browser/url-safety";

export const READER_MAX_BYTES = 1_500_000;
const READER_TIMEOUT_MS = 10_000;

export type PinnedReaderResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Uint8Array;
};

export function createPinnedRequestOptions(
  target: SafePublicTarget,
  address = target.addresses[0],
): RequestOptions {
  if (!address) throw new Error("URL did not resolve to a public address.");
  const { url } = target;
  return {
    protocol: url.protocol,
    hostname: address.address,
    family: address.family,
    port: url.protocol === "https:" ? 443 : 80,
    method: "GET",
    path: `${url.pathname}${url.search}`,
    servername: isIP(url.hostname) ? undefined : url.hostname,
    headers: {
      Host: url.host,
      Accept: "text/html,text/plain;q=0.9",
      "Accept-Encoding": "identity",
      "User-Agent": "KebuBrowserReader/1.0 (+https://thekebu.com)",
    },
  };
}

export async function requestPinnedReaderTarget(
  target: SafePublicTarget,
): Promise<PinnedReaderResponse> {
  const options = createPinnedRequestOptions(target);
  const request = target.url.protocol === "https:" ? requestHttps : requestHttp;

  return new Promise((resolve, reject) => {
    const req = request(options, (response) => {
      const chunks: Buffer[] = [];
      let total = 0;
      let settled = false;

      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        response.destroy(error);
        reject(error);
      };

      const contentLength = Number(response.headers["content-length"] ?? "0");
      if (Number.isFinite(contentLength) && contentLength > READER_MAX_BYTES) {
        fail(new Error("Page is too large for reader mode."));
        return;
      }
      const encoding = response.headers["content-encoding"];
      if (encoding && encoding !== "identity") {
        fail(new Error("Reader received an unsupported compressed response."));
        return;
      }

      response.on("data", (chunk: Buffer) => {
        total += chunk.byteLength;
        if (total > READER_MAX_BYTES) {
          fail(new Error("Page is too large for reader mode."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        if (settled) return;
        settled = true;
        resolve({
          status: response.statusCode ?? 0,
          headers: response.headers,
          body: Buffer.concat(chunks, total),
        });
      });
      response.on("error", fail);
    });

    req.setTimeout(READER_TIMEOUT_MS, () => {
      req.destroy(new Error("Reader request timed out."));
    });
    req.on("error", reject);
    req.end();
  });
}
