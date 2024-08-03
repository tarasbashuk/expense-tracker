-- Add new clerkUserId column to Settings
ALTER TABLE "Settings" ADD COLUMN "clerkUserId" TEXT;

-- Update clerkUserId with values from userId
UPDATE "Settings" SET "clerkUserId" = (SELECT "clerkUserId" FROM "User" WHERE "User"."id" = "Settings"."userId");

-- Remove userId column from Settings
ALTER TABLE "Settings" DROP COLUMN "userId";

-- Make clerkUserId non-nullable
ALTER TABLE "Settings" ALTER COLUMN "clerkUserId" SET NOT NULL;
