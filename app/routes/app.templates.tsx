import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  DataTable,
  Button,
  Badge,
} from "@shopify/polaris";
import { z } from "zod";
import { authenticate } from "~/shopify.server";
import {
  listTemplates,
  deleteTemplate,
} from "~/services/description-template.service";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const templates = await listTemplates(session.shop);
  return json({ templates });
}

const ActionSchema = z.object({
  intent: z.enum(["delete"]),
  id: z.string().cuid(),
});

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const parsed = ActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return json({ errors: parsed.error.flatten() }, { status: 422 });
  }
  if (parsed.data.intent === "delete") {
    await deleteTemplate(session.shop, parsed.data.id);
  }
  return json({ success: true });
}

export default function Templates() {
  const { templates } = useLoaderData<typeof loader>();
  const rows = templates.map((t) => [
    t.name,
    t.productType ?? "All products",
    JSON.parse(t.sections as string).length + " sections",
    t.isDefault ? <Badge tone="success">Default</Badge> : "—",
  ]);

  return (
    <Page
      title="Description Templates"
      primaryAction={{ content: "New Template", url: "/app/templates/new" }}
    >
      <BlockStack gap="500">
        <Card>
          {rows.length === 0 ? (
            <BlockStack gap="300" inlineAlign="center">
              <Text as="p" variant="bodyMd" tone="subdued">
                No templates yet. Create one to guide AI enrichment.
              </Text>
              <Button url="/app/templates/new">Create Template</Button>
            </BlockStack>
          ) : (
            <DataTable
              columnContentTypes={["text", "text", "text", "text"]}
              headings={["Name", "Applies To", "Sections", "Default"]}
              rows={rows}
            />
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}
