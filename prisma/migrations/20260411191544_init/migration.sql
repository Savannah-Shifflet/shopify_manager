-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false
);

-- CreateTable
CREATE TABLE "MerchantConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "niche" TEXT,
    "categories" TEXT NOT NULL DEFAULT '[]',
    "brandVoice" TEXT NOT NULL DEFAULT '{}',
    "contentTemplate" TEXT NOT NULL DEFAULT '[]',
    "defaultMarkupPct" TEXT DEFAULT '40',
    "mapEnforcement" TEXT NOT NULL DEFAULT 'alert',
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "status" TEXT NOT NULL DEFAULT 'LEAD',
    "contacts" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '[]',
    "documents" TEXT NOT NULL DEFAULT '[]',
    "categories" TEXT NOT NULL DEFAULT '[]',
    "source" TEXT,
    "relevanceScore" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SupplierEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL,
    "messageId" TEXT,
    "threadId" TEXT,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupplierEmail_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmailSequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "steps" TEXT NOT NULL DEFAULT '[]',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SupplierSequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplierSequence_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupplierSequence_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "EmailSequence" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "supplierId" TEXT,
    "shopifyId" TEXT,
    "title" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "cost" TEXT,
    "msrp" TEXT,
    "mapPrice" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'NEVER_SYNCED',
    "syncHash" TEXT,
    "enrichStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "aiTitle" TEXT,
    "aiDescription" TEXT,
    "aiTags" TEXT NOT NULL DEFAULT '[]',
    "aiAttributes" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "rawSource" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "oldPrice" TEXT NOT NULL,
    "newPrice" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "oldPrice" TEXT NOT NULL,
    "newPrice" TEXT NOT NULL,
    "suggestedPrice" TEXT,
    "mapViolation" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PriceAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplierId" TEXT,
    "markupType" TEXT NOT NULL,
    "markupValue" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PriceMonitorConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopDomain" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "scrapeUrl" TEXT NOT NULL,
    "frequencyMs" INTEGER NOT NULL DEFAULT 21600000,
    "lastScrapedAt" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PriceMonitorConfig_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantConfig_shopDomain_key" ON "MerchantConfig"("shopDomain");

-- CreateIndex
CREATE INDEX "MerchantConfig_shopDomain_idx" ON "MerchantConfig"("shopDomain");

-- CreateIndex
CREATE INDEX "Supplier_shopDomain_idx" ON "Supplier"("shopDomain");

-- CreateIndex
CREATE INDEX "Supplier_shopDomain_status_idx" ON "Supplier"("shopDomain", "status");

-- CreateIndex
CREATE INDEX "SupplierEmail_shopDomain_idx" ON "SupplierEmail"("shopDomain");

-- CreateIndex
CREATE INDEX "SupplierEmail_shopDomain_supplierId_idx" ON "SupplierEmail"("shopDomain", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAccount_shopDomain_key" ON "EmailAccount"("shopDomain");

-- CreateIndex
CREATE INDEX "EmailAccount_shopDomain_idx" ON "EmailAccount"("shopDomain");

-- CreateIndex
CREATE INDEX "EmailSequence_shopDomain_idx" ON "EmailSequence"("shopDomain");

-- CreateIndex
CREATE INDEX "SupplierSequence_shopDomain_idx" ON "SupplierSequence"("shopDomain");

-- CreateIndex
CREATE INDEX "SupplierSequence_shopDomain_supplierId_idx" ON "SupplierSequence"("shopDomain", "supplierId");

-- CreateIndex
CREATE INDEX "Product_shopDomain_idx" ON "Product"("shopDomain");

-- CreateIndex
CREATE INDEX "Product_shopDomain_supplierId_idx" ON "Product"("shopDomain", "supplierId");

-- CreateIndex
CREATE INDEX "Product_shopDomain_syncStatus_idx" ON "Product"("shopDomain", "syncStatus");

-- CreateIndex
CREATE INDEX "Product_shopDomain_enrichStatus_idx" ON "Product"("shopDomain", "enrichStatus");

-- CreateIndex
CREATE INDEX "PriceHistory_shopDomain_productId_idx" ON "PriceHistory"("shopDomain", "productId");

-- CreateIndex
CREATE INDEX "PriceAlert_shopDomain_idx" ON "PriceAlert"("shopDomain");

-- CreateIndex
CREATE INDEX "PriceAlert_shopDomain_status_idx" ON "PriceAlert"("shopDomain", "status");

-- CreateIndex
CREATE INDEX "PricingRule_shopDomain_idx" ON "PricingRule"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "PriceMonitorConfig_supplierId_key" ON "PriceMonitorConfig"("supplierId");

-- CreateIndex
CREATE INDEX "PriceMonitorConfig_shopDomain_idx" ON "PriceMonitorConfig"("shopDomain");
