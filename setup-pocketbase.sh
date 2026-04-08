#!/bin/bash
# PocketBase Schema Setup Script
# Creates all collections programmatically with proper API format

PB_URL="${VITE_PB_URL:-http://localhost:8090}"
RESET_DB="${RESET_DB:-0}"

# Load from .env file if it exists
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

ADMIN_EMAIL="${PB_ADMIN_EMAIL:?Set PB_ADMIN_EMAIL in .env}"
ADMIN_PASSWORD="${PB_ADMIN_PASSWORD:?Set PB_ADMIN_PASSWORD in .env}"
USER_EMAIL="${PB_USER_EMAIL:?Set PB_USER_EMAIL in .env}"
USER_PASSWORD="${PB_USER_PASSWORD:?Set PB_USER_PASSWORD in .env}"
USER_NAME="${PB_USER_NAME:-User}"

echo "Setting up PocketBase Schema..."

# Wait for PocketBase
for i in {1..30}; do
  curl -s "$PB_URL/api/health" > /dev/null 2>&1 && break
  sleep 1
done

# Get admin token (create admin if needed)
get_token() {
  local resp=$(curl -s -X POST "$PB_URL/api/admins/auth-with-password" \
    -H "Content-Type: application/json" \
    -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
  local token=$(echo "$resp" | jq -r '.token // empty')
  if [ -z "$token" ]; then
    curl -s -X POST "$PB_URL/api/admins" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"passwordConfirm\":\"$ADMIN_PASSWORD\"}" > /dev/null
    resp=$(curl -s -X POST "$PB_URL/api/admins/auth-with-password" \
      -H "Content-Type: application/json" \
      -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
    token=$(echo "$resp" | jq -r '.token // empty')
  fi
  echo "$token"
}

TOKEN=$(get_token)
if [ -z "$TOKEN" ]; then
  echo "FATAL: Could not authenticate as admin"
  exit 1
fi
echo "Authenticated as admin"

should_reset=0
if [ "$RESET_DB" = "1" ]; then
  should_reset=1
  echo "Reset mode enabled: existing collections will be deleted and recreated"
else
  trips_id=$(curl -s "$PB_URL/api/collections/trips" \
    -H "Authorization: $TOKEN" | jq -r '.id // empty')
  if [ -n "$trips_id" ]; then
    echo "Existing schema detected (trips collection: $trips_id). Skipping destructive schema reset."
  else
    should_reset=1
    echo "No existing schema detected. Running initial schema setup."
  fi
fi

AUTH="-H \"Authorization: $TOKEN\""

# Helper: delete collection if it exists
delete_if_exists() {
  local name=$1
  local id=$(curl -s "$PB_URL/api/collections/$name" \
    -H "Authorization: $TOKEN" | jq -r '.id // empty')
  if [ -n "$id" ] && [ "$id" != "_pb_users_auth_" ]; then
    echo "  Deleting existing $name ($id)..."
    curl -s -X DELETE "$PB_URL/api/collections/$name" \
      -H "Authorization: $TOKEN" > /dev/null
  fi
}

# Helper: create collection and print result
create_collection() {
  local name=$1
  local payload=$2

  local resp=$(curl -s -X POST "$PB_URL/api/collections" \
    -H "Content-Type: application/json" \
    -H "Authorization: $TOKEN" \
    -d "$payload")

  if echo "$resp" | jq -e '.id' > /dev/null 2>&1; then
    local id=$(echo "$resp" | jq -r '.id')
    echo "  Created $name ($id)"
  else
    echo "  FAILED $name:"
    echo "$resp" | jq -C .
    return 1
  fi
}

# Helper: patch collection to add relation fields
patch_collection() {
  local name=$1
  local payload=$2

  local resp=$(curl -s -X PATCH "$PB_URL/api/collections/$name" \
    -H "Content-Type: application/json" \
    -H "Authorization: $TOKEN" \
    -d "$payload")

  if echo "$resp" | jq -e '.id' > /dev/null 2>&1; then
    echo "  Patched $name"
  else
    echo "  PATCH FAILED $name:"
    echo "$resp" | jq -C .
    return 1
  fi
}

if [ "$should_reset" -eq 1 ]; then
  # ─── PHASE 1: Clean up any broken collections ───
  echo ""
  echo "Phase 1: Cleaning up broken collections..."
  for c in vault_pack_items vault_packs trip_vault_items checklist_items trip_meals supplies ingredients recipes trips; do
    delete_if_exists "$c"
  done
  echo "  Done"

  # ─── PHASE 2: Create all collections WITHOUT relation fields ───
  echo ""
  echo "Phase 2: Creating base collections..."

create_collection "recipes" "$(jq -n '{
  name: "recipes",
  type: "base",
  schema: [
    {name: "name",         type: "text",   required: true,  options: {min: null, max: null, pattern: ""}},
    {name: "instructions",  type: "editor", required: true,  options: {}},
    {name: "category",      type: "select", required: true,  options: {maxSelect: 1, values: ["Breakfast","Lunch","Dinner","Snack"]}},
    {name: "servings",      type: "number", required: false, options: {min: 1, max: null, noDecimal: false}}
  ],
  listRule:   "@request.auth.id != \"\"",
  viewRule:   "@request.auth.id != \"\"",
  createRule: "@request.auth.id != \"\"",
  updateRule: "@request.auth.id != \"\"",
  deleteRule: "@request.auth.id != \"\""
}')"

create_collection "ingredients" "$(jq -n '{
  name: "ingredients",
  type: "base",
  schema: [
    {name: "item_name",     type: "text",   required: true,  options: {min: null, max: null, pattern: ""}},
    {name: "quantity",       type: "number", required: true,  options: {min: null, max: null, noDecimal: false}},
    {name: "unit",           type: "text",   required: false, options: {min: null, max: null, pattern: ""}},
    {name: "storage_type",   type: "select", required: true,  options: {maxSelect: 1, values: ["Cooler","Dry Box","Trailer Bin","Gear"]}}
  ],
  listRule:   "@request.auth.id != \"\"",
  viewRule:   "@request.auth.id != \"\"",
  createRule: "@request.auth.id != \"\"",
  updateRule: "@request.auth.id != \"\"",
  deleteRule: "@request.auth.id != \"\""
}')"

