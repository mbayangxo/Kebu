import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
const routes = ["app/api/studio/brand-kit/route.ts","app/api/studio/brand-dna/route.ts","app/api/studio/campaigns/route.ts","app/api/studio/folders/route.ts","app/api/studio/generate/route.ts","app/api/studio/uploads/route.ts"];
describe("Studio write routes reject cross-origin mutations", () => {
  for (const route of routes) it(route, () => {
    const source = readFileSync(join(process.cwd(), route), "utf8");
    expect(source).toContain("assertSameOriginMutation");
    for (const method of ["POST", "PATCH", "DELETE"]) {
      if (source.includes("export async function " + method + "(req: Request")) {
        const start = source.indexOf("export async function " + method);
        expect(source.slice(start, start + 320)).toContain("assertSameOriginMutation(req)");
      }
    }
  });
});
