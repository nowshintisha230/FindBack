-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reporterName" TEXT NOT NULL DEFAULT '',
    "reporterEmail" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_itemType_itemId_idx" ON "reports"("itemType", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "reports_itemType_itemId_reporterId_key" ON "reports"("itemType", "itemId", "reporterId");