create_collection "trips" "$(jq -n '{
  name: "trips",
  type: "base",
  schema: [
    {name: "name",        type: "text",   required: false, options: {min: null, max: null, pattern: ""}},
    {name: "start_date",  type: "date",   required: false, options: {min: "", max: ""}},
    {name: "end_date",    type: "date",   required: false, options: {min: "", max: ""}},
    {name: "guest_count", type: "number", required: false,  options: {min: 1, max: null, noDecimal: false}},
    {name: "people",      type: "json",   required: false,  options: {maxSize: 2000000}}
  ],
  listRule:   "@request.auth.id != \"\"",
  viewRule:   "@request.auth.id != \"\"",
  createRule: "@request.auth.id != \"\"",
  updateRule: "@request.auth.id != \"\"",
  deleteRule: "@request.auth.id != \"\""
}')"

create_collection "trip_meals" "$(jq -n '{
  name: "trip_meals",
  type: "base",
  schema: [
    {name: "date",      type: "date",   required: true, options: {min: "", max: ""}},
    {name: "meal_slot", type: "select", required: true, options: {maxSelect: 1, values: ["B","L","D","S"]}}
  ],
  listRule:   "@request.auth.id != \"\"",
  viewRule:   "@request.auth.id != \"\"",
  createRule: "@request.auth.id != \"\"",
  updateRule: "@request.auth.id != \"\"",
  deleteRule: "@request.auth.id != \"\""
}')"

create_collection "supplies" "$(jq -n '{
  name: "supplies",
  type: "base",
  schema: [
    {name: "name",       type: "text", required: true, options: {min: null, max: null, pattern: ""}},
    {name: "category",   type: "text", required: true, options: {min: null, max: null, pattern: ""}},
    {name: "checked",    type: "bool", required: false, options: {}},
    {name: "checked_by", type: "text", required: false, options: {min: null, max: null, pattern: ""}}
  ],
  listRule:   "@request.auth.id != \"\"",
  viewRule:   "@request.auth.id != \"\"",
  createRule: "@request.auth.id != \"\"",
  updateRule: "@request.auth.id != \"\"",
  deleteRule: "@request.auth.id != \"\""
}')"

