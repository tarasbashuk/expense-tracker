-- Existing rows stay unlinked: dates alone cannot identify historical series.
CREATE TYPE "RecurrenceEndMode" AS ENUM ('never', 'count', 'date');
ALTER TABLE "Transaction"
  ADD COLUMN "recurringSeriesId" TEXT,
  ADD COLUMN "recurrenceEndMode" "RecurrenceEndMode",
  ADD COLUMN "recurringPaymentCount" INTEGER,
  ADD COLUMN "recurringPaymentNumber" INTEGER;
CREATE INDEX "Transaction_userId_recurringSeriesId_idx"
  ON "Transaction"("userId", "recurringSeriesId");
CREATE UNIQUE INDEX "Transaction_recurringSeriesId_recurringPaymentNumber_key"
  ON "Transaction"("recurringSeriesId", "recurringPaymentNumber");
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurring_series_check" CHECK (
  ("recurringSeriesId" IS NULL AND "recurrenceEndMode" IS NULL
    AND "recurringPaymentCount" IS NULL AND "recurringPaymentNumber" IS NULL)
  OR
  ("recurringSeriesId" IS NOT NULL AND "recurrenceEndMode" IS NOT NULL
    AND "recurringPaymentNumber" IS NOT NULL AND "recurringPaymentNumber" >= 1
    AND (("recurrenceEndMode" = 'count' AND "recurringPaymentCount" IS NOT NULL
      AND "recurringPaymentCount" BETWEEN 1 AND 1200
      AND "recurringPaymentNumber" <= "recurringPaymentCount")
      OR ("recurrenceEndMode" <> 'count' AND "recurringPaymentCount" IS NULL)))
);
