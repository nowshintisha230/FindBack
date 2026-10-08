-- AlterTable
ALTER TABLE "found_items" ADD COLUMN     "returnedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'open';

-- AlterTable
ALTER TABLE "lost_items" ADD COLUMN     "returnedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'open';

-- CreateIndex
CREATE INDEX "found_items_status_idx" ON "found_items"("status");

-- CreateIndex
CREATE INDEX "lost_items_status_idx" ON "lost_items"("status");
