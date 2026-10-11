# Transaction tags rollout

Implementation is on `codex/transaction-tags`; no commits, pushes, remote changes,
production migrations or deployments were performed.

## Backup and migration

Before editing the schema, the original `scripts/backup-db-prisma.js` created:

`db_backups/backup_before-transaction-tags_2026-10-11T15-49-52.json`

The configured target was a remote Neon PostgreSQL database named
`expense_tracker` (treated as production). Credentials were not printed.
The JSON parses successfully and contains every pre-change Prisma model:
4 users, 4483 transactions, 4 settings, 309 merchant rules, 2 quick templates.
The optional SQL backup failed; the verified JSON backup succeeded. The JSON is
local and ignored by Git.

`prisma/migrations/20261011160000_transaction_tags/migration.sql` was generated
by comparing schema files offline. It adds `Tag` and two relation tables, their
indexes and foreign keys. It does not update financial records. All existing
transactions initially have no tags. Deleting a tag cascades only to relation
rows, not transactions or templates. The migration has not been applied to any
actual database.

New backup format v2 includes all six models, `transactionTags` and `templateTags`,
read in one consistent snapshot. Restore accepts legacy backups without any tag
fields. New-format backups with incomplete, foreign or invalid links fail before
any deletion. Restore performs all replacements in one database transaction.
As before, restore replaces the target database: use an isolated test database
for verification. The updated backup script requires the new schema; use the
pre-migration script on a database that has not received this migration.

## Behavior

Names are trimmed, NFC-normalized, limited to 40 UTF-16 code units, and unique
per owner after lowercasing. Six fixed palettes use contrasting dark text.
Tag selection is optional and limited to two by both UI and server validation.
Transaction edits and tag changes are atomic. Templates preserve their order,
amount/currency handling and tags; tag deletion leaves templates usable.
Recurring copies retain tags without changing recurrence or currency rules.

Tag filters use OR within selected tags and AND with other filters. Empty
selection means all transactions, including untagged ones. Existing applied/draft
behavior, search updates, period totals, sorting and day grouping are preserved.

## Before deployment (owner actions)

1. Use Node 24. Apply the migration to an isolated test database and generate the
   Prisma client (`npx prisma migrate deploy`, `npx prisma generate`, with the
   test database explicitly configured). Verify old-backup restore and a v2
   backup/restore round trip there. No live restore was run by the agent.
2. Start the application against that test database. Manually open home, history
   (list/table), transaction editor, tag manager and filters. Check 390/393/402 px
   and desktop; empty states, long names, emoji, two currencies, zero/one/two tags,
   rename/delete, repeated transactions and templates. Browser navigation and
   viewport changes were not authorized, so screenshot-based visual QA remains
   outstanding. DOM/component checks do not replace this visual verification.
3. Review the diff, retain the verified backup, commit/push using your normal
   workflow, and apply the additive migration before deploying code that reads
   the new relations. Obtain a fresh pre-migration backup if production data has
   changed since this backup.

The production build test gate (`npm test && next build`) is unchanged.
