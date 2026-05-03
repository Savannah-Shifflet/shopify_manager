import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { supplierDiscoveryQueue, shopifySyncQueue } from "~/jobs/queues";

// Shopify webhook handler
// Rule: verify HMAC, return 200 immediately, enqueue BullMQ job
export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload, apiVersion } =
    await authenticate.webhook(request);
  // authenticate.webhook throws on invalid HMAC — never reaches here if invalid

  console.info({ topic, shop, apiVersion }, "Webhook received");

  try {
    switch (topic) {
      case "APP_UNINSTALLED": {
        // TODO: clean up shop data — sessions are removed by session storage
        break;
      }

      case "PRODUCTS_UPDATE": {
        const typedPayload = payload as { id: string };
        await shopifySyncQueue.add(
          "webhook-product-update",
          { shopDomain: shop, productShopifyId: String(typedPayload.id) },
          { priority: 1 },
        );
        break;
      }

      case "PRODUCTS_DELETE": {
        const typedPayload = payload as { id: string };
        await shopifySyncQueue.add(
          "webhook-product-delete",
          { shopDomain: shop, productShopifyId: String(typedPayload.id) },
          { priority: 1 },
        );
        break;
      }

      case "CUSTOMERS_DATA_REQUEST":
      case "CUSTOMERS_REDACT":
      case "SHOP_REDACT": {
        // GDPR mandatory webhooks — log and acknowledge
        // TODO: implement data deletion/export for GDPR compliance
        console.info({ topic, shop }, "GDPR webhook received");
        break;
      }

      default: {
        console.warn({ topic, shop }, "Unhandled webhook topic");
      }
    }
  } catch (error) {
    console.error({ topic, shop, error }, "Webhook enqueue failed");
  }

  return new Response(null, { status: 200 });
};
