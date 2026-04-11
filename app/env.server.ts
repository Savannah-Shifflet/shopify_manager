import { z } from "zod";

const EnvSchema = z.object({
  // Shopify (Dev Dashboard app - post Jan 2026)
  // Access token is fetched automatically via client_credentials grant
  SHOPIFY_CLIENT_ID: z.string().min(1),
  SHOPIFY_CLIENT_SECRET: z.string().min(1),
  SHOPIFY_STORE_DOMAIN: z.string().min(1),
  SHOPIFY_ACCESS_TOKEN: z.string().optional(), // auto-fetched; only set if pre-provisioned

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().url(),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(1),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),

  // Microsoft OAuth
  MICROSOFT_CLIENT_ID: z.string().min(1),
  MICROSOFT_CLIENT_SECRET: z.string().min(1),
  MICROSOFT_REDIRECT_URI: z.string().url(),
  MICROSOFT_TENANT_ID: z.string().default("common"),

  // Error Monitoring
  SENTRY_DSN: z.string().optional(),

  // Email Tracking
  TRACKING_BASE_URL: z.string().url(),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32),

  // App Config
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error"])
    .default("info"),
});

// Validate at startup — crashes immediately if required vars are missing
function validateEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    // In dev, print a helpful message instead of crashing hard
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "⚠️  Some env vars are missing — copy .env.example to .env and fill in values",
      );
    } else {
      process.exit(1);
    }
    // Return a partial object so the app can boot in dev without all vars
    return process.env as unknown as z.infer<typeof EnvSchema>;
  }
  return result.data;
}

export const env = validateEnv();
