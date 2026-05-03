/**
 * BullMQ worker entrypoint
 * Run as a separate Railway service: `npx tsx app/jobs/worker.ts`
 */

import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { env } from "~/env.server";
import { QUEUES } from "./queues";
import { processSupplierDiscovery } from "./supplier-discovery.job";
import { processEmailSync } from "./email-sync.job";
import { processCatalogScrape } from "./catalog-scrape.job";
import { processEnrichment } from "./enrichment.job";
import { processPriceMonitor } from "./price-monitor.job";
import { processShopifySync } from "./shopify-sync.job";

const connection = new IORedis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
  {
    maxRetriesPerRequest: null,
  },
);

const LOG_PREFIX = "[worker]";

function createWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
  concurrency = 3,
) {
  const worker = new Worker<T>(queueName, processor, {
    connection,
    concurrency,
  });

  worker.on("completed", (job) => {
    console.info(`${LOG_PREFIX} ${queueName}:${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`${LOG_PREFIX} ${queueName}:${job?.id} failed`, err);
  });

  worker.on("error", (err) => {
    console.error(`${LOG_PREFIX} ${queueName} worker error`, err);
  });

  return worker;
}

// ─── Register all workers ───

const workers = [
  createWorker(QUEUES.SUPPLIER_DISCOVERY, processSupplierDiscovery, 2),
  createWorker(QUEUES.EMAIL_SYNC, processEmailSync, 5),
  createWorker(QUEUES.CATALOG_SCRAPE, processCatalogScrape, 2),
  createWorker(QUEUES.ENRICHMENT, processEnrichment, 3),
  createWorker(QUEUES.PRICE_MONITOR, processPriceMonitor, 2),
  createWorker(QUEUES.SHOPIFY_SYNC, processShopifySync, 4),
];

console.info(`${LOG_PREFIX} Started ${workers.length} workers`);

// ─── Graceful shutdown ───

async function shutdown() {
  console.info(`${LOG_PREFIX} Shutting down workers...`);
  await Promise.all(workers.map((w) => w.close()));
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
