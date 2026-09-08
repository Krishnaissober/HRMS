/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const mode = process.argv[2] === "start" ? "start" : "dev";
const nextArgs = process.argv.slice(3);
const root = path.resolve(__dirname, "..");
const infrastructureScript = path.join(root, "scripts", "start-infrastructure.cjs");
const backendPort = Number(process.env.BACKEND_PORT || 4000);
let backend;
let next;
let shuttingDown = false;

function backendIsHealthy() {
  return new Promise((resolve) => {
    const request = http.get(
      { hostname: "127.0.0.1", port: backendPort, path: "/health", timeout: 750 },
      (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      },
    );
    request.on("error", () => resolve(false));
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
  });
}

function stop() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (next && !next.killed) next.kill();
  if (backend && !backend.killed) backend.kill();
}

async function main() {
  spawnSync(process.execPath, [infrastructureScript], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });

  if (!(await backendIsHealthy())) {
    backend = spawn(process.execPath, [path.join(root, "backend", "server.cjs")], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
    });
    backend.on("error", (error) => {
      if (!shuttingDown) console.error(`[backend] ${error.message}`);
    });
    backend.on("exit", (code) => {
      if (!shuttingDown && code) console.error(`[backend] exited with code ${code}`);
    });
  } else {
    console.log(`[backend] already running on http://localhost:${backendPort}`);
  }

  next = spawn(
    process.execPath,
    [path.join(root, "node_modules", "next", "dist", "bin", "next"), mode, ...nextArgs],
    {
      cwd: root,
      env: process.env,
      stdio: "inherit",
      windowsHide: false,
    },
  );
  next.on("error", (error) => {
    console.error(`[next] ${error.message}`);
    process.exitCode = 1;
  });
  next.on("exit", (code, signal) => {
    if (!shuttingDown) {
      shuttingDown = true;
      if (backend && !backend.killed) backend.kill();
      process.exitCode = code || (signal ? 1 : 0);
    }
  });
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    stop();
    process.exit(0);
  });
}

void main();
