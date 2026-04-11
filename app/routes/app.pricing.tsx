import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  DataTable,
  Badge,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { listPriceAlerts, listPricingRules } from "~/services/pricing.service";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const [alerts, rules] = await Promise.all([
    listPriceAlerts(session.shop, { status: "pending" }),
    listPricingRules(session.shop),
  ]);
  return json({ alerts, rules });
}

export default function Pricing() {
  const { alerts, rules } = useLoaderData<typeof loader>();

  const alertRows = alerts.map((a) => [
    <span key={`prod-${a.id}`} className="mono">
      {a.productId}
    </span>,
    <span key={`old-${a.id}`} className="mono">
      {a.oldPrice}
    </span>,
    <span key={`new-${a.id}`} className="mono">
      {a.newPrice}
    </span>,
    a.mapViolation ? (
      <Badge tone="critical" key={`map-${a.id}`}>
        MAP Violation
      </Badge>
    ) : (
      "—"
    ),
    <Badge key={`status-${a.id}`}>{a.status}</Badge>,
  ]);

  const ruleRows = rules.map((r) => [
    r.name,
    r.markupType,
    r.markupValue,
    String(r.priority),
    <Badge key={`active-${r.id}`} tone={r.active ? "success" : "info"}>
      {r.active ? "Active" : "Inactive"}
    </Badge>,
  ]);

  return (
    <Page
      title="Pricing"
      primaryAction={{ content: "New Rule", url: "/app/pricing/rules/new" }}
    >
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Price Alerts
              {alerts.length > 0 && (
                <Badge tone="attention">{String(alerts.length)}</Badge>
              )}
            </Text>
            {alertRows.length === 0 ? (
              <Text as="p" variant="bodyMd" tone="subdued">
                No pending alerts.
              </Text>
            ) : (
              <DataTable
                columnContentTypes={["text", "text", "text", "text", "text"]}
                headings={[
                  "Product",
                  "Old Price",
                  "New Price",
                  "MAP",
                  "Status",
                ]}
                rows={alertRows}
              />
            )}
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Pricing Rules
            </Text>
            {ruleRows.length === 0 ? (
              <Text as="p" variant="bodyMd" tone="subdued">
                No rules yet. Create one to automate repricing.
              </Text>
            ) : (
              <DataTable
                columnContentTypes={["text", "text", "text", "numeric", "text"]}
                headings={["Name", "Type", "Value", "Priority", "Status"]}
                rows={ruleRows}
              />
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
