import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const LOCAL_DB = path.join(/*turbopackIgnore: true*/ process.cwd(), "prisma", "dev.db");
const VERCEL_DB = "/tmp/k-direction.db";

function resolveDatabaseUrl() {
  const configured = process.env.DATABASE_URL ?? `file:${LOCAL_DB}`;
  if (!configured.startsWith("file:")) {
    return configured;
  }

  let filePath = configured.slice("file:".length);
  if (!filePath || filePath === "./" || filePath === ".") {
    filePath = LOCAL_DB;
  } else if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(process.cwd(), filePath);
  }

  if (process.env.VERCEL) {
    if (
      fs.existsSync(/*turbopackIgnore: true*/ filePath) &&
      !fs.existsSync(/*turbopackIgnore: true*/ VERCEL_DB)
    ) {
      fs.copyFileSync(/*turbopackIgnore: true*/ filePath, VERCEL_DB);
    }
    return `file:${VERCEL_DB}`;
  }

  return `file:${filePath}`;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaUrl?: string;
};

export function getDatabasePath() {
  const url = resolveDatabaseUrl();
  return url.startsWith("file:") ? url.slice("file:".length) : url;
}

export function getPrisma() {
  const url = resolveDatabaseUrl();
  if (!globalForPrisma.prisma || globalForPrisma.prismaUrl !== url) {
    if (globalForPrisma.prisma) {
      void globalForPrisma.prisma.$disconnect();
    }
    const adapter = new PrismaBetterSqlite3({ url });
    globalForPrisma.prisma = new PrismaClient({ adapter });
    globalForPrisma.prismaUrl = url;
  }
  return globalForPrisma.prisma;
}
