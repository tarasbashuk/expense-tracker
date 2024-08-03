/*
  Warnings:

  - A unique constraint covering the columns `[clerkUserId]` on the table `Settings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Settings_clerkUserId_key" ON "Settings"("clerkUserId");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_clerkUserId_fkey" FOREIGN KEY ("clerkUserId") REFERENCES "User"("clerkUserId") ON DELETE CASCADE ON UPDATE CASCADE;
