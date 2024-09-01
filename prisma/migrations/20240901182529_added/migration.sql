-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "encryptData" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isCreditTransaction" BOOLEAN DEFAULT false;
