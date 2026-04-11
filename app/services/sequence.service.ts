import db from "~/db.server";
import type { EmailSequence } from "@prisma/client";

// ─── Email sequences ───

export async function listSequences(shopDomain: string) {
  return db.emailSequence.findMany({
    where: { shopDomain },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function getSequenceById(shopDomain: string, id: string) {
  return db.emailSequence.findFirst({ where: { id, shopDomain } });
}

export async function createSequence(
  shopDomain: string,
  data: {
    name: string;
    steps: Array<{ dayOffset: number; subject: string; body: string }>;
    isDefault?: boolean;
  }
) {
  return db.emailSequence.create({
    data: {
      shopDomain,
      name: data.name,
      steps: JSON.stringify(data.steps),
      isDefault: data.isDefault ?? false,
    },
  });
}

// ─── Supplier sequence enrollment ───

export async function enrollSupplierInSequence(
  shopDomain: string,
  supplierId: string,
  sequenceId: string
) {
  // Check for existing active enrollment
  const existing = await db.supplierSequence.findFirst({
    where: { shopDomain, supplierId, status: "active" },
  });
  if (existing) return existing;

  return db.supplierSequence.create({
    data: { shopDomain, supplierId, sequenceId },
  });
}

export async function pauseSupplierSequence(shopDomain: string, supplierId: string) {
  return db.supplierSequence.updateMany({
    where: { shopDomain, supplierId, status: "active" },
    data: { status: "paused" },
  });
}

export async function completeSupplierSequence(shopDomain: string, supplierId: string) {
  return db.supplierSequence.updateMany({
    where: { shopDomain, supplierId, status: { in: ["active", "paused"] } },
    data: { status: "completed" },
  });
}

export async function getActiveSequenceForSupplier(shopDomain: string, supplierId: string) {
  return db.supplierSequence.findFirst({
    where: { shopDomain, supplierId, status: "active" },
    include: { sequence: true },
  });
}
