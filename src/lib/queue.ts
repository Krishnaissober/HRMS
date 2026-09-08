import { Queue, Worker, type JobsOptions, type Processor } from "bullmq";
import { logger } from "@/lib/logger";
import { redisConnection } from "@/lib/redis";

export { redisConnection } from "@/lib/redis";

export function createQueue(name: string) {
  return new Queue(name, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  });
}

export function createWorker<T>(name: string, processor: Processor<T>) {
  const worker = new Worker<T>(name, processor, { connection: redisConnection, concurrency: 2 });
  worker.on("failed", (job, error) =>
    logger.error({ jobId: job?.id, queue: name, error }, "job_failed"),
  );
  return worker;
}

export async function enqueue<T>(queue: Queue<T>, name: string, data: T, options?: JobsOptions) {
  const add = queue.add as unknown as (
    jobName: string,
    jobData: T,
    jobOptions?: JobsOptions,
  ) => Promise<unknown>;
  return add.call(queue, name, data, options);
}
