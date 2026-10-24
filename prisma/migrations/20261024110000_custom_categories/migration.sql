CREATE TABLE "CustomCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "normalizedName" VARCHAR(80) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "icon" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomCategory_userId_type_normalizedName_key"
ON "CustomCategory"("userId", "type", "normalizedName");

ALTER TABLE "CustomCategory" ADD CONSTRAINT "CustomCategory_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("clerkUserId") ON DELETE CASCADE ON UPDATE CASCADE;
