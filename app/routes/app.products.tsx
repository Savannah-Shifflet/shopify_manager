import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  DataTable,
  Text,
  BlockStack,
  Badge,
  Button,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { listProducts } from "~/services/supplier.service";
import { enrichmentQueue } from "~/jobs/queues";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const syncStatus = url.searchParams.get("syncStatus") ?? undefined;
  const enrichStatus = url.searchParams.get("enrichStatus") ?? undefined;

  const products = await listProducts(session.shop, { syncStatus, enrichStatus });
  return json({ products });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "bulk-enrich") {
    const productIds = String(formData.get("productIds")).split(",").filter(Boolean);
    await enrichmentQueue.add(
      "bulk-enrich",
      { shopDomain: session.shop, productIds, priority: "batch" },
      { priority: 2 }
    );
    return json({ success: true });
  }

  return json({ success: true });
}

const ENRICH_BADGE: Record<string, "info" | "success" | "warning" | "critical" | "new" | "attention"> = {
  NOT_STARTED: "info",
  PENDING: "attention",
  RUNNING: "new",
  DONE: "success",
  FAILED: "critical",
};

const SYNC_BADGE: Record<string, "info" | "success" | "warning" | "critical" | "new" | "attention"> = {
  NEVER_SYNCED: "info",
  PENDING: "attention",
  SYNCED: "success",
  FAILED: "critical",
  OUT_OF_SYNC: "warning",
};

export default function Products() {
  const { products } = useLoaderData<typeof loader>();

  const rows = products.map((p) => [
    <Text key={`title-${p.id}`} as="span" variant="bodyMd">{p.title}</Text>,
    <span key={`sku-${p.id}`} className="mono">{p.sku}</span>,
    <Badge key={`enrich-${p.id}`} tone={ENRICH_BADGE[p.enrichStatus] ?? "info"}>{p.enrichStatus}</Badge>,
    <Badge key={`sync-${p.id}`} tone={SYNC_BADGE[p.syncStatus] ?? "info"}>{p.syncStatus}</Badge>,
  ]);

  return (
    <Page
      title="Products"
      primaryAction={{ content: "Import Products", url: "/app/import" }}
    >
      <BlockStack gap="500">
        <Card>
          {rows.length === 0 ? (
            <BlockStack gap="300" inlineAlign="center">
              <Text as="p" variant="bodyMd" tone="subdued">
                No products yet. Import from a supplier file or URL.
              </Text>
              <Button url="/app/import">Import Products</Button>
            </BlockStack>
          ) : (
            <DataTable
              columnContentTypes={["text", "text", "text", "text"]}
              headings={["Title", "SKU", "Enrich Status", "Sync Status"]}
              rows={rows}
            />
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}
