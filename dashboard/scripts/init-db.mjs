// One-off: run db/schema.sql against DATABASE_URL. `node scripts/init-db.mjs`
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load DATABASE_URL from .env.local if not already set.
if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^DATABASE_URL=(.*)$/);
      if (m) process.env.DATABASE_URL = m[1];
    }
  }
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sqlText = fs.readFileSync(
  path.join(__dirname, "..", "db", "schema.sql"),
  "utf8",
);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(sqlText); // simple protocol runs the whole file
const { rows } = await client.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1",
);
console.log("Tables:", rows.map((r) => r.table_name).join(", "));
await client.end();
console.log("Schema applied.");
