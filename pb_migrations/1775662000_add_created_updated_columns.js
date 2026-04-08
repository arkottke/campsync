/// <reference path="../pb_data/types.d.ts" />

// Backfills missing system timestamps for base collections created with an older migration syntax.
// This keeps list sorting by "created" compatible with newer app code.

migrate((app) => {
  const tables = [
    "recipes",
    "ingredients",
    "trips",
    "trip_meals",
    "checklist_items",
    "supplies",
    "trip_vault_items",
    "vault_packs",
    "vault_pack_items",
  ]

  for (const table of tables) {
    try {
      app.db().newQuery(`ALTER TABLE ${table} ADD COLUMN created TEXT NOT NULL DEFAULT ''`).execute()
    } catch (_) {}

    try {
      app.db().newQuery(`ALTER TABLE ${table} ADD COLUMN updated TEXT NOT NULL DEFAULT ''`).execute()
    } catch (_) {}
  }
}, (app) => {
  // SQLite DROP COLUMN support depends on runtime version and this migration is a compatibility hotfix,
  // so keep rollback as no-op to avoid destructive schema changes.
})
