import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineGrid,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  // TODO: fetch real metrics from services
  return json({
    shopDomain,
    metrics: {
      totalSuppliers: 0,
      activeOutreach: 0,
      pendingImports: 0,
      productsToEnrich: 0,
    },
  });
}

export default function Dashboard() {
  const { shopDomain, metrics } = useLoaderData<typeof loader>();

  return (
    <Page title="Dashboard">
      <BlockStack gap="500">
        <Text as="p" variant="bodyMd" tone="subdued">
          Welcome to SourceDesk — {shopDomain}
        </Text>

        <InlineGrid columns={4} gap="400">
          <StatCard label="Suppliers" value={metrics.totalSuppliers} />
          <StatCard label="Active Outreach" value={metrics.activeOutreach} />
          <StatCard label="Pending Imports" value={metrics.pendingImports} />
          <StatCard label="To Enrich" value={metrics.productsToEnrich} />
        </InlineGrid>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Quick Actions
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Use the navigation to manage suppliers, import products, and
                  monitor pricing.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <BlockStack gap="100">
        <Text as="p" variant="headingXl" fontWeight="bold">
          {value}
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          {label}
        </Text>
      </BlockStack>
    </Card>
  );
}
