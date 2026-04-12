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
  Filters,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { listSuppliers } from "~/services/supplier.service";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;

  const suppliers = await listSuppliers(session.shop, { status });
  return json({ suppliers });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "trigger-discovery") {
    // TODO: enqueue supplier discovery job
    void session;
  }

  return json({ success: true });
}

const STATUS_BADGE: Record<
  string,
  "info" | "success" | "warning" | "critical" | "new" | "attention"
> = {
  LEAD: "info",
  CONTACTED: "attention",
  RESPONDED: "new",
  NEGOTIATING: "warning",
  APPROVED: "success",
  REJECTED: "critical",
  INACTIVE: "info",
};

export default function Suppliers() {
  const { suppliers } = useLoaderData<typeof loader>();

  const rows = suppliers.map((s) => [
    s.name,
    s.website ?? "—",
    <Badge tone={STATUS_BADGE[s.status] ?? "info"} key={s.id}>
      {s.status}
    </Badge>,
    new Date(s.createdAt).toLocaleDateString(),
  ]);

  return (
    <Page
      title="Suppliers"
      primaryAction={{ content: "Trigger Discovery", url: "" }}
    >
      <BlockStack gap="500">
        <Card>
          {rows.length === 0 ? (
            <BlockStack gap="300" inlineAlign="center">
              <Text as="p" variant="bodyMd" tone="subdued">
                No suppliers yet. Trigger discovery or add one manually.
              </Text>
              <Button url="/app/suppliers/new">Add Supplier</Button>
            </BlockStack>
          ) : (
            <DataTable
              columnContentTypes={["text", "text", "text", "text"]}
              headings={["Name", "Website", "Status", "Added"]}
              rows={rows}
            />
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}
