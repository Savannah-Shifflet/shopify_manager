import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Badge,
  Button,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getProductById } from "~/services/supplier.service";
import { applyAiAcceptance } from "~/services/ai-acceptance.service";
import { enrichmentQueue, shopifySyncQueue } from "~/jobs/queues";
import { z } from "zod";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const product = await getProductById(session.shop, params.id!);
  if (!product) throw new Response("Not Found", { status: 404 });
  return json({ product });
}

const ActionSchema = z.object({
  intent: z.enum(["enrich", "accept-ai", "reject-ai", "sync"]),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const { intent } = ActionSchema.parse({ intent: formData.get("intent") });

  switch (intent) {
    case "enrich":
      await enrichmentQueue.add("single-enrich", {
        shopDomain: session.shop,
        productIds: [params.id!],
        priority: "single",
      });
      return json({ success: true, message: "Enrichment queued" });

    case "accept-ai":
      await applyAiAcceptance(session.shop, params.id!);
      return json({ success: true, message: "AI content applied" });

    case "reject-ai":
      // TODO: call rejectAiContent service — reset staging fields + enrichStatus
      return json({ success: true, message: "AI content rejected" });

    case "sync":
      await shopifySyncQueue.add("push-product", {
        shopDomain: session.shop,
        productId: params.id!,
      });
      return json({ success: true, message: "Sync queued" });
  }
}

export default function ProductDetail() {
  const { product } = useLoaderData<typeof loader>();
  const hasAiContent = Boolean(product.aiTitle || product.aiDescription);

  return (
    <Page
      title={product.title}
      backAction={{ content: "Products", url: "/app/products" }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {hasAiContent && (
              <Banner tone="info">
                <Text as="p" variant="bodyMd">
                  AI-generated content is ready for review.
                </Text>
              </Banner>
            )}

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">AI Staging Fields</Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Review AI suggestions before applying to Shopify.
                </Text>
                {product.aiTitle && (
                  <Text as="p" variant="bodyMd">
                    <strong>Title:</strong> {product.aiTitle}
                  </Text>
                )}
                {product.aiDescription && (
                  <Text as="p" variant="bodyMd">
                    <strong>Description:</strong> {product.aiDescription.slice(0, 200)}...
                  </Text>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <form method="post">
                    <input type="hidden" name="intent" value="accept-ai" />
                    <Button submit variant="primary">Accept AI Content</Button>
                  </form>
                  <form method="post">
                    <input type="hidden" name="intent" value="reject-ai" />
                    <Button submit tone="critical">Reject</Button>
                  </form>
                </div>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Actions</Text>
                <div style={{ display: "flex", gap: 8 }}>
                  <form method="post">
                    <input type="hidden" name="intent" value="enrich" />
                    <Button submit>Enrich with AI</Button>
                  </form>
                  <form method="post">
                    <input type="hidden" name="intent" value="sync" />
                    <Button submit>Push to Shopify</Button>
                  </form>
                </div>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">Details</Text>
                <Text as="p" variant="bodyMd">
                  SKU: <span className="mono">{product.sku}</span>
                </Text>
                <Text as="p" variant="bodyMd">
                  Cost: <span className="mono">{product.cost ?? "—"}</span>
                </Text>
                <Text as="p" variant="bodyMd">
                  MSRP: <span className="mono">{product.msrp ?? "—"}</span>
                </Text>
                <Text as="p" variant="bodyMd">
                  MAP: <span className="mono">{product.mapPrice ?? "—"}</span>
                </Text>
                <Badge>{product.syncStatus}</Badge>
                <Badge>{product.enrichStatus}</Badge>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
