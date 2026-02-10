import { Queue } from "bullmq";
import IORedis from "ioredis";

let _queue: Queue | null = null;

function getQueue(): Queue {
  if (_queue) return _queue;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not set");

  const connection = new IORedis(url, { maxRetriesPerRequest: null });

  _queue = new Queue("publish", {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });

  return _queue;
}

export async function enqueuePublishJob(jobId: string, runAtUtc: Date) {
  const queue = getQueue();
  const delay = Math.max(0, runAtUtc.getTime() - Date.now());
  await queue.add(
    "publish",
    { publishJobId: jobId },
    {
      jobId,
      delay,
    }
  );
}
