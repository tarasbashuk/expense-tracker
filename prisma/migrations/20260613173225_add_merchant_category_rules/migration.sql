-- CreateTable
CREATE TABLE "MerchantCategoryRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchantPattern" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MerchantCategoryRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantCategoryRule_userId_idx" ON "MerchantCategoryRule"("userId");

-- CreateIndex
CREATE INDEX "MerchantCategoryRule_userId_updatedAt_idx" ON "MerchantCategoryRule"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantCategoryRule_userId_merchantPattern_key" ON "MerchantCategoryRule"("userId", "merchantPattern");

-- AddForeignKey
ALTER TABLE "MerchantCategoryRule" ADD CONSTRAINT "MerchantCategoryRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerkUserId") ON DELETE CASCADE ON UPDATE CASCADE;
