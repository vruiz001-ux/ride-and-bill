-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "invitedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "billingCycleAnchor" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStart" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" DATETIME NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" DATETIME,
    "customSeats" INTEGER,
    "customInboxes" INTEGER,
    "customReceipts" INTEGER,
    "customRetentionDays" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsageCounter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UsageCounter_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "delta" INTEGER NOT NULL DEFAULT 1,
    "receiptId" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "emailAccountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "totalScanned" INTEGER NOT NULL DEFAULT 0,
    "newReceipts" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "SyncRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BillingEntity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "legalName" TEXT NOT NULL,
    "billingAddress" TEXT NOT NULL,
    "vatOrTaxId" TEXT,
    "contactEmail" TEXT,
    "preferredInvoiceCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "defaultMarkupPercent" REAL NOT NULL DEFAULT 5,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BillingEntity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BillingEntity_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BillingEntity" ("billingAddress", "contactEmail", "createdAt", "defaultMarkupPercent", "id", "legalName", "notes", "preferredInvoiceCurrency", "updatedAt", "userId", "vatOrTaxId") SELECT "billingAddress", "contactEmail", "createdAt", "defaultMarkupPercent", "id", "legalName", "notes", "preferredInvoiceCurrency", "updatedAt", "userId", "vatOrTaxId" FROM "BillingEntity";
DROP TABLE "BillingEntity";
ALTER TABLE "new_BillingEntity" RENAME TO "BillingEntity";
CREATE INDEX "BillingEntity_userId_idx" ON "BillingEntity"("userId");
CREATE INDEX "BillingEntity_workspaceId_idx" ON "BillingEntity"("workspaceId");
CREATE TABLE "new_ConnectedEmailAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "provider" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastSyncAt" DATETIME,
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',
    "totalImported" INTEGER NOT NULL DEFAULT 0,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConnectedEmailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConnectedEmailAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ConnectedEmailAccount" ("accessToken", "connectedAt", "email", "id", "lastSyncAt", "provider", "refreshToken", "status", "syncStatus", "totalImported", "userId") SELECT "accessToken", "connectedAt", "email", "id", "lastSyncAt", "provider", "refreshToken", "status", "syncStatus", "totalImported", "userId" FROM "ConnectedEmailAccount";
DROP TABLE "ConnectedEmailAccount";
ALTER TABLE "new_ConnectedEmailAccount" RENAME TO "ConnectedEmailAccount";
CREATE INDEX "ConnectedEmailAccount_userId_idx" ON "ConnectedEmailAccount"("userId");
CREATE INDEX "ConnectedEmailAccount_workspaceId_idx" ON "ConnectedEmailAccount"("workspaceId");
CREATE UNIQUE INDEX "ConnectedEmailAccount_userId_email_key" ON "ConnectedEmailAccount"("userId", "email");
CREATE TABLE "new_ExportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "filters" TEXT NOT NULL DEFAULT '{}',
    "fileUrl" TEXT,
    "receiptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "ExportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExportJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ExportJob" ("completedAt", "createdAt", "fileUrl", "filters", "format", "id", "receiptCount", "status", "userId") SELECT "completedAt", "createdAt", "fileUrl", "filters", "format", "id", "receiptCount", "status", "userId" FROM "ExportJob";
DROP TABLE "ExportJob";
ALTER TABLE "new_ExportJob" RENAME TO "ExportJob";
CREATE INDEX "ExportJob_userId_idx" ON "ExportJob"("userId");
CREATE INDEX "ExportJob_workspaceId_idx" ON "ExportJob"("workspaceId");
CREATE TABLE "new_InvoiceBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "billingEntityId" TEXT NOT NULL,
    "billingEntityName" TEXT NOT NULL,
    "invoiceCurrency" TEXT NOT NULL,
    "markupPercent" REAL NOT NULL,
    "subtotalOriginal" REAL NOT NULL,
    "subtotalConverted" REAL NOT NULL,
    "markupAmount" REAL NOT NULL,
    "totalInvoice" REAL NOT NULL,
    "receiptCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "exportFileUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceBatch_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "InvoiceBatch_billingEntityId_fkey" FOREIGN KEY ("billingEntityId") REFERENCES "BillingEntity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_InvoiceBatch" ("billingEntityId", "billingEntityName", "createdAt", "exportFileUrl", "id", "invoiceCurrency", "markupAmount", "markupPercent", "receiptCount", "status", "subtotalConverted", "subtotalOriginal", "totalInvoice", "userId") SELECT "billingEntityId", "billingEntityName", "createdAt", "exportFileUrl", "id", "invoiceCurrency", "markupAmount", "markupPercent", "receiptCount", "status", "subtotalConverted", "subtotalOriginal", "totalInvoice", "userId" FROM "InvoiceBatch";
