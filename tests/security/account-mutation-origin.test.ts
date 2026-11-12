import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const routes = [
  "app/api/me/profile/route.ts",
  "app/api/invites/[token]/route.ts",
  "app/api/cloud/buckets/route.ts",
  "app/api/cloud/buckets/[bucketId]/route.ts",
  "app/api/cloud/buckets/[bucketId]/files/route.ts",
  "app/api/cloud/deployments/route.ts",
  "app/api/cloud/deployments/[deploymentId]/route.ts",
  "app/api/cloud/deployments/[deploymentId]/versions/route.ts",
  "app/api/cloud/deployments/[deploymentId]/versions/[versionId]/promote/route.ts",
  "app/api/cloud/files/[fileId]/route.ts",
  "app/api/rooms/route.ts",
  "app/api/rooms/[id]/route.ts",
];

describe("account-identity, Cloud and Rooms mutation routes reject cross-origin mutations", () => {
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
