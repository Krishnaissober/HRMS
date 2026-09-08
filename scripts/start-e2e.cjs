/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const env = {
  ...process.env,
  NEXT_DIST_DIR: ".next-e2e",
  APP_URL: "http://localhost:3002",
  BETTER_AUTH_URL: "http://localhost:3002",
  E2E_TEST_MODE: "1",
};
delete env.FORCE_COLOR;
env.NO_COLOR = "1";
const npm = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
const npmArgs = (args) =>
  process.platform === "win32" ? ["/d", "/s", "/c", `npm ${args.join(" ")}`] : args;

const build = spawnSync(npm, npmArgs(["run", "build"]), {
  cwd: root,
  env,
  stdio: "inherit",
  windowsHide: true,
});

if (build.status !== 0) process.exit(build.status || 1);

const server = spawn(npm, npmArgs(["run", "start", "--", "-p", "3002"]), {
  cwd: root,
  env,
  stdio: "inherit",
  windowsHide: true,
});

function stop() {
  if (!server.killed) server.kill();
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    stop();
    process.exit(0);
  });
}

server.on("exit", (code, signal) => {
  process.exitCode = code || (signal ? 1 : 0);
});
