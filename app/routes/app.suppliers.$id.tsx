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
  Tabs,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getSupplierById, updateSupplier } from "~/services/supplier.service";
import { z } from "zod";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const supplier = await getSupplierById(session.shop, params.id!);
  if (!supplier) throw new Response("Not Found", { status: 404 });
  return json({ supplier });
}

const UpdateSchema = z.object({
  name: z.string().min(1).max(200),
  website: z.string().url().optional().or(z.literal("")),
  status: z.enum(["LEAD","CONTACTED","RESPONDED","NEGOTIATING","APPROVED","REJECTED","INACTIVE"]),
  notes: z.string().optional(),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return json({ errors: parsed.error.flatten() }, { status: 422 });
  await updateSupplier(session.shop, params.id!, parsed.data);
  return json({ success: true });
}

export default function SupplierDetail() {
  const { supplier } = useLoaderData<typeof loader>();

  return (
    <Page
      title={supplier.name}
      backAction={{ content: "Suppliers", url: "/app/suppliers" }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Overview</Text>
                <Text as="p" variant="bodyMd">
                  Website: {supplier.website ?? "—"}
                </Text>
                <Badge>{supplier.status}</Badge>
              </BlockStack>
            </Card>

            <Card>
              <Text as="h2" variant="headingMd">
                Products
              </Text>
              {/* TODO: render linked products table */}
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Contacts</Text>
                {/* TODO: render contacts from supplier.contacts JSON */}
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Notes</Text>
                {/* TODO: render notes from supplier.notes JSON */}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
