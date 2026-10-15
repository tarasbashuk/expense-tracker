-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "normalizedName" VARCHAR(80) NOT NULL,
    "color" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_QuickTransactionTemplateToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_TagToTransaction" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_userId_normalizedName_key" ON "Tag"("userId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "_QuickTransactionTemplateToTag_AB_unique" ON "_QuickTransactionTemplateToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_QuickTransactionTemplateToTag_B_index" ON "_QuickTransactionTemplateToTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_TagToTransaction_AB_unique" ON "_TagToTransaction"("A", "B");

-- CreateIndex
CREATE INDEX "_TagToTransaction_B_index" ON "_TagToTransaction"("B");

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("clerkUserId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuickTransactionTemplateToTag" ADD CONSTRAINT "_QuickTransactionTemplateToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "QuickTransactionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuickTransactionTemplateToTag" ADD CONSTRAINT "_QuickTransactionTemplateToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTransaction" ADD CONSTRAINT "_TagToTransaction_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TagToTransaction" ADD CONSTRAINT "_TagToTransaction_B_fkey" FOREIGN KEY ("B") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

