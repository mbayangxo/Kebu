import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const examplePath = path.join(root, "env.example");

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!fs.existsSync(envPath)) return "";
  const line = fs
    .readFileSync(envPath, "utf8")
    .split("\n")
    .find((l) => l.startsWith("DATABASE_URL="));
  if (!line) return "";
  return line.replace(/^DATABASE_URL=/, "").trim().replace(/^["']|["']$/g, "");
}

const url = readDatabaseUrl();
if (!url.startsWith("file:")) {
  if (!fs.existsSync(examplePath)) {
    console.error("Missing env.example. Cannot fix DATABASE_URL.");
    process.exit(1);
  }
  console.error(
    "DATABASE_URL must be SQLite (file:./prisma/dev.db).",
    url ? `\nFound: ${url.slice(0, 70)}…` : "\nNo valid DATABASE_URL in .env.",
    "\nDo not paste JOKO payments app Postgres URL here.",
    "\nResetting .env from env.example…"
  );
  fs.copyFileSync(examplePath, envPath);
  console.log("Wrote .env — run npm run db:setup again.");
}
