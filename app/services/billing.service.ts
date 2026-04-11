/**
 * Shopify billing service
 * Handles 3-tier subscription via appSubscriptionCreate GraphQL mutation.
 *
 * Tiers:
 *   Starter  — $29/mo, 500 AI credits
 *   Growth   — $79/mo, 2,000 AI credits
 *   Pro      — $199/mo, unlimited AI credits
 *
 * Usage-based overage: AI credits above tier limit billed at $0.05/credit.
 */

export const PLANS = {
  STARTER: {
    name: "Starter",
    price: "29.00",
    currency: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 14,
    aiCredits: 500,
  },
  GROWTH: {
    name: "Growth",
    price: "79.00",
    currency: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 14,
    aiCredits: 2000,
  },
  PRO: {
    name: "Pro",
    price: "199.00",
    currency: "USD",
    interval: "EVERY_30_DAYS",
    trialDays: 14,
    aiCredits: Infinity,
  },
} as const;

type PlanKey = keyof typeof PLANS;

type GraphQLClient = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

const CREATE_SUBSCRIPTION_MUTATION = `#graphql
  mutation AppSubscriptionCreate(
    $name: String!
    $lineItems: [AppSubscriptionLineItemInput!]!
    $returnUrl: String!
    $trialDays: Int
  ) {
    appSubscriptionCreate(
      name: $name
      lineItems: $lineItems
      returnUrl: $returnUrl
      trialDays: $trialDays
    ) {
      appSubscription { id status }
      confirmationUrl
      userErrors { field message }
    }
  }
`;

/**
 * Creates a Shopify app subscription and returns the confirmation URL.
 * Merchant is redirected to this URL to approve billing.
 */
export async function createSubscription(
  admin: GraphQLClient,
  planKey: PlanKey,
  returnUrl: string
) {
  const plan = PLANS[planKey];

  const response = await admin.graphql(CREATE_SUBSCRIPTION_MUTATION, {
    variables: {
      name: `SourceDesk ${plan.name}`,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: plan.price, currencyCode: plan.currency },
              interval: plan.interval,
            },
          },
        },
      ],
      returnUrl,
      trialDays: plan.trialDays,
    },
  });

  const data = (await response.json()) as {
    data: {
      appSubscriptionCreate: {
        appSubscription: { id: string; status: string } | null;
        confirmationUrl: string | null;
        userErrors: Array<{ field: string; message: string }>;
      };
    };
  };

  const result = data.data.appSubscriptionCreate;
  if (result.userErrors.length > 0) {
    throw new Error(`Billing error: ${JSON.stringify(result.userErrors)}`);
  }

  return {
    subscriptionId: result.appSubscription?.id,
    confirmationUrl: result.confirmationUrl,
  };
}
