import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData } from "@remix-run/react";
import { Page, Card, Text, BlockStack, ProgressBar } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { getMerchantConfig } from "~/services/supplier.service";

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const config = await getMerchantConfig(session.shop);
  return json({ config, currentStep: config?.onboardingStep ?? 0 });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const step = Number(formData.get("step"));

  // TODO: implement per-step logic via onboarding service
  void session;
  void step;

  return json({ success: true });
}

const STEPS = [
  "Niche & Categories",
  "Brand Voice",
  "Content Template",
  "Email Account",
  "Pricing Defaults",
];

export default function Onboarding() {
  const { currentStep } = useLoaderData<typeof loader>();
  useActionData<typeof action>();

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <Page title="Setup Wizard" narrowWidth>
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="300">
            <Text as="p" variant="bodyMd" tone="subdued">
              Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
            </Text>
            <ProgressBar progress={progress} size="small" />
          </BlockStack>
        </Card>

        <Card>
          <Text as="p" variant="bodyMd">
            {/* TODO: render step-specific form components */}
            Onboarding step {currentStep + 1} — {STEPS[currentStep]}
          </Text>
        </Card>
      </BlockStack>
    </Page>
  );
}
