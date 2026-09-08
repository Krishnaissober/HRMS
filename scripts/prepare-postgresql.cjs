/* eslint-disable @typescript-eslint/no-require-imports */
// Generate the deployment schema from the canonical local schema. No DB writes.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
if (!/provider\s*=\s*"sqlite"/.test(source)) {
  throw new Error(
    "Expected the canonical SQLite schema; review provider generation before continuing.",
  );
}
const generated = source.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
const destination = path.join(root, "prisma/postgresql/schema.prisma");
if (process.argv.includes("--check")) {
  if (!fs.existsSync(destination) || fs.readFileSync(destination, "utf8") !== generated) {
    throw new Error("PostgreSQL schema is out of date. Run npm run prisma:prepare-postgresql.");
  }
} else {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, generated);
}
