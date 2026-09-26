# AI in monthly reports

The monthly cron adds two optional sections to the existing email:

- Possible duplicate groups with original dates, descriptions, amounts and currencies, plus an explanation. Transactions and totals are never modified.
- Up to five short observations with gentle humor and comparisons to the preceding month's expense categories. The AI sections follow the user's ENG/UKR setting; the existing report remains in English.

## Configuration

- `OPENAI_API_KEY`: the existing server-side key also enables monthly analysis.
- `OPENAI_MONTHLY_REPORT_MODEL`: optional; defaults to `gpt-5.4-mini`, matching the existing import integration's default.
- `MONTHLY_REPORT_AI_ENABLED=false`: disable AI and keep standard monthly reports.
- Existing Clerk, database, cron and email settings remain required. Encrypted accounts use Clerk's primary email address ID to decrypt records, consistently with the application's existing encryption scheme.

No database migration is needed. The cron still processes the last completed calendar month on the first of each month. Date boundaries use UTC and exclusive ends for the database's date-only field.

## Data and failure behavior

The report respects `creditCardTrackingEnabled` (defaults to false). When disabled, legacy `creditReceived` and `CCRepayment` records are excluded from both months before counting, decryption and analysis. A month containing only these hidden records is skipped. When enabled, they remain available for duplicate analysis, but are still excluded from ordinary income/expense totals.

The model receives all eligible report-month transactions (description, date, type, category, original amount/currency, converted amount and recurring flag), numbered with report-local references. It also receives computed expense category totals, counts, shares and changes, and aggregate income/expense totals. Previous-month raw transactions, email addresses, account IDs and database transaction IDs are not included.

Totals are computed with Decimal, excluding `CCRepayment` and `creditReceived`. A missing previous-month history is explicitly identified; changes against zero have a null percentage. Potential duplicates are searched within the report month only.

The request uses [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), `store: false`, a 35-second timeout and no automatic retries. Response shape and transaction references are validated, and text is HTML-escaped for email. Validation cannot guarantee the factual accuracy of generated commentary or duplicate suggestions.

Missing API keys, provider failures, refusals, incomplete/invalid output or inputs above 300,000 characters omit the AI sections and preserve the standard report. Oversized months are not partially analyzed. The cron declares a 60-second duration for the project's Vercel Hobby configuration. AI is only started when its full 35-second timeout fits within the first 45 seconds measured from invocation start, leaving 15 seconds for email and other report work. This does not bound database, email or yearly-report processing; larger user populations require queued or separately scheduled delivery. Prompts, responses and provider error bodies are not logged by the analysis helper.

If encrypted records cannot be decrypted, processing that user's report fails instead of sending encrypted or incorrect figures. The existing encryption scheme relies on an unchanged primary email address ID; this feature does not migrate keys.

## Verification

```bash
npm test -- tests/monthly-report.test.ts
npx tsc --noEmit
npx eslint src/lib/monthlyReport src/lib/monthlyReportEmail.ts src/app/api/cron/monthly-report/route.ts
```

Tests replace OpenAI, Clerk, database and email delivery with fixtures. They cover calendar boundaries, credit exclusions, decimal totals, comparison gaps, decryption, duplicate reference validation, HTML escaping, and successful/failing AI paths through the cron. They do not send email or call a live model.


## Recipients

Each monthly report is sent separately to every unique verified email currently
attached to the user's Clerk account. The AI analysis is generated once per
account and reused for all recipients. Unverified or removed addresses are not
used, and there is no fallback to the potentially stale database email if Clerk
is unavailable. A failed delivery to one address does not prevent delivery to
the others. `reportsSent` counts successful email submissions to the mail
transport, not accounts or confirmed inbox delivery. The yearly report's
recipient behavior is unchanged.
