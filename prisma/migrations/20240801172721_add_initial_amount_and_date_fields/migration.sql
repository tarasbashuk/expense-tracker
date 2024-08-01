-- Step 1: Add the new columns as optional
ALTER TABLE "Settings" ADD COLUMN "initialAmount" DOUBLE PRECISION;
ALTER TABLE "Transaction" ADD COLUMN "amountDefaultCurrency" DOUBLE PRECISION;
ALTER TABLE "Transaction" ADD COLUMN "date" DATE;

-- Step 2: Update existing records with default values
UPDATE "Settings" SET "initialAmount" = 0.0 WHERE "initialAmount" IS NULL;
UPDATE "Transaction" SET "date" = DATE("createdAt") WHERE "date" IS NULL;

-- Step 3: Make the new columns required
ALTER TABLE "Settings" ALTER COLUMN "initialAmount" SET NOT NULL;
ALTER TABLE "Transaction" ALTER COLUMN "date" SET NOT NULL;

-- Ensure no null values in 'currency' before making it required
UPDATE "Transaction" SET "currency" = 'EUR' WHERE "currency" IS NULL;

-- Step 4: Make 'currency' column required
ALTER TABLE "Transaction" ALTER COLUMN "currency" SET NOT NULL;
