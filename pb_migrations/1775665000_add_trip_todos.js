/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const authRules = {
    listRule:   "@request.auth.id != \"\"",
    viewRule:   "@request.auth.id != \"\"",
    createRule: "@request.auth.id != \"\"",
    updateRule: "@request.auth.id != \"\"",
    deleteRule: "@request.auth.id != \"\"",
  }

  const tripTodos = new Collection({ type: "base", name: "trip_todos" })
  Object.assign(tripTodos, authRules)
  tripTodos.fields.add(new TextField({ name: "title", required: true }))
  tripTodos.fields.add(new BoolField({ name: "checked" }))
  tripTodos.fields.add(new TextField({ name: "checked_by" }))
  app.save(tripTodos)

  // trip_todos.trip_id → trips (cascade delete)
  const tripTodosColl = app.findCollectionByNameOrId("trip_todos")
  const tripsColl = app.findCollectionByNameOrId("trips")
  tripTodosColl.fields.add(new RelationField({
    name: "trip_id",
    required: true,
    collectionId: tripsColl.id,
    cascadeDelete: true,
    maxSelect: 1,
  }))
  app.save(tripTodosColl)

}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId("trip_todos"))
  } catch (_) {}
})
