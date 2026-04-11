import "@shopify/shopify-app-remix/adapters/node";
import {
  AppDistribution,
  shopifyApp,
  LATEST_API_VERSION,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import db from "./db.server";

// Post-Jan 2026 Dev Dashboard apps use SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET.
// The @shopify/shopify-app-remix package maps apiKey → client_id internally.
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_CLIENT_ID,
  apiSecretKey: process.env.SHOPIFY_CLIENT_SECRET || "",
  apiVersion: LATEST_API_VERSION,
  // Scopes are configured in the Dev Dashboard UI — not passed here
  appUrl: `https://${process.env.SHOPIFY_STORE_DOMAIN}`,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(db),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
});

export default shopify;
export const apiVersion = LATEST_API_VERSION;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
