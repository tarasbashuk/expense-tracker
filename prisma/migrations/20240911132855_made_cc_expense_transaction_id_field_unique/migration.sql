/*
  Warnings:

  - A unique constraint covering the columns `[CCExpenseTransactionId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Transaction_CCExpenseTransactionId_key" ON "Transaction"("CCExpenseTransactionId");