DROP TABLE "InvoiceBatch";
ALTER TABLE "new_InvoiceBatch" RENAME TO "InvoiceBatch";
CREATE INDEX "InvoiceBatch_userId_idx" ON "InvoiceBatch"("userId");
CREATE INDEX "InvoiceBatch_workspaceId_idx" ON "InvoiceBatch"("workspaceId");
CREATE INDEX "InvoiceBatch_billingEntityId_idx" ON "InvoiceBatch"("billingEntityId");
CREATE TABLE "new_Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "provider" TEXT NOT NULL,
    "sourceEmailAccountId" TEXT NOT NULL,
    "sourceMessageId" TEXT NOT NULL,
    "receiptExternalId" TEXT,
    "tripDate" DATETIME NOT NULL,
    "importDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "country" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "pickupLocation" TEXT,
    "dropoffLocation" TEXT,
    "amountTotal" REAL NOT NULL,
    "amountTax" REAL,
    "currency" TEXT NOT NULL,
    "paymentMethodMasked" TEXT,
    "businessPurpose" TEXT,
    "notes" TEXT,
    "tags" TEXT NOT NULL DEFAULT '',
    "rawEmailSubject" TEXT NOT NULL,
    "rawEmailSender" TEXT NOT NULL,
    "originalFileUrl" TEXT,
    "normalizedPdfUrl" TEXT,
    "parserVersion" TEXT NOT NULL,
    "parsingConfidence" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'parsed',
    "originalAmount" REAL NOT NULL,
    "originalCurrency" TEXT NOT NULL,
    "fxRate" REAL,
    "fxRateDate" TEXT,
    "fxSource" TEXT,
    "markupPercent" REAL NOT NULL DEFAULT 5,
    "convertedAmount" REAL,
    "convertedCurrency" TEXT,
    "invoiceAmount" REAL,
    "invoiceCurrency" TEXT,
    "billingEntityId" TEXT,
    "conversionStatus" TEXT NOT NULL DEFAULT 'pending',
    "fallbackRateUsed" BOOLEAN NOT NULL DEFAULT false,
    "isRefunded" BOOLEAN NOT NULL DEFAULT false,
    "refundAmount" REAL,
    "netInvoiceAmount" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Receipt_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Receipt_billingEntityId_fkey" FOREIGN KEY ("billingEntityId") REFERENCES "BillingEntity" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Receipt" ("amountTax", "amountTotal", "billingEntityId", "businessPurpose", "city", "conversionStatus", "convertedAmount", "convertedCurrency", "country", "countryCode", "createdAt", "currency", "dropoffLocation", "fallbackRateUsed", "fxRate", "fxRateDate", "fxSource", "id", "importDate", "invoiceAmount", "invoiceCurrency", "isRefunded", "markupPercent", "netInvoiceAmount", "normalizedPdfUrl", "notes", "originalAmount", "originalCurrency", "originalFileUrl", "parserVersion", "parsingConfidence", "paymentMethodMasked", "pickupLocation", "provider", "rawEmailSender", "rawEmailSubject", "receiptExternalId", "refundAmount", "sourceEmailAccountId", "sourceMessageId", "status", "tags", "tripDate", "updatedAt", "userId") SELECT "amountTax", "amountTotal", "billingEntityId", "businessPurpose", "city", "conversionStatus", "convertedAmount", "convertedCurrency", "country", "countryCode", "createdAt", "currency", "dropoffLocation", "fallbackRateUsed", "fxRate", "fxRateDate", "fxSource", "id", "importDate", "invoiceAmount", "invoiceCurrency", "isRefunded", "markupPercent", "netInvoiceAmount", "normalizedPdfUrl", "notes", "originalAmount", "originalCurrency", "originalFileUrl", "parserVersion", "parsingConfidence", "paymentMethodMasked", "pickupLocation", "provider", "rawEmailSender", "rawEmailSubject", "receiptExternalId", "refundAmount", "sourceEmailAccountId", "sourceMessageId", "status", "tags", "tripDate", "updatedAt", "userId" FROM "Receipt";
DROP TABLE "Receipt";
ALTER TABLE "new_Receipt" RENAME TO "Receipt";
CREATE UNIQUE INDEX "Receipt_sourceMessageId_key" ON "Receipt"("sourceMessageId");
CREATE INDEX "Receipt_userId_tripDate_idx" ON "Receipt"("userId", "tripDate");
CREATE INDEX "Receipt_userId_provider_idx" ON "Receipt"("userId", "provider");
CREATE INDEX "Receipt_userId_country_idx" ON "Receipt"("userId", "country");
CREATE INDEX "Receipt_workspaceId_tripDate_idx" ON "Receipt"("workspaceId", "tripDate");
CREATE INDEX "Receipt_workspaceId_idx" ON "Receipt"("workspaceId");
CREATE INDEX "Receipt_billingEntityId_idx" ON "Receipt"("billingEntityId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Workspace_ownerUserId_idx" ON "Workspace"("ownerUserId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "UsageCounter_workspaceId_metric_idx" ON "UsageCounter"("workspaceId", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "UsageCounter_workspaceId_metric_periodStart_key" ON "UsageCounter"("workspaceId", "metric", "periodStart");

-- CreateIndex
CREATE INDEX "UsageEvent_workspaceId_metric_createdAt_idx" ON "UsageEvent"("workspaceId", "metric", "createdAt");

-- CreateIndex
CREATE INDEX "SyncRun_workspaceId_idx" ON "SyncRun"("workspaceId");

-- CreateIndex
CREATE INDEX "SyncRun_emailAccountId_idx" ON "SyncRun"("emailAccountId");

