import db from "~/db.server";
import type { MerchantConfig, Supplier, Product } from "@prisma/client";

// ─── Merchant Config ───

export async function getMerchantConfig(
  shopDomain: string,
): Promise<MerchantConfig | null> {
  return db.merchantConfig.findFirst({ where: { shopDomain } });
}

export async function upsertMerchantConfig(
  shopDomain: string,
  data: Partial<
    Omit<MerchantConfig, "id" | "shopDomain" | "createdAt" | "updatedAt">
  >,
) {
  return db.merchantConfig.upsert({
    where: { shopDomain },
    create: { shopDomain, ...data },
    update: data,
  });
}

// ─── Suppliers ───

export async function listSuppliers(
  shopDomain: string,
  filters: { status?: string } = {},
) {
  return db.supplier.findMany({
    where: {
      shopDomain,
      ...(filters.status ? { status: filters.status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSupplierById(
  shopDomain: string,
  id: string,
): Promise<Supplier | null> {
  return db.supplier.findFirst({ where: { id, shopDomain } });
}

export async function createSupplier(
  shopDomain: string,
  data: Pick<Supplier, "name"> &
    Partial<Omit<Supplier, "id" | "shopDomain" | "createdAt" | "updatedAt">>,
) {
  return db.supplier.create({
    data: { shopDomain, ...data },
  });
}

export async function updateSupplier(
  shopDomain: string,
  id: string,
  data: Partial<
    Omit<Supplier, "id" | "shopDomain" | "createdAt" | "updatedAt">
  >,
) {
  return db.supplier.update({
    where: { id, shopDomain },
    data,
  });
}

export async function updateSupplierStatus(
  shopDomain: string,
  id: string,
  status: string,
) {
  return db.supplier.update({
    where: { id, shopDomain },
    data: { status },
  });
}

// ─── Products ───

export async function listProducts(
  shopDomain: string,
  filters: {
    syncStatus?: string;
    enrichStatus?: string;
    supplierId?: string;
  } = {},
) {
  return db.product.findMany({
    where: {
      shopDomain,
      ...(filters.syncStatus ? { syncStatus: filters.syncStatus } : {}),
      ...(filters.enrichStatus ? { enrichStatus: filters.enrichStatus } : {}),
      ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProductById(
  shopDomain: string,
  id: string,
): Promise<Product | null> {
  return db.product.findFirst({ where: { id, shopDomain } });
}

export async function createProduct(
  shopDomain: string,
  data: Pick<Product, "title" | "sku" | "rawSource"> &
    Partial<Omit<Product, "id" | "shopDomain" | "createdAt" | "updatedAt">>,
) {
  return db.product.create({
    data: { shopDomain, ...data },
  });
}

export async function updateProduct(
  shopDomain: string,
  id: string,
  data: Partial<Omit<Product, "id" | "shopDomain" | "createdAt" | "updatedAt">>,
) {
  return db.product.update({
    where: { id, shopDomain },
    data,
  });
}

export async function getProductByShopifyId(
  shopDomain: string,
  shopifyId: string,
): Promise<Product | null> {
  return db.product.findFirst({ where: { shopifyId, shopDomain } });
}
