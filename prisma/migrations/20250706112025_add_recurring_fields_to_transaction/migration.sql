-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isRecurring" BOOLEAN DEFAULT false,
ADD COLUMN     "recurringEndDate" DATE;

-- CreateIndex
CREATE INDEX "Transaction_isRecurring_recurringEndDate_idx" ON "Transaction"("isRecurring", "recurringEndDate");
