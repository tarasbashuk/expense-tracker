CREATE TABLE "QuickTransactionTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "category" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "type" "TransactionType" NOT NULL DEFAULT 'Expense',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickTransactionTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuickTransactionTemplate_userId_position_idx"
ON "QuickTransactionTemplate"("userId", "position");

ALTER TABLE "QuickTransactionTemplate"
ADD CONSTRAINT "QuickTransactionTemplate_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("clerkUserId")
ON DELETE CASCADE ON UPDATE CASCADE;
