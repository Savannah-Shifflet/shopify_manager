import { Queue } from "bullmq";
import IORedis from "ioredis";

// ─── Queue name constants (single source of truth) ───

export const QUEUES = {
  SUPPLIER_DISCOVERY: "supplier-discovery",
  EMAIL_SYNC: "email-sync",
  CATALOG_SCRAPE: "catalog-scrape",
  ENRICHMENT: "enrichment",
  PRICE_MONITOR: "price-monitor",
  SHOPIFY_SYNC: "shopify-sync",
} as const;

// ─── Job payload types ───

export interface SupplierDiscoveryPayload {
  shopDomain: string;
  keywords?: string[];
  triggeredBy: "manual" | "schedule";
}

export interface EmailSyncPayload {
  shopDomain: string;
}

export interface CatalogScrapePayload {
  shopDomain: string;
  supplierId: string;
  scrapeUrl: string;
  mode: "url" | "file";
  fileKey?: string; // S3/temp key for uploaded file
}

export interface EnrichmentPayload {
  shopDomain: string;
  productIds: string[];
  priority: "single" | "batch";
}

export interface PriceMonitorPayload {
  shopDomain: string;
  supplierId: string;
  scrapeUrl: string;
}

export interface ShopifySyncPayload {
  shopDomain: string;
  productId?: string; // single product push
  productShopifyId?: string; // webhook-triggered update
  mode?: "push" | "delete";
}

// ─── Default job options ───

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

// ─── Redis connection ───

function createRedisConnection() {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  return new IORedis(url, {
    maxRetriesPerRequest: null, // required by BullMQ
  });
}

const connection = createRedisConnection();

// ─── Queue instances ───

export const supplierDiscoveryQueue = new Queue<SupplierDiscoveryPayload>(
  QUEUES.SUPPLIER_DISCOVERY,
  { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS },
);

export const emailSyncQueue = new Queue<EmailSyncPayload>(QUEUES.EMAIL_SYNC, {
  connection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const catalogScrapeQueue = new Queue<CatalogScrapePayload>(
  QUEUES.CATALOG_SCRAPE,
  { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS },
);

export const enrichmentQueue = new Queue<EnrichmentPayload>(QUEUES.ENRICHMENT, {
  connection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const priceMonitorQueue = new Queue<PriceMonitorPayload>(
  QUEUES.PRICE_MONITOR,
  { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS },
);

export const shopifySyncQueue = new Queue<ShopifySyncPayload>(
  QUEUES.SHOPIFY_SYNC,
  { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS },
);
