-- Keep historical dates and series unchanged; month-end is always opt-in.
ALTER TABLE "Transaction"
  ADD COLUMN "isLastDayOfMonth" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "dayOfMonth" INTEGER;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_dayOfMonth_check"
  CHECK ("dayOfMonth" IS NULL OR "dayOfMonth" BETWEEN 1 AND 31);