create_collection "checklist_items" "$(jq -n '{
  name: "checklist_items",
  type: "base",
  schema: [
    {name: "item_name",     type: "text",   required: true,  options: {min: null, max: null, pattern: ""}},
    {name: "quantity",       type: "number", required: true,  options: {min: null, max: null, noDecimal: false}},
    {name: "unit",           type: "text",   required: false, options: {min: null, max: null, pattern: ""}},
    {name: "storage_type",   type: "select", required: true,  options: {maxSelect: 1, values: ["Cooler","Dry Box","Trailer Bin","Gear"]}},
    {name: "checked",        type: "bool",   required: false, options: {}},
    {name: "checked_by",     type: "text",   required: false, options: {min: null, max: null, pattern: ""}},
    {name: "is_grocery",     type: "bool",   required: false, options: {}}
  ],
  listRule:   "@request.auth.id != \"\"",
  viewRule:   "@request.auth.id != \"\"",
  createRule: "@request.auth.id != \"\"",
  updateRule: "@request.auth.id != \"\"",
  deleteRule: "@request.auth.id != \"\""
}')"

create_collection "trip_vault_items" "$(jq -n '{
  name: "trip_vault_items",
  type: "base",
  schema: [
    {name: "name",           type: "text",   required: true,  options: {min: null, max: null, pattern: ""}},
    {name: "quantity",       type: "number", required: true,  options: {min: 0, max: null, noDecimal: false}},
    {name: "quantity_type",  type: "select", required: true,  options: {maxSelect: 1, values: ["per_day","total"]}},
    {name: "checked",        type: "bool",   required: false, options: {}},
    {name: "checked_by",     type: "text",   required: false, options: {min: null, max: null, pattern: ""}},
    {name: "person_id",      type: "text",   required: false, options: {min: null, max: null, pattern: ""}},
    {name: "source_pack_id", type: "text",   required: false, options: {min: null, max: null, pattern: ""}}
  ],
  listRule:   "@request.auth.id != \"\"",
  viewRule:   "@request.auth.id != \"\"",
  createRule: "@request.auth.id != \"\"",
  updateRule: "@request.auth.id != \"\"",
  deleteRule: "@request.auth.id != \"\""
}')"

create_collection "vault_packs" "$(jq -n '{
  name: "vault_packs",
  type: "base",
  schema: [
    {name: "name",     type: "text",   required: true,  options: {min: null, max: null, pattern: ""}},
    {name: "category", type: "select", required: true,  options: {maxSelect: 1, values: ["gear","clothing","kids"]}}
  ],
  listRule:   "@request.auth.id != \"\"",
  viewRule:   "@request.auth.id != \"\"",
  createRule: "@request.auth.id != \"\"",
  updateRule: "@request.auth.id != \"\"",
  deleteRule: "@request.auth.id != \"\""
}')"

create_collection "vault_pack_items" "$(jq -n '{
  name: "vault_pack_items",
  type: "base",
  schema: [
    {name: "name",           type: "text",   required: true,  options: {min: null, max: null, pattern: ""}},
    {name: "quantity",       type: "number", required: true,  options: {min: null, max: null, noDecimal: false}},
    {name: "quantity_type",  type: "select", required: true,  options: {maxSelect: 1, values: ["per_day","total"]}}
  ],
  listRule:   "@request.auth.id != \"\"",
  viewRule:   "@request.auth.id != \"\"",
  createRule: "@request.auth.id != \"\"",
  updateRule: "@request.auth.id != \"\"",
  deleteRule: "@request.auth.id != \"\""
}')"

# ─── PHASE 3: Now add relation fields via PATCH ───
echo ""
echo "Phase 3: Adding relation fields..."

# Get collection IDs
USERS_ID="_pb_users_auth_"
RECIPES_ID=$(curl -s "$PB_URL/api/collections/recipes" -H "Authorization: $TOKEN" | jq -r '.id')
TRIPS_ID=$(curl -s "$PB_URL/api/collections/trips" -H "Authorization: $TOKEN" | jq -r '.id')
VAULT_PACKS_ID=$(curl -s "$PB_URL/api/collections/vault_packs" -H "Authorization: $TOKEN" | jq -r '.id')

