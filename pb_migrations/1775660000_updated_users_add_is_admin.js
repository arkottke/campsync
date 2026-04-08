/// <reference path="../pb_data/types.d.ts" />

// Adds the is_admin field to the users collection and tightens access rules
// so that only admin users can list/create/delete accounts.

migrate((app) => {
  const collection = app.findCollectionByNameOrId("users")

  collection.fields.add(new BoolField({ name: "is_admin" }))

  collection.listRule   = "@request.auth.id != \"\" && @request.auth.is_admin = true"
  collection.viewRule   = "@request.auth.id != \"\" && (@request.auth.is_admin = true || id = @request.auth.id)"
  collection.createRule = "@request.auth.id != \"\" && @request.auth.is_admin = true"
  collection.updateRule = "@request.auth.id != \"\" && (@request.auth.is_admin = true || id = @request.auth.id)"
  collection.deleteRule = "@request.auth.id != \"\" && @request.auth.is_admin = true"

  app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("users")

  const f = collection.fields.getByName("is_admin")
  if (f) collection.fields.removeById(f.id)

  collection.listRule   = null
  collection.viewRule   = "id = @request.auth.id"
  collection.createRule = null
  collection.updateRule = "id = @request.auth.id"
  collection.deleteRule = "id = @request.auth.id"

  app.save(collection)
})
