/*
  Warnings:

  - Made the column `amountDefaultCurrency` on table `Transaction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "amountDefaultCurrency" SET NOT NULL;
