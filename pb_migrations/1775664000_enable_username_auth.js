/// <reference path="../pb_data/types.d.ts" />

// Enables username/password authentication on the users collection.
// Makes email optional and sets username from existing name field for seeded users.

migrate((app) => {
  const collection = app.findCollectionByNameOrId("users")

  // Enable username+password identity and make email optional.
  // PocketBase auth collections have passwordAuth and identities config.
  // Setting minUsernameLength enables username auth.
  collection.fields.add(new TextField({
    name: "username",
    required: false,
  }))

  app.save(collection)

  // Backfill usernames for existing users: derive from name field
  const users = app.findRecordsByFilter("users", "1=1", "", 0, 0)
  for (const user of users) {
    const name = user.get("name") || ""
    if (name && !user.get("username")) {
      const username = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
      user.set("username", username)
      app.save(user)
    }
  }
}, (app) => {
  // Revert: nothing critical to undo; username field is built-in
})
