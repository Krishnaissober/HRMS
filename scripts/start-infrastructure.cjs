/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const composeFile = path.join(root, "docker-compose.local.yml");

if (process.env.HRMS_SKIP_INFRA === "1") {
  console.log("[infra] skipped because HRMS_SKIP_INFRA=1");
  process.exit(0);
}

function portIsOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const redisReady = await portIsOpen(6379);
  const storageReady = await portIsOpen(9000);
  if (redisReady && storageReady) {
    console.log("[infra] Redis and MinIO are already reachable.");
    return;
  }

  const services = ["minio", "minio-init"];
  if (!redisReady) services.unshift("redis");
  if (storageReady) {
    services.splice(services.indexOf("minio"), 2);
  }

  const result = spawnSync("docker", ["compose", "-f", composeFile, "up", "-d", ...services], {
    cwd: root,
    encoding: "utf8",
    timeout: 20_000,
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    const reason = result.error?.message || result.stderr?.trim() || `exit code ${result.status}`;
    console.warn(`[infra] Docker services were not started: ${reason}`);
    console.warn("[infra] Start Docker Desktop, then run: npm run infra:up");
    return;
  }

  console.log("[infra] Redis and MinIO are running; private bucket initialization requested.");
}

void main();