echo "  users=$USERS_ID recipes=$RECIPES_ID trips=$TRIPS_ID vault_packs=$VAULT_PACKS_ID"

# Recipes: add owner_id -> users
RECIPES_SCHEMA=$(curl -s "$PB_URL/api/collections/recipes" -H "Authorization: $TOKEN" | jq '.schema')
RECIPES_SCHEMA=$(echo "$RECIPES_SCHEMA" | jq --arg uid "$USERS_ID" '. + [{
  name: "owner_id",
  type: "relation",
  required: true,
  options: {collectionId: $uid, cascadeDelete: false, maxSelect: 1, displayFields: []}
}]')
patch_collection "recipes" "$(jq -n --argjson schema "$RECIPES_SCHEMA" '{schema: $schema}')"

# Ingredients: add recipe_id -> recipes
ING_SCHEMA=$(curl -s "$PB_URL/api/collections/ingredients" -H "Authorization: $TOKEN" | jq '.schema')
ING_SCHEMA=$(echo "$ING_SCHEMA" | jq --arg rid "$RECIPES_ID" '. + [{
  name: "recipe_id",
  type: "relation",
  required: true,
  options: {collectionId: $rid, cascadeDelete: true, maxSelect: 1, displayFields: []}
}]')
patch_collection "ingredients" "$(jq -n --argjson schema "$ING_SCHEMA" '{schema: $schema}')"

# Trips: add members -> users (multi-relation)
TRIPS_SCHEMA=$(curl -s "$PB_URL/api/collections/trips" -H "Authorization: $TOKEN" | jq '.schema')
TRIPS_SCHEMA=$(echo "$TRIPS_SCHEMA" | jq --arg uid "$USERS_ID" '. + [{
  name: "members",
  type: "relation",
  required: true,
  options: {collectionId: $uid, cascadeDelete: false, maxSelect: null, displayFields: []}
}]')
patch_collection "trips" "$(jq -n --argjson schema "$TRIPS_SCHEMA" '{schema: $schema}')"

# Trip Meals: add trip_id -> trips, recipe_id -> recipes
TM_SCHEMA=$(curl -s "$PB_URL/api/collections/trip_meals" -H "Authorization: $TOKEN" | jq '.schema')
TM_SCHEMA=$(echo "$TM_SCHEMA" | jq --arg tid "$TRIPS_ID" --arg rid "$RECIPES_ID" '. + [
  {name: "trip_id",   type: "relation", required: true, options: {collectionId: $tid, cascadeDelete: true,  maxSelect: 1, displayFields: []}},
  {name: "recipe_id", type: "relation", required: true, options: {collectionId: $rid, cascadeDelete: false, maxSelect: 1, displayFields: []}}
]')
patch_collection "trip_meals" "$(jq -n --argjson schema "$TM_SCHEMA" '{schema: $schema}')"

# Supplies: add trip_id -> trips
SUP_SCHEMA=$(curl -s "$PB_URL/api/collections/supplies" -H "Authorization: $TOKEN" | jq '.schema')
SUP_SCHEMA=$(echo "$SUP_SCHEMA" | jq --arg tid "$TRIPS_ID" '. + [{
  name: "trip_id",
  type: "relation",
  required: true,
  options: {collectionId: $tid, cascadeDelete: true, maxSelect: 1, displayFields: []}
}]')
patch_collection "supplies" "$(jq -n --argjson schema "$SUP_SCHEMA" '{schema: $schema}')"

# Checklist Items: add trip_id -> trips
CL_SCHEMA=$(curl -s "$PB_URL/api/collections/checklist_items" -H "Authorization: $TOKEN" | jq '.schema')
CL_SCHEMA=$(echo "$CL_SCHEMA" | jq --arg tid "$TRIPS_ID" '. + [{
  name: "trip_id",
  type: "relation",
  required: true,
  options: {collectionId: $tid, cascadeDelete: true, maxSelect: 1, displayFields: []}
}]')
patch_collection "checklist_items" "$(jq -n --argjson schema "$CL_SCHEMA" '{schema: $schema}')"

