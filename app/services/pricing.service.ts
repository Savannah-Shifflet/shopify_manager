import db from "~/db.server";
import type { PriceAlert, PricingRule } from "@prisma/client";

// ─── Price Alerts ───

export async function listPriceAlerts(
  shopDomain: string,
  filters: { status?: string } = {},
) {
  return db.priceAlert.findMany({
    where: {
      shopDomain,
      ...(filters.status ? { status: filters.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { title: true, sku: true } } },
  });
}

export async function createPriceAlert(
  shopDomain: string,
  data: {
    productId: string;
    oldPrice: string;
    newPrice: string;
    suggestedPrice?: string;
    mapViolation?: boolean;
  },
) {
  return db.priceAlert.create({
    data: {
      shopDomain,
      productId: data.productId,
      oldPrice: data.oldPrice,
      newPrice: data.newPrice,
      suggestedPrice: data.suggestedPrice,
      mapViolation: data.mapViolation ?? false,
    },
  });
}

export async function updatePriceAlertStatus(
  shopDomain: string,
  alertId: string,
  status: "approved" | "rejected" | "auto_applied",
) {
  return db.priceAlert.update({
    where: { id: alertId, shopDomain },
    data: { status },
  });
}

// ─── Pricing Rules ───

export async function listPricingRules(
  shopDomain: string,
): Promise<PricingRule[]> {
  return db.pricingRule.findMany({
    where: { shopDomain, active: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
}

export async function createPricingRule(
  shopDomain: string,
  data: {
    name: string;
    supplierId?: string;
    markupType: "percentage" | "fixed";
    markupValue: string;
    priority?: number;
  },
) {
  return db.pricingRule.create({
    data: {
      shopDomain,
      name: data.name,
      supplierId: data.supplierId,
      markupType: data.markupType,
      markupValue: data.markupValue,
      priority: data.priority ?? 0,
    },
  });
}

/**
 * Finds the highest-priority applicable rule for a product.
 * Supplier-specific rules take precedence over global rules.
 */
export async function fetchApplicableRule(
  shopDomain: string,
  supplierId?: string | null,
): Promise<PricingRule | null> {
  if (supplierId) {
    const supplierRule = await db.pricingRule.findFirst({
      where: { shopDomain, supplierId, active: true },
      orderBy: { priority: "desc" },
    });
    if (supplierRule) return supplierRule;
  }

  // Fall back to global rule (no supplierId)
  return db.pricingRule.findFirst({
    where: { shopDomain, supplierId: null, active: true },
    orderBy: { priority: "desc" },
  });
}

/**
 * Applies a pricing rule to a cost value and returns the suggested retail price.
 */
export function applyPricingRule(costStr: string, rule: PricingRule): number {
  const cost = parseFloat(costStr);
  const value = parseFloat(rule.markupValue);

  if (rule.markupType === "percentage") {
    return cost * (1 + value / 100);
  }
  return cost + value;
}

// ─── Price History ───

export async function recordPriceChange(
  shopDomain: string,
  productId: string,
  oldPrice: string,
  newPrice: string,
  source: "scrape" | "webhook" | "manual",
) {
  return db.priceHistory.create({
    data: { shopDomain, productId, oldPrice, newPrice, source },
  });
}

export async function getPriceHistory(
  shopDomain: string,
  productId: string,
  limit = 50,
) {
  return db.priceHistory.findMany({
    where: { shopDomain, productId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
