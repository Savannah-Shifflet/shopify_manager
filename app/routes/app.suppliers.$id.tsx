import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Text,
  TextField,
  Select,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import {
  getSupplierById,
  listProducts,
  updateSupplier,
} from "~/services/supplier.service";
import {
  enrollSupplierInSequence,
  listSequences,
} from "~/services/sequence.service";
import { z } from "zod";

type Contact = {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
};

type Note = { body: string; createdAt: string };

function parseJsonArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

const SYNC_STATUS_BADGE: Record<
  string,
  "info" | "success" | "warning" | "critical" | "new" | "attention"
> = {
  NEVER_SYNCED: "info",
  PENDING: "attention",
  SYNCED: "success",
  FAILED: "critical",
  OUT_OF_SYNC: "warning",
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const supplier = await getSupplierById(session.shop, params.id!);
  if (!supplier) throw new Response("Not Found", { status: 404 });

  const [products, sequences] = await Promise.all([
    listProducts(session.shop, { supplierId: supplier.id }),
    listSequences(session.shop),
  ]);

  return json({
    supplier,
    contacts: parseJsonArray<Contact>(supplier.contacts),
    notes: parseJsonArray<Note>(supplier.notes),
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      sku: p.sku,
      syncStatus: p.syncStatus,
    })),
    sequences: sequences.map((s) => ({ id: s.id, name: s.name })),
  });
}

const UpdateIntentSchema = z.object({
  intent: z.literal("update"),
  name: z.string().min(1).max(200),
  website: z.string().url().optional().or(z.literal("")),
  status: z.enum([
    "LEAD",
    "CONTACTED",
    "RESPONDED",
    "NEGOTIATING",
    "APPROVED",
    "REJECTED",
    "INACTIVE",
  ]),
});

const AddNoteIntentSchema = z.object({
  intent: z.literal("add-note"),
  body: z.string().min(1).max(2000),
});

const EnrollSequenceIntentSchema = z.object({
  intent: z.literal("enroll-sequence"),
  sequenceId: z.string().min(1),
});

const ActionSchema = z.discriminatedUnion("intent", [
  UpdateIntentSchema,
  AddNoteIntentSchema,
  EnrollSequenceIntentSchema,
]);

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const parsed = ActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return json({ errors: parsed.error.flatten() }, { status: 422 });

  const supplierId = params.id!;

  switch (parsed.data.intent) {
    case "update": {
      const { intent: _intent, ...updateData } = parsed.data;
      void _intent;
      await updateSupplier(session.shop, supplierId, updateData);
      return json({ success: true });
    }
    case "add-note": {
      const supplier = await getSupplierById(session.shop, supplierId);
      if (!supplier) throw new Response("Not Found", { status: 404 });
      const existing = parseJsonArray<Note>(supplier.notes);
      existing.push({
        body: parsed.data.body,
        createdAt: new Date().toISOString(),
      });
      await updateSupplier(session.shop, supplierId, {
        notes: JSON.stringify(existing),
      });
      return json({ success: true });
    }
    case "enroll-sequence": {
      await enrollSupplierInSequence(
        session.shop,
        supplierId,
        parsed.data.sequenceId,
      );
      return json({ success: true });
    }
  }
}

export default function SupplierDetail() {
  const { supplier, contacts, notes, products, sequences } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [noteBody, setNoteBody] = useState("");
  const [sequenceId, setSequenceId] = useState(sequences[0]?.id ?? "");

  const productRows = products.map((p) => [
    p.title,
    p.sku,
    <Badge tone={SYNC_STATUS_BADGE[p.syncStatus] ?? "info"} key={p.id}>
      {p.syncStatus}
    </Badge>,
  ]);

  const sequenceOptions = sequences.map((s) => ({
    label: s.name,
    value: s.id,
  }));

  return (
    <Page
      title={supplier.name}
      backAction={{ content: "Suppliers", url: "/app/suppliers" }}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {actionData && "errors" in actionData ? (
              <Banner tone="critical">Form submission failed.</Banner>
            ) : null}

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Overview
                </Text>
                <Text as="p" variant="bodyMd">
                  Website: {supplier.website ?? "—"}
                </Text>
                <Badge>{supplier.status}</Badge>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Products
                </Text>
                {productRows.length === 0 ? (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No products linked to this supplier yet.
                  </Text>
                ) : (
                  <DataTable
                    columnContentTypes={["text", "text", "text"]}
                    headings={["Title", "SKU", "Sync status"]}
                    rows={productRows}
                  />
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Enroll in sequence
                </Text>
                {sequences.length === 0 ? (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No sequences yet. Create one in Outreach.
                  </Text>
                ) : (
                  <Form method="post">
                    <input type="hidden" name="intent" value="enroll-sequence" />
                    <BlockStack gap="300">
                      <Select
                        label="Sequence"
                        options={sequenceOptions}
                        value={sequenceId}
                        onChange={setSequenceId}
                        name="sequenceId"
                      />
                      <InlineStack align="end">
                        <Button submit variant="primary">
                          Enroll
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Form>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Contacts
                </Text>
                {contacts.length === 0 ? (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No contacts yet.
                  </Text>
                ) : (
                  <BlockStack gap="200">
                    {contacts.map((c, i) => (
                      <BlockStack gap="100" key={i}>
                        <InlineStack gap="200" blockAlign="center">
                          <Text as="span" variant="bodyMd" fontWeight="semibold">
                            {c.name ?? "—"}
                          </Text>
                          {c.role ? <Badge>{c.role}</Badge> : null}
                        </InlineStack>
                        {c.email ? (
                          <Text as="span" variant="bodySm" tone="subdued">
                            {c.email}
                          </Text>
                        ) : null}
                        {c.phone ? (
                          <Text as="span" variant="bodySm" tone="subdued">
                            {c.phone}
                          </Text>
                        ) : null}
                      </BlockStack>
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Notes
                </Text>
                {notes.length === 0 ? (
                  <Text as="p" variant="bodyMd" tone="subdued">
                    No notes yet.
                  </Text>
                ) : (
                  <BlockStack gap="200">
                    {notes
                      .slice()
                      .reverse()
                      .map((n, i) => (
                        <BlockStack gap="100" key={i}>
                          <Text as="p" variant="bodyMd">
                            {n.body}
                          </Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {new Date(n.createdAt).toLocaleString()}
                          </Text>
                        </BlockStack>
                      ))}
                  </BlockStack>
                )}
                <Form method="post">
                  <input type="hidden" name="intent" value="add-note" />
                  <BlockStack gap="200">
                    <TextField
                      label="Add note"
                      name="body"
                      value={noteBody}
                      onChange={setNoteBody}
                      multiline={3}
                      autoComplete="off"
                    />
                    <InlineStack align="end">
                      <Button submit>Add note</Button>
                    </InlineStack>
                  </BlockStack>
                </Form>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
