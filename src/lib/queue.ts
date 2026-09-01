import { Queue, Worker, type JobsOptions, type Processor } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const redisConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
redisConnection.on("error", () => {
  // Readiness and worker callers classify the connection failure; avoid an unhandled emitter error.
});

export async function checkRedis() {
  if (redisConnection.status === "wait") await redisConnection.connect();
  await redisConnection.ping();
  return "ok" as const;
}

export function createQueue(name: string) {
  return new Queue(name, { connection: redisConnection, defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 1_000 }, removeOnComplete: 100, removeOnFail: 100 } });
}

export function createWorker<T>(name: string, processor: Processor<T>) {
  const worker = new Worker<T>(name, processor, { connection: redisConnection, concurrency: 2 });
  worker.on("failed", (job, error) => logger.error({ jobId: job?.id, queue: name, error }, "job_failed"));
  return worker;
}

export async function enqueue<T>(queue: Queue<T>, name: string, data: T, options?: JobsOptions) {
  const add = queue.add as unknown as (jobName: string, jobData: T, jobOptions?: JobsOptions) => Promise<unknown>;
  return add.call(queue, name, data, options);
}
