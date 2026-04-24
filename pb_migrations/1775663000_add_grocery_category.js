/// <reference path="../pb_data/types.d.ts" />

// Adds grocery_category field to ingredients and checklist_items collections.
// Values: Produce, Dairy, Meat, Frozen, Beverages, Pantry, Bakery, Condiments, Snacks, Other

migrate((app) => {
  const groceryCategoryField = {
    name: "grocery_category",
    maxSelect: 1,
    values: ["Produce", "Dairy", "Meat", "Frozen", "Beverages", "Pantry", "Bakery", "Condiments", "Snacks", "Other"],
  }

  const ingredients = app.findCollectionByNameOrId("ingredients")
  ingredients.fields.add(new SelectField(groceryCategoryField))
  app.save(ingredients)

  const checklistItems = app.findCollectionByNameOrId("checklist_items")
  checklistItems.fields.add(new SelectField(groceryCategoryField))
  app.save(checklistItems)
}, (app) => {
  const ingredients = app.findCollectionByNameOrId("ingredients")
  const f1 = ingredients.fields.getByName("grocery_category")
  if (f1) ingredients.fields.removeById(f1.id)
  app.save(ingredients)

  const checklistItems = app.findCollectionByNameOrId("checklist_items")
  const f2 = checklistItems.fields.getByName("grocery_category")
  if (f2) checklistItems.fields.removeById(f2.id)
  app.save(checklistItems)
})
