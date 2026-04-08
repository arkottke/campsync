/// <reference path="../pb_data/types.d.ts" />

// Creates all application collections with their final schema (consolidated snapshot).
// Replaces the original split create/update migration files.

migrate((app) => {
  const authRules = {
    listRule:   "@request.auth.id != \"\"",
    viewRule:   "@request.auth.id != \"\"",
    createRule: "@request.auth.id != \"\"",
    updateRule: "@request.auth.id != \"\"",
    deleteRule: "@request.auth.id != \"\"",
  }

  function applyRules(col) {
    Object.assign(col, authRules)
  }

  // ── recipes ────────────────────────────────────────────────────────────────
  const recipes = new Collection({ type: "base", name: "recipes" })
  applyRules(recipes)
  recipes.fields.add(new TextField({ name: "name", required: true }))
  recipes.fields.add(new EditorField({ name: "instructions", required: true }))
  recipes.fields.add(new SelectField({ name: "category", required: true, maxSelect: 1, values: ["Breakfast", "Lunch", "Dinner", "Snack"] }))
  recipes.fields.add(new NumberField({ name: "servings", min: 1 }))
  app.save(recipes)

  // ── ingredients ────────────────────────────────────────────────────────────
  const ingredients = new Collection({ type: "base", name: "ingredients" })
  applyRules(ingredients)
  ingredients.fields.add(new TextField({ name: "item_name", required: true }))
  ingredients.fields.add(new NumberField({ name: "quantity", required: true }))
  ingredients.fields.add(new TextField({ name: "unit" }))
  ingredients.fields.add(new SelectField({ name: "storage_type", required: true, maxSelect: 1, values: ["Cooler", "Dry Box", "Trailer Bin", "Gear"] }))
  ingredients.fields.add(new BoolField({ name: "optional" }))
  app.save(ingredients)

  // ── trips ──────────────────────────────────────────────────────────────────
  const trips = new Collection({ type: "base", name: "trips" })
  applyRules(trips)
  trips.fields.add(new TextField({ name: "name" }))
  trips.fields.add(new DateField({ name: "start_date" }))
  trips.fields.add(new DateField({ name: "end_date" }))
  trips.fields.add(new NumberField({ name: "guest_count", min: 1 }))
  trips.fields.add(new JSONField({ name: "people", maxSize: 2000000 }))
  app.save(trips)

  // ── trip_meals ─────────────────────────────────────────────────────────────
  const tripMeals = new Collection({ type: "base", name: "trip_meals" })
  applyRules(tripMeals)
  tripMeals.fields.add(new DateField({ name: "date", required: true }))
  tripMeals.fields.add(new SelectField({ name: "meal_slot", required: true, maxSelect: 1, values: ["B", "L", "D", "S"] }))
  app.save(tripMeals)

  // ── checklist_items ────────────────────────────────────────────────────────
  const checklistItems = new Collection({ type: "base", name: "checklist_items" })
  applyRules(checklistItems)
  checklistItems.fields.add(new TextField({ name: "item_name", required: true }))
  checklistItems.fields.add(new NumberField({ name: "quantity", required: true }))
  checklistItems.fields.add(new TextField({ name: "unit" }))
  checklistItems.fields.add(new SelectField({ name: "storage_type", required: true, maxSelect: 1, values: ["Cooler", "Dry Box", "Trailer Bin", "Gear"] }))
  checklistItems.fields.add(new BoolField({ name: "checked" }))
  checklistItems.fields.add(new TextField({ name: "checked_by" }))
  checklistItems.fields.add(new BoolField({ name: "is_grocery" }))
  app.save(checklistItems)

  // ── supplies ───────────────────────────────────────────────────────────────
  const supplies = new Collection({ type: "base", name: "supplies" })
  applyRules(supplies)
  supplies.fields.add(new TextField({ name: "name", required: true }))
  supplies.fields.add(new TextField({ name: "category", required: true }))
  supplies.fields.add(new BoolField({ name: "checked" }))
  supplies.fields.add(new TextField({ name: "checked_by" }))
  app.save(supplies)

  // ── trip_vault_items ───────────────────────────────────────────────────────
  const tripVaultItems = new Collection({ type: "base", name: "trip_vault_items" })
  applyRules(tripVaultItems)
  tripVaultItems.fields.add(new TextField({ name: "name", required: true }))
  tripVaultItems.fields.add(new NumberField({ name: "quantity", required: true, min: 0 }))
  tripVaultItems.fields.add(new SelectField({ name: "quantity_type", required: true, maxSelect: 1, values: ["per_day", "total"] }))
  tripVaultItems.fields.add(new BoolField({ name: "checked" }))
  tripVaultItems.fields.add(new TextField({ name: "checked_by" }))
  tripVaultItems.fields.add(new TextField({ name: "person_id" }))
  tripVaultItems.fields.add(new TextField({ name: "source_pack_id" }))
  tripVaultItems.fields.add(new SelectField({ name: "list_type", maxSelect: 1, values: ["gear", "pantry"] }))
  app.save(tripVaultItems)

  // ── vault_packs ────────────────────────────────────────────────────────────
  const vaultPacks = new Collection({ type: "base", name: "vault_packs" })
  applyRules(vaultPacks)
  vaultPacks.fields.add(new TextField({ name: "name", required: true }))
  vaultPacks.fields.add(new SelectField({ name: "category", required: true, maxSelect: 1, values: ["gear", "clothing", "kids", "pantry"] }))
  app.save(vaultPacks)

  // ── vault_pack_items ───────────────────────────────────────────────────────
  const vaultPackItems = new Collection({ type: "base", name: "vault_pack_items" })
  applyRules(vaultPackItems)
  vaultPackItems.fields.add(new TextField({ name: "name", required: true }))
  vaultPackItems.fields.add(new NumberField({ name: "quantity", required: true }))
  vaultPackItems.fields.add(new SelectField({ name: "quantity_type", required: true, maxSelect: 1, values: ["per_day", "total"] }))
  app.save(vaultPackItems)

  // ── Relation fields ────────────────────────────────────────────────────────
  // Load saved collections for their IDs
  const recipesColl       = app.findCollectionByNameOrId("recipes")
  const ingredientsColl   = app.findCollectionByNameOrId("ingredients")
  const tripsColl         = app.findCollectionByNameOrId("trips")
  const tripMealsColl     = app.findCollectionByNameOrId("trip_meals")
  const checklistColl     = app.findCollectionByNameOrId("checklist_items")
  const suppliesColl      = app.findCollectionByNameOrId("supplies")
  const tviColl           = app.findCollectionByNameOrId("trip_vault_items")
  const vaultPacksColl    = app.findCollectionByNameOrId("vault_packs")
  const vaultPackItemsColl = app.findCollectionByNameOrId("vault_pack_items")

  // ingredients.recipe_id → recipes (cascade delete)
  ingredientsColl.fields.add(new RelationField({ name: "recipe_id", required: true, collectionId: recipesColl.id, cascadeDelete: true, maxSelect: 1 }))
  app.save(ingredientsColl)

  // recipes.owner_id → users
  recipesColl.fields.add(new RelationField({ name: "owner_id", required: true, collectionId: "_pb_users_auth_", cascadeDelete: false, maxSelect: 1 }))
  app.save(recipesColl)

  // trips.members → users (multi)
  tripsColl.fields.add(new RelationField({ name: "members", required: true, collectionId: "_pb_users_auth_", cascadeDelete: false }))
  app.save(tripsColl)

  // trip_meals.trip_id → trips (cascade), trip_meals.recipe_id → recipes
  tripMealsColl.fields.add(new RelationField({ name: "trip_id", required: true, collectionId: tripsColl.id, cascadeDelete: true, maxSelect: 1 }))
  tripMealsColl.fields.add(new RelationField({ name: "recipe_id", required: true, collectionId: recipesColl.id, cascadeDelete: false, maxSelect: 1 }))
  app.save(tripMealsColl)

  // checklist_items.trip_id → trips (cascade)
  checklistColl.fields.add(new RelationField({ name: "trip_id", required: true, collectionId: tripsColl.id, cascadeDelete: true, maxSelect: 1 }))
  app.save(checklistColl)

  // supplies.trip_id → trips (cascade)
  suppliesColl.fields.add(new RelationField({ name: "trip_id", required: true, collectionId: tripsColl.id, cascadeDelete: true, maxSelect: 1 }))
  app.save(suppliesColl)

  // trip_vault_items.trip_id → trips (cascade)
  tviColl.fields.add(new RelationField({ name: "trip_id", required: true, collectionId: tripsColl.id, cascadeDelete: true, maxSelect: 1 }))
  app.save(tviColl)

  // vault_packs.owner_id → users (cascade)
  vaultPacksColl.fields.add(new RelationField({ name: "owner_id", required: true, collectionId: "_pb_users_auth_", cascadeDelete: true, maxSelect: 1 }))
  app.save(vaultPacksColl)

  // vault_pack_items.pack_id → vault_packs (cascade)
  vaultPackItemsColl.fields.add(new RelationField({ name: "pack_id", required: true, collectionId: vaultPacksColl.id, cascadeDelete: true, maxSelect: 1 }))
  app.save(vaultPackItemsColl)

}, (app) => {
  // Drop all app collections (child-first to avoid constraint issues)
  const names = [
    "vault_pack_items", "vault_packs",
    "trip_vault_items", "supplies", "checklist_items", "trip_meals",
    "ingredients", "trips", "recipes",
  ]
  for (const name of names) {
    try {
      app.delete(app.findCollectionByNameOrId(name))
    } catch (_) {}
  }
})
