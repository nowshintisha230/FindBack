-- AlterTable
ALTER TABLE "found_items" ADD COLUMN     "userPhoto" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "lost_items" ADD COLUMN     "userPhoto" TEXT NOT NULL DEFAULT '';
