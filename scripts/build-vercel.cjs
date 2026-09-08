/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
require("@next/env").loadEnvConfig(root, false);

for (const name of ["DATABASE_URL", "REDIS_URL"]) {
  const reference = process.env[name]?.match(/^\$([A-Z0-9_]+)$/)?.[1];
  if (reference && process.env[reference]) process.env[name] = process.env[reference];
}

// Never manufacture secrets or fall back to a disposable SQLite DB on Vercel.
if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || "")) {
  throw new Error("Set DATABASE_URL to the hosted PostgreSQL connection string before deploying.");
}
function run(script, args) {
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
run("scripts/prepare-postgresql.cjs", ["--check"]);
run("node_modules/prisma/build/index.js", [
  "generate",
  "--schema",
  "prisma/postgresql/schema.prisma",
]);
run("node_modules/prisma/build/index.js", [
  "migrate",
  "deploy",
  "--schema",
  "prisma/postgresql/schema.prisma",
]);
run("node_modules/next/dist/bin/next", ["build"]);
