// Prisma ORM v7+ reads connection URLs from prisma.config.ts (not schema.prisma).
// Prisma CLI does not auto-load .env files, so we load them explicitly here (بدون dotenv).

import fs from "node:fs";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

function loadEnvFile(fileName: string) {
  const filePath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Supports: KEY=VALUE, KEY="VALUE", KEY='VALUE'
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;

    const key = m[1];
    if (key === undefined) continue;

    let value = m[2] ?? "";

    // Strip inline comment when value is unquoted
    const isQuoted = value.startsWith('"') || value.startsWith("'");
    if (!isQuoted) {
      // allow "KEY=value # comment"
      value = value.replace(/\s+#.*$/, "");
      value = value.trim();
    } else {
      const q = value.charAt(0);
      // If we have both opening and closing quotes, strip both; otherwise strip only the first.
      if (value.length >= 2 && value.endsWith(q)) value = value.slice(1, -1);
      else value = value.slice(1);
    }

    // Do not override already-set environment variables (Vercel/CI)
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// In local dev, DATABASE_URL is often in .env.local.
// In CI (e.g., Vercel), env vars are set in the dashboard, but reading files doesn't hurt if they exist.
loadEnvFile(".env.local");
loadEnvFile(".env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
