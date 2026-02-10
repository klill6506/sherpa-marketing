import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient, PublishStatus, AttemptStatus, Provider } from "@prisma/client";
import { getAdapter, ProviderError } from "../providers";

const prisma = new PrismaClient();

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error("REDIS_URL is not set");
  process.exit(1);
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

console.log("[Worker] Starting publish worker...");

const worker = new Worker(
  "publish",
  async (job: Job<{ publishJobId: string }>) => {
    const { publishJobId } = job.data;
    console.log(`[Worker] Processing publish job: ${publishJobId} (attempt ${job.attemptsMade + 1})`);

    const publishJob = await prisma.publishJob.findUnique({
      where: { id: publishJobId },
      include: {
        post: {
          include: {
            variants: true,
            mediaAsset: true,
          },
        },
      },
    });

    if (!publishJob) {
      console.error(`[Worker] Publish job not found: ${publishJobId}`);
      return;
    }

    // Mark as publishing
    await prisma.publishJob.update({
      where: { id: publishJobId },
      data: { status: PublishStatus.PUBLISHING },
    });

    const enabledVariants = publishJob.post.variants.filter((v) => v.enabled);
    if (enabledVariants.length === 0) {
      console.warn(`[Worker] No enabled variants for job: ${publishJobId}`);
      await prisma.publishJob.update({
        where: { id: publishJobId },
        data: { status: PublishStatus.PUBLISHED },
      });
      return;
    }

    let allSucceeded = true;
    let anyFailed = false;

    for (const variant of enabledVariants) {
      // Find the social account for this provider + org
      const socialAccount = await prisma.socialAccount.findFirst({
        where: {
          orgId: publishJob.post.orgId,
          provider: variant.provider,
        },
      });

      if (!socialAccount) {
        await prisma.publishAttempt.create({
          data: {
            publishJobId,
            provider: variant.provider,
            status: AttemptStatus.FAILED,
            errorCode: "NO_ACCOUNT",
            errorMessage: `No ${variant.provider} account connected. Please connect your account.`,
            attemptNumber: job.attemptsMade + 1,
          },
        });
        anyFailed = true;
        allSucceeded = false;
        continue;
      }

      try {
        const adapter = getAdapter(variant.provider);
        const caption = publishJob.post.caption;

        const result = await adapter.publish(
          variant,
          socialAccount,
          caption,
          publishJob.post.mediaAsset
        );

        await prisma.publishAttempt.create({
          data: {
            publishJobId,
            provider: variant.provider,
            status: AttemptStatus.SUCCESS,
            externalId: result.externalId,
            permalink: result.permalink,
            attemptNumber: job.attemptsMade + 1,
          },
        });

        console.log(
          `[Worker] Published ${variant.provider} for job ${publishJobId}: ${result.externalId}`
        );
      } catch (error) {
        allSucceeded = false;
        anyFailed = true;

        const isProviderError = error instanceof ProviderError;
        const errorCode = isProviderError ? error.code : "UNKNOWN";
        const errorMessage = isProviderError
          ? error.userMessage
          : "An unexpected error occurred.";
        const providerResponse = isProviderError
          ? error.providerResponse
          : undefined;

        console.error(
          `[Worker] Failed ${variant.provider} for job ${publishJobId}:`,
          error
        );

        await prisma.publishAttempt.create({
          data: {
            publishJobId,
            provider: variant.provider,
            status: AttemptStatus.FAILED,
            errorCode,
            errorMessage,
            providerResponseJson: providerResponse
              ? JSON.parse(JSON.stringify(providerResponse))
              : undefined,
            attemptNumber: job.attemptsMade + 1,
          },
        });
      }
    }

    // Update job status
    if (allSucceeded) {
      await prisma.publishJob.update({
        where: { id: publishJobId },
        data: { status: PublishStatus.PUBLISHED },
      });
    } else if (anyFailed) {
      // If this is the last attempt, mark as failed
      if (job.attemptsMade + 1 >= (job.opts.attempts || 3)) {
        await prisma.publishJob.update({
          where: { id: publishJobId },
          data: { status: PublishStatus.FAILED },
        });
      } else {
        // Will be retried
        await prisma.publishJob.update({
          where: { id: publishJobId },
          data: { status: PublishStatus.SCHEDULED },
        });
        throw new Error("One or more variants failed, retrying...");
      }
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`[Worker] Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job failed: ${job?.id}`, err.message);
});

worker.on("error", (err) => {
  console.error("[Worker] Worker error:", err);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Worker] Shutting down...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("[Worker] Shutting down...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

console.log("[Worker] Publish worker started successfully");
