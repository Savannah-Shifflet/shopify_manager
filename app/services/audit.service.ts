import db from "~/db.server";

export async function logAction(
  shopDomain: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        shopDomain,
        action,
        entityType,
        entityId,
        metadata: JSON.stringify(metadata),
      },
    });
  } catch (err) {
    console.error(
      { shopDomain, action, entityId, err },
      "Audit log write failed",
    );
  }
}

export async function getAuditLog(
  shopDomain: string,
  entityType: string,
  entityId: string,
  limit = 50,
) {
  return db.auditLog.findMany({
    where: { shopDomain, entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