# Trip Vault Items: add trip_id -> trips
TVI_SCHEMA=$(curl -s "$PB_URL/api/collections/trip_vault_items" -H "Authorization: $TOKEN" | jq '.schema')
TVI_SCHEMA=$(echo "$TVI_SCHEMA" | jq --arg tid "$TRIPS_ID" '. + [
  {name: "trip_id", type: "relation", required: true, options: {collectionId: $tid, cascadeDelete: true, maxSelect: 1, displayFields: []}}
]')
patch_collection "trip_vault_items" "$(jq -n --argjson schema "$TVI_SCHEMA" '{schema: $schema}')"

# Vault Packs: add owner_id -> users
VP_SCHEMA=$(curl -s "$PB_URL/api/collections/vault_packs" -H "Authorization: $TOKEN" | jq '.schema')
VP_SCHEMA=$(echo "$VP_SCHEMA" | jq --arg uid "$USERS_ID" '. + [{
  name: "owner_id",
  type: "relation",
  required: true,
  options: {collectionId: $uid, cascadeDelete: true, maxSelect: 1, displayFields: []}
}]')
patch_collection "vault_packs" "$(jq -n --argjson schema "$VP_SCHEMA" '{schema: $schema}')"

# Vault Pack Items: add pack_id -> vault_packs
VPI_SCHEMA=$(curl -s "$PB_URL/api/collections/vault_pack_items" -H "Authorization: $TOKEN" | jq '.schema')
VPI_SCHEMA=$(echo "$VPI_SCHEMA" | jq --arg vpid "$VAULT_PACKS_ID" '. + [{
  name: "pack_id",
  type: "relation",
  required: true,
  options: {collectionId: $vpid, cascadeDelete: true, maxSelect: 1, displayFields: []}
}]')
patch_collection "vault_pack_items" "$(jq -n --argjson schema "$VPI_SCHEMA" '{schema: $schema}')"

# ─── PHASE 3b: Tighten owner_id-based rules now that relations exist ───
echo ""
echo "Phase 3b: Setting owner_id-based API rules..."

  patch_collection "vault_packs" "$(jq -n '{
    listRule:   "@request.auth.id != \"\" && owner_id = @request.auth.id",
    viewRule:   "@request.auth.id != \"\" && owner_id = @request.auth.id",
    updateRule: "@request.auth.id != \"\" && owner_id = @request.auth.id",
    deleteRule: "@request.auth.id != \"\" && owner_id = @request.auth.id"
  }')"

# ─── PHASE 3c: Configure users collection for admin-managed access ───
echo ""
echo "Phase 3c: Configuring users collection (is_admin field + access rules)..."

  USERS_SCHEMA=$(curl -s "$PB_URL/api/collections/users" -H "Authorization: $TOKEN" | jq '.schema')
  USERS_SCHEMA=$(echo "$USERS_SCHEMA" | jq '. + [{
    name: "is_admin",
    type: "bool",
    required: false,
    options: {}
  }]')
  patch_collection "users" "$(jq -n --argjson schema "$USERS_SCHEMA" '{
    schema:     $schema,
    createRule: "@request.auth.id != \"\" && @request.auth.is_admin = true",
    listRule:   "@request.auth.id != \"\" && @request.auth.is_admin = true",
    viewRule:   "@request.auth.id != \"\" && (@request.auth.is_admin = true || id = @request.auth.id)",
    updateRule: "@request.auth.id != \"\" && (@request.auth.is_admin = true || id = @request.auth.id)",
    deleteRule: "@request.auth.id != \"\" && @request.auth.is_admin = true"
  }')"
fi

echo ""
echo "Phase 4: Creating initial admin user account..."
USER_RESP=$(curl -s -X POST "$PB_URL/api/collections/users/records" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$USER_PASSWORD\",
    \"passwordConfirm\": \"$USER_PASSWORD\",
    \"name\": \"$USER_NAME\",
    \"is_admin\": true
  }")

if echo "$USER_RESP" | jq -e '.id' > /dev/null 2>&1; then
  echo "  Created user: $USER_EMAIL"
else
  echo "  User may already exist: $(echo "$USER_RESP" | jq -r '.message // empty')"
fi

echo ""
if [ "$should_reset" -eq 1 ]; then
  echo "Done! All collections created with relations."
else
  echo "Done! Existing schema preserved."
fi
echo ""
echo "PocketBase superadmin:  $ADMIN_EMAIL  ($PB_URL/_/)"
echo "App admin user:         $USER_EMAIL"
