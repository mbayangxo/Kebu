import "dotenv/config";
import { defineConfig } from "prisma/config";

function requireSqliteDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (!raw.startsWith("file:")) {
    throw new Error(
      [
        "K-Direction needs SQLite: DATABASE_URL=\"file:./prisma/dev.db\"",
        `Your .env has: ${raw.slice(0, 80)}`,
        "Fix: cp env.example .env (K-Direction uses SQLite — not JOKO payments Postgres).",
      ].join("\n")
    );
  }
  return raw;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: requireSqliteDatabaseUrl(),
  },
});
