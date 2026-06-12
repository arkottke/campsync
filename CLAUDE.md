# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Local development (starts PocketBase on :8090 + Vite on :3000)
./start-dev.sh

# Frontend only (requires PocketBase already running)
npm run dev

# Production build
npm run build

# Lint / format
npm run lint
npm run format
```

There are no automated tests. Lint is strict (`--max-warnings 0`).

## Architecture

CampSync is a self-hosted PWA: a React/TypeScript SPA (Vite) backed by a PocketBase Go binary that provides a SQLite database, REST API, and WebSocket real-time events.

**Data flow:**
1. `src/services/pocketbase.ts` — single `PocketBaseService` static class wrapping the PocketBase JS SDK. All DB access goes through here.
2. `src/hooks/useQueries.ts` — TanStack Query wrappers (one `useXxx` / `useCreateXxx` / `useUpdateXxx` / `useDeleteXxx` per resource) that call `PocketBaseService`.
3. `src/hooks/useRealtime.ts` — PocketBase WebSocket subscriptions that call `queryClient.invalidateQueries` to push live updates from other devices into the local cache. Each realtime hook mirrors a query key from `useQueries.ts`.
4. `src/context/AuthContext.tsx` — wraps `pb.authStore`; provides `useAuth()` throughout the app.
5. Pages import query hooks and realtime hooks together; pages do not call `PocketBaseService` directly.

**Key behavioral detail:** `pb.autoCancellation(false)` is set globally to prevent the SDK from cancelling concurrent requests.

## Database schema

```
users              — auth collection; has custom is_admin bool
recipes            — name, category (Breakfast/Lunch/Dinner/Snack), servings, instructions
  └── ingredients  — item_name, quantity, unit, storage_type, grocery_category, optional
trips              — name, start_date, end_date, guest_count, people[], members[]→users
  ├── trip_meals       — date, meal_slot (B/L/D/S), recipe_id→recipes
  ├── checklist_items  — aggregated food checklist per trip; checked_by stores user name
  ├── supplies         — free-form gear items
  ├── trip_vault_items — gear/pantry items copied from vault packs; list_type∈{gear,pantry}
  └── trip_todos       — simple title/checked todo items
vault_packs        — name, category (gear/clothing/kids/pantry), owner_id→users
  └── vault_pack_items — name, quantity, quantity_type (per_day/total)
```

Migrations live in `pb_migrations/` as JS files and are applied automatically by PocketBase on startup.

## TanStack Query cache keys

| Key shape | Resource |
|---|---|
| `['recipes']` / `['recipes', id]` | Recipes |
| `['trips']` / `['trips', id]` | Trips |
| `['checklist', tripId]` | Checklist items |
| `['supplies', tripId]` | Supplies |
| `['tripVaultItems', tripId, listType]` | Trip vault/pantry items |
| `['tripTodos', tripId]` | Trip todos |
| `['vaultPacks', ownerId]` | Vault packs |
| `['vaultPackItems', packId]` / `['allVaultPackItems', ownerId]` | Vault pack items |

## Checklist aggregation

`src/utils/aggregator.ts` contains the core logic: `aggregateIngredients` scales ingredient quantities by `guestCount / servings` and deduplicates by `(normalizedName, unit, storage_type)`. Grocery category is stored on the ingredient; `getGroceryCategory` is a keyword heuristic fallback. `Cooler` and `Dry Box` storage types are considered grocery items; `Trailer Bin` and `Gear` are packing items.

## Styling

Tailwind CSS with two custom color token sets defined in `tailwind.config.js`:
- `camp-*` — forest green (`camp-500` = `#22c55e`); use for primary actions, nav active states
- `accent-*` — warm orange (`accent-500` = `#f97316`); use for secondary actions, warnings

Never use `blue-*` or hard-coded hex colors. See `THEME.md` for full reference.

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_PB_URL` | PocketBase URL (default `http://localhost:8090`) |
| `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` | PocketBase admin credentials for setup scripts |
| `PB_USER_EMAIL` / `PB_USER_PASSWORD` / `PB_USER_NAME` | Seed user for first run |
| `RESET_DB` | Set to `1` to wipe and recreate all collections |
