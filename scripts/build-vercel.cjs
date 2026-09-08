/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
require("@next/env").loadEnvConfig(root, false);

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
// Schema/data migration is a separate reviewed step, not a side effect of builds.
run("node_modules/next/dist/bin/next", ["build"]);
