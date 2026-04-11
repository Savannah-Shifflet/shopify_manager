import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Button,
  Badge,
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getMerchantConfig } from "~/services/supplier.service";
import { getEmailAccount } from "~/services/email.service";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const [config, emailAccount] = await Promise.all([
    getMerchantConfig(session.shop),
    getEmailAccount(session.shop),
  ]);
  return json({ config, emailAccount });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "disconnect-email") {
    // TODO: revoke tokens and delete email account record
    void session;
  }

  return json({ success: true });
}

export default function Settings() {
  const { config, emailAccount } = useLoaderData<typeof loader>();

  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Store Configuration</Text>
                <Text as="p" variant="bodyMd">
                  Niche: {config?.niche ?? "Not configured"}
                </Text>
                <Button url="/app/onboarding">Edit Configuration</Button>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Email Account</Text>
                {emailAccount ? (
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">
                      Connected: {emailAccount.email}
                    </Text>
                    <Badge tone="success">{emailAccount.provider}</Badge>
                    <form method="post">
                      <input type="hidden" name="intent" value="disconnect-email" />
                      <Button tone="critical" submit>Disconnect</Button>
                    </form>
                  </BlockStack>
                ) : (
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      No email account connected.
                    </Text>
                    <Button url="/auth/google">Connect Gmail</Button>
                    <Button url="/auth/microsoft">Connect Outlook</Button>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">Onboarding</Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Re-run the setup wizard to update your configuration.
              </Text>
              <Button url="/app/onboarding">Run Setup Wizard</Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
