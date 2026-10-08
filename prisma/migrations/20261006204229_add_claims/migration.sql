-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "claimerId" TEXT NOT NULL,
    "claimerName" TEXT NOT NULL,
    "claimerEmail" TEXT NOT NULL,
    "claimerPhoto" TEXT NOT NULL DEFAULT '',
    "proof" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "claims_itemId_idx" ON "claims"("itemId");

-- CreateIndex
CREATE INDEX "claims_claimerId_idx" ON "claims"("claimerId");

-- CreateIndex
CREATE UNIQUE INDEX "claims_itemId_claimerId_key" ON "claims"("itemId", "claimerId");
