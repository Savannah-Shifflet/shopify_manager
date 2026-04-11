import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, Text, BlockStack, DataTable } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { listSequences } from "~/services/sequence.service";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const sequences = await listSequences(session.shop);
  return json({ sequences });
}

export default function Outreach() {
  const { sequences } = useLoaderData<typeof loader>();

  const rows = sequences.map((s) => [
    s.name,
    JSON.parse(s.steps as string).length + " steps",
    s.isDefault ? "Default" : "—",
  ]);

  return (
    <Page
      title="Email Outreach"
      primaryAction={{ content: "New Sequence", url: "/app/outreach/new" }}
    >
      <BlockStack gap="500">
        <Card>
          {rows.length === 0 ? (
            <Text as="p" variant="bodyMd" tone="subdued">
              No sequences yet. Create one to start automating outreach.
            </Text>
          ) : (
            <DataTable
              columnContentTypes={["text", "text", "text"]}
              headings={["Sequence Name", "Steps", "Default"]}
              rows={rows}
            />
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}
