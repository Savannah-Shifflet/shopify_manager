import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  json,
  unstable_parseMultipartFormData,
  unstable_createMemoryUploadHandler,
} from "@remix-run/node";
import { useLoaderData, useActionData } from "@remix-run/react";
import { Page, Card, Text, BlockStack, Button, Banner } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { z } from "zod";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  return json({ recentImports: [] });
}

const ScrapeSchema = z.object({
  url: z.string().url(),
});

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    // File upload
    const uploadHandler = unstable_createMemoryUploadHandler({
      maxPartSize: 10 * 1024 * 1024, // 10 MB
    });
    const formData = await unstable_parseMultipartFormData(
      request,
      uploadHandler,
    );
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return json({ error: "No file provided" }, { status: 422 });
    }

    // TODO: enqueue catalog-scrape job with file data
    void session;
    return json({
      success: true,
      message: "File upload queued for processing",
    });
  }

  // URL scrape
  const formData = await request.formData();
  const parsed = ScrapeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return json({ errors: parsed.error.flatten() }, { status: 422 });

  // TODO: enqueue catalog-scrape job with URL
  return json({ success: true, message: "URL scrape queued for processing" });
}

export default function Import() {
  const { recentImports } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <Page title="Import Products">
      <BlockStack gap="500">
        {"success" in (actionData ?? {}) && (
          <Banner tone="success">
            <Text as="p" variant="bodyMd">
              {"message" in (actionData ?? {})
                ? String((actionData as { message: string }).message)
                : "Import queued"}
            </Text>
          </Banner>
        )}

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Upload CSV / Excel
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Upload a supplier price sheet. Supported formats: .csv, .xlsx,
              .xls
            </Text>
            {/* TODO: implement DropZone file upload with column mapper UI */}
            <Button url="">Upload File</Button>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Scrape Supplier Website
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Point SourceDesk at a supplier catalog URL to extract products
              automatically.
            </Text>
            {/* TODO: implement URL input form */}
            <Button url="">Scrape URL</Button>
          </BlockStack>
        </Card>

        <Card>
          <Text as="h2" variant="headingMd">
            Recent Imports
          </Text>
          {recentImports.length === 0 && (
            <Text as="p" variant="bodyMd" tone="subdued">
              No imports yet.
            </Text>
          )}
        </Card>
      </BlockStack>
    </Page>
  );
}
