# DATABASE_MIGRATION_POLICY.md
**Version:** 1.0  
**Last Updated:** 2026-07-31  
**Status:** Active — applies to all TutorSnap database schema changes

---

## Purpose

This document defines the database migration discipline for TutorSnap. Every schema change must follow this policy to ensure data integrity, zero-downtime deployments, and safe rollback capability.

---

## Migration Requirements

Every database migration must include all of the following before it is considered complete.

| Requirement | Description |
|---|---|
| **Forward migration** | The SQL that applies the change |
| **Rollback migration** | The SQL that reverses the change, or a compensating migration if full reversal is not possible |
| **Data backfill strategy** | How existing rows are updated to be compatible with the new schema |
| **Compatibility analysis** | Which app versions and API endpoints depend on the affected tables |
| **Backup requirement** | Whether a database backup must be taken before the migration runs (required for all destructive changes) |
| **Validation query** | A SQL query that verifies the migration applied correctly |
| **Failure recovery procedure** | The exact steps to take if the migration fails mid-execution |

A migration that is missing any of these items must not be merged or applied to production.

---

## Expand-and-Contract Pattern

For breaking schema changes — renaming a column, changing a column type, removing a column, splitting a table — the expand-and-contract pattern is mandatory.

**Phase 1 — Expand.** Add the new column or table alongside the existing one. Update the application to write to both the old and new locations simultaneously. Deploy this change. The old app versions continue reading the old location; the new app version reads the new location.

**Phase 2 — Migrate.** Run a backfill script to copy data from the old location to the new location for all existing rows. Verify the backfill with the validation query.

**Phase 3 — Contract.** Once the new app version has been adopted by a sufficient percentage of users (recommended: 95% of active users), remove the old column or table. Update the application to write only to the new location.

This pattern ensures that no app version ever reads a column that no longer exists.

---

## Prohibited Operations

The following operations are prohibited on tables that active app versions depend on:

- Renaming a column without first adding the new column name alongside the old one (expand-and-contract required)
- Dropping a column without first verifying no active app version reads it
- Changing a column's data type in a way that is not backward-compatible (e.g., narrowing a varchar, changing integer to boolean)
- Adding a NOT NULL constraint to an existing column without providing a default value
- Dropping a table without first verifying no active app version references it

---

## Migration File Naming Convention

```
NNNN_description_of_change.sql
```

Where `NNNN` is a zero-padded sequential number. Example: `0015_add_classroom_archived_at.sql`.

Every migration file must begin with a header comment:

```sql
-- Migration: 0015_add_classroom_archived_at
-- Date: 2026-07-31
-- Author: [admin name or "system"]
-- Description: Adds soft-delete support to classrooms table
-- Affected tables: classrooms
-- Affected app versions: all
-- Rollback: ALTER TABLE classrooms DROP COLUMN IF EXISTS archived_at, DROP COLUMN IF EXISTS archived_by;
-- Validation: SELECT COUNT(*) FROM classrooms WHERE archived_at IS NOT NULL; -- should be 0 after migration
-- Backup required: no (additive change only)
```

---

## Production Migration Procedure

1. Take a database backup if the migration is destructive or modifies existing data.
2. Run the migration against the staging database first.
3. Run the validation query against staging to confirm correct application.
4. Deploy the new application code to staging and verify it works with the migrated schema.
5. Apply the migration to production during a low-traffic window.
6. Run the validation query against production.
7. Monitor error rates for 30 minutes after the migration.
8. If errors appear, execute the rollback migration immediately.

---

## Backfill Scripts

For migrations that require updating existing rows, a separate backfill script must be written and run independently of the schema migration. Backfill scripts must:

- Process rows in batches (maximum 1,000 rows per batch) to avoid locking the table
- Include a progress log (rows processed, rows remaining)
- Be idempotent (safe to run multiple times without producing incorrect results)
- Include a dry-run mode that reports what would be changed without making changes
