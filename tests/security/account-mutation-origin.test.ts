import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routes = ["app/api/me/profile/route.ts", "app/api/invites/[token]/route.ts"];

describe("account-identity mutation routes reject cross-origin mutations", () => {
  for (const route of routes) {
    it(route, () => {
      const source = readFileSync(join(process.cwd(), route), "utf8");
      expect(source).toContain("assertSameOriginMutation");
      for (const method of ["POST", "PATCH", "DELETE"]) {
        const marker = `export async function ${method}(`;
        if (source.includes(marker)) {
          const start = source.indexOf(marker);
          expect(source.slice(start, start + 320)).toContain("assertSameOriginMutation(req)");
        }
      }
    });
  }
});
