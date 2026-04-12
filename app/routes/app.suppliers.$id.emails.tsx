import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, Text, BlockStack, Button } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getSupplierById } from "~/services/supplier.service";
import { getEmailThread, sendOutreachEmail } from "~/services/email.service";
import { z } from "zod";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const supplier = await getSupplierById(session.shop, params.id!);
  if (!supplier) throw new Response("Not Found", { status: 404 });
  const thread = await getEmailThread(session.shop, params.id!);
  return json({ supplier, thread });
}

const SendSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const parsed = SendSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return json({ errors: parsed.error.flatten() }, { status: 422 });
  await sendOutreachEmail(session.shop, params.id!, parsed.data);
  return json({ success: true });
}

export default function SupplierEmails() {
  const { supplier, thread } = useLoaderData<typeof loader>();

  return (
    <Page
      title={`Emails — ${supplier.name}`}
      backAction={{ content: "Supplier", url: `/app/suppliers/${supplier.id}` }}
      primaryAction={{ content: "Compose", url: "" }}
    >
      <BlockStack gap="400">
        {thread.length === 0 ? (
          <Card>
            <Text as="p" variant="bodyMd" tone="subdued">
              No emails yet. Send the first outreach message.
            </Text>
          </Card>
        ) : (
          thread.map((email) => (
            <Card key={email.id}>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  {email.subject}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {email.direction === "sent" ? "Sent" : "Received"} ·{" "}
                  {new Date(email.sentAt).toLocaleString()}
                </Text>
                <Text as="p" variant="bodyMd">
                  {email.body}
                </Text>
              </BlockStack>
            </Card>
          ))
        )}
      </BlockStack>
    </Page>
  );
}
