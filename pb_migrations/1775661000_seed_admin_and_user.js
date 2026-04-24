/// <reference path="../pb_data/types.d.ts" />

// Seeds the PocketBase superuser and the default app user from environment variables.
// Required env vars:
//   PB_ADMIN_EMAIL      PocketBase superuser email
//   PB_ADMIN_PASSWORD   PocketBase superuser password
//   PB_USER_EMAIL       App user email
//   PB_USER_PASSWORD    App user password
//   PB_USER_NAME        App user display name (optional, default "User")

migrate((app) => {
  const adminEmail    = $os.getenv("PB_ADMIN_EMAIL")
  const adminPassword = $os.getenv("PB_ADMIN_PASSWORD")
  const userEmail     = $os.getenv("PB_USER_EMAIL")
  const userPassword  = $os.getenv("PB_USER_PASSWORD")
  const userName      = $os.getenv("PB_USER_NAME") || "User"

  // ── PocketBase superuser ──────────────────────────────────────────────────
  if (adminEmail && adminPassword) {
    let adminExists = false
    try { app.findAuthRecordByEmail("_superusers", adminEmail); adminExists = true } catch (_) {}

    if (!adminExists) {
      const superusers = app.findCollectionByNameOrId("_superusers")
      const admin = new Record(superusers)
      admin.set("email", adminEmail)
      admin.setPassword(adminPassword)
      app.saveNoValidate(admin)
    }
  }

  // ── Default app user (is_admin = true) ───────────────────────────────────
  if (userEmail && userPassword) {
    let userExists = false
    try { app.findAuthRecordByEmail("users", userEmail); userExists = true } catch (_) {}

    if (!userExists) {
      const users = app.findCollectionByNameOrId("users")
      const user = new Record(users)
      user.set("email", userEmail)
      user.set("name", userName)
      user.set("username", userName.toLowerCase().replace(/\\s+/g, "_").replace(/[^a-z0-9_]/g, ""))
      user.set("is_admin", true)
      user.setPassword(userPassword)
      user.setVerified(true)
      app.saveNoValidate(user)
    }
  }
}, (app) => {
  const userEmail  = $os.getenv("PB_USER_EMAIL")
  const adminEmail = $os.getenv("PB_ADMIN_EMAIL")

  if (userEmail) {
    try { app.delete(app.findAuthRecordByEmail("users", userEmail)) } catch (_) {}
  }
  if (adminEmail) {
    try { app.delete(app.findAuthRecordByEmail("_superusers", adminEmail)) } catch (_) {}
  }
})
