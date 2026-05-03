-- CreateTable
CREATE TABLE "DescriptionTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sections" TEXT NOT NULL DEFAULT '[]',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "productType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "DescriptionTemplate_shopDomain_idx" ON "DescriptionTemplate"("shopDomain");

-- CreateIndex
CREATE INDEX "AuditLog_shopDomain_idx" ON "AuditLog"("shopDomain");

-- CreateIndex
CREATE INDEX "AuditLog_shopDomain_entityType_entityId_idx" ON "AuditLog"("shopDomain", "entityType", "entityId");
