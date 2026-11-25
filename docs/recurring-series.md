# Recurring payment series

New recurring transactions retain their end mode (`never`, `date`, `count`).
Each member stores a server-assigned `recurringSeriesId`, immutable payment
number, and the shared end mode/count/end date. The first payment is number 1.
A unique database index prevents two payments with the same series and number.
Series metadata is updated together in a serializable transaction; the client
cannot choose a series ID or payment number. No extra table is required.

## Editing

- Reopening an installment restores its total payment count and displays its
  payment number. Copying creates a new series beginning at payment 1.
- Repeat settings apply to all existing members and future payments. A count
  cannot be below the highest number already created. Turning repeat off stops
  the entire series and retains historical numbering.
- Amount, text, category, date and tags edit only the selected transaction.
  Future payments inherit the latest member. For count schedules, the server
  calculates the final date from the latest member and remaining payments.
- Deleting a transaction does not renumber surviving payments. Use the recurring
  switch to stop a series, rather than relying on deletion to cancel it.
- Extending a schedule does not backfill missed historical payments. Generation
  remains daily for payments due that day, as before.

The scheduler creates the next numbered payment atomically with its credit
counterpart. Credit counterparts do not join the series. Only the latest member
can generate a successor; duplicate runs cannot exceed the total count. On the
last day of a short month, previous-month dates 29–31 are included and clamped.
New series also store `isLastDayOfMonth` (false by default, selected explicitly)
and `dayOfMonth` (the first payment's day). Fixed-day schedules clamp in shorter
months and then return to their anchor: January 31 → February 28 → March 31.
Month-end schedules always use the final calendar day: April 30 → May 31.
The first transaction retains its entered date, including for a one-payment
series; the rule applies to future payments. Changing the rule updates the
whole series and recalculates its count-based end date, without moving history.
The stored anchor survives edits to a member's date and month-end on/off changes;
a copied transaction starts a new anchor based on its new date.

Legacy rows have `isLastDayOfMonth = false` and `dayOfMonth = null`. Without an
anchor, the scheduler preserves their previous clamping behavior until edited.
No date is automatically interpreted as a request for month-end recurrence.
The scheduler scans the previous month and filters by the shared date helper,
so March 29–31 are processed even if February did not contain those day numbers.
The count preview and dashboard forecast follow the same monthly rule.

Existing transactions retain null series metadata. Their end-date recurrence
continues to work. Editing a legacy recurring transaction establishes a series
from that payment; historical transactions are never guessed or linked by date.
Legacy series do not receive the new numbered-series duplicate protection until
linked. No retroactive conversion of prior installment schedules is attempted.

## Backup and migration

Pre-change backups are ignored by Git and stored in `db_backups/`:

- `backup_before-recurring-series-pg16_2026-11-22T19-00-11.sql`
- `backup_before-recurring-series-pg16_2026-11-22T19-00-11.json`

Both contain 4,734 transactions. The SQL dump required the installed PostgreSQL
16 client. A first JSON-only snapshot also exists (4,733 transactions).

Verified on an isolated PostgreSQL 16 database on localhost:

1. Restore the SQL dump and apply `20261122190000_recurring_series`.
2. Compare every original scalar value and relation with the JSON snapshot:
   unchanged; all historical series fields are null.
3. Create numbered series and check duplicate/out-of-range database rejection.
4. Back up and restore the full database with series; compare all values/links.
5. Restore the pre-migration JSON into the new schema successfully.

The JSON format remains v2 because scalar transaction fields are already carried
through. Validation now rejects incomplete, inconsistent or duplicate series
metadata before any destructive restore work.

## Deployment by owner

The production database has NOT been migrated by this change. With Node 24 and
the intended database explicitly configured, run `npx prisma migrate deploy`
before deploying the code that reads the new fields. Generate the Prisma client
as part of the usual installation/build. Take a fresh backup if live data has
changed since the snapshots above: use PostgreSQL 16 `pg_dump` before migration,
as the regenerated Prisma backup client already expects the new fields.
No commits, pushes or deployments were made.

Verify creation, editing, copying, stopping and the final payment in the deployed
UI. Browser interaction was not authorized; visual browser QA is outstanding.

## Month-end follow-up (2026-11-25)

Fresh SQL backup: `db_backups/backup_before-month-end-rule_2026-11-25T10-10-15-151Z.sql`
(4,742 transactions). Restored to a separate localhost PostgreSQL 16 database.
Both pending migrations applied successfully; every original value and relation
was compared before/after with no differences. Verified full JSON backup/restore
with monthly rules and restoration of older JSON without the new fields.

The additional migration is `20261125101000_recurring_monthly_rule`. It adds only
the false-default flag, nullable anchor and a 1–31 database constraint. No live
migration was applied. Deploy both pending migrations before the new code.

Validation: the full 325-test suite and the added server-persistence regression passed;
24 calendar tests also passed with `TZ=America/New_York`; `npm run typecheck` and `git diff --check` passed.
