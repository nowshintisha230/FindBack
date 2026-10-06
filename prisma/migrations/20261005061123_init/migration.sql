-- CreateTable
CREATE TABLE "lost_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "phone" TEXT NOT NULL,
    "reward" TEXT NOT NULL DEFAULT '',
    "images" TEXT[],
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL DEFAULT '',
    "userEmail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lost_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "found_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "phone" TEXT NOT NULL,
    "reward" TEXT NOT NULL DEFAULT '',
    "images" TEXT[],
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL DEFAULT '',
    "userEmail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "found_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lost_items_date_idx" ON "lost_items"("date");

-- CreateIndex
CREATE INDEX "lost_items_userId_idx" ON "lost_items"("userId");

-- CreateIndex
CREATE INDEX "found_items_date_idx" ON "found_items"("date");

-- CreateIndex
CREATE INDEX "found_items_userId_idx" ON "found_items"("userId");
