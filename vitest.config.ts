import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/**/*.test.ts",
      "tests/**/*.integration.test.ts",
      "tests/**/*.db.test.ts",
      "tests/**/*.rls.test.ts",
    ],
    exclude: ["tests/**/*.spec.ts", "node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // next/font transforms run in Next compilation; unit renders use the loader shape.
      "next/font/google": path.resolve(__dirname, "tests/shims/next-font-google.ts"),
    },
  },
});
