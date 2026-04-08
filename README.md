# CampSync

**Self-hosted PWA for collaborative camping & meal planning.** Build a recipe library, schedule meals on a trip calendar, and generate real-time shared checklists — automatically scaled by guest count, deduplicated, and grouped by storage location.

Designed to be used at home for planning, at the grocery store for shopping, and at the campsite for packing and checking.

---

## Features

### Recipe Library
- Create and edit camping recipes with rich-text instructions, category tags (Breakfast / Lunch / Dinner / Snack), and a per-serving ingredient grid
- Ingredients carry a **storage type** (Cooler / Dry Box / Trailer Bin / Gear) and an optional flag
- Export and import recipes as typed JSON files — share recipes between CampSync instances

### Trip Planning
- Create trips with a date range, guest count, and a list of named people
- **Calendar-style meal scheduler** — assign any recipe to Breakfast, Lunch, Dinner, or Snack slots for each day
- Copy an existing trip (with its full meal schedule) to reuse for a new season

### Smart Checklist
- One click generates an aggregated, deduplicated ingredient checklist for the whole trip
- Quantities are automatically **scaled by `guestCount / servings`** and rounded cleanly
- Three view modes:
  - **All** — grouped by storage type (🧊 Cooler / 📦 Dry Box / 🚛 Trailer Bin / ⛺ Gear)
  - **Grocery** — filtered to grocery items, grouped by store section (Produce, Dairy, Meat, Pantry, Frozen, Beverages)
  - **Packing** — organized by vehicle storage destination
- "Show unchecked only" filter for in-progress packing
- Real-time collaborative check-off: shows who checked each item, synced instantly across all devices

### Gear Vault
- **Master Vault**: a personal library of reusable gear packs (categories: Gear, Clothing, Kids, Pantry)
- Pack items support **per-day** or **total** quantity types; per-day quantities multiply by trip length at display time
- Import packs into any trip with one click; clothing packs can be assigned to specific named people
- **Trip Vault** view: gear checklist per trip, separate from the food checklist
- **Trip Pantry** view: non-recipe pantry/food items tracked independently
- Export and import packs as JSON for sharing

### PWA & Offline
- Installable as a standalone app on iOS and Android
- Workbox service worker precaches all assets; core UI is available offline

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 (mobile-first, custom `camp-*` color tokens) |
| Routing | React Router DOM v6 |
| Data fetching | TanStack Query v5 |
| Backend / DB | PocketBase v0.20 (Go binary, SQLite, WebSocket real-time API) |
| PWA | vite-plugin-pwa + Workbox |
| Deployment | Docker (multi-stage) + Docker Compose |

---

## Getting Started

### Option 1: Docker (recommended for self-hosting)

Create a `.env` file with your credentials:

```env
PB_ADMIN_EMAIL=admin@example.com
PB_ADMIN_PASSWORD=changeme123
PB_USER_EMAIL=user@example.com
PB_USER_PASSWORD=changeme123
PB_USER_NAME=Your Name
```

Then build and run:

```bash
docker compose up --build
```

On first start the container automatically creates all database collections and your seed user account.

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| PocketBase admin UI | http://localhost:8090/_/ |

Data is persisted in a `pb_data/` Docker volume.

### Option 2: Local development

**Prerequisites:** Node.js 20+, `jq`, `curl`

```bash
# Linux / macOS
./start-dev.sh
```

```bat
# Windows
start-dev.bat
```

The script downloads the PocketBase binary on first run, starts it on port 8090, runs the schema setup, and starts the Vite dev server on port 3000.

### PocketBase hot backup (short downtime)

Use the backup script to safely archive `pb_data/` by briefly stopping PocketBase, creating a compressed backup, and starting PocketBase again:

```bash
./backup-pocketbase.sh
```

Optional flags:

```bash
./backup-pocketbase.sh --backup-dir ./backups --keep 14 --http 127.0.0.1:8090
```

Cron example (daily at 2:30 AM):

```bash
crontab -e
```

```cron
30 2 * * * cd /home/albert/Documents/programs/campsync && /home/albert/Documents/programs/campsync/backup-pocketbase.sh --backup-dir /home/albert/Documents/programs/campsync/backups --keep 14 >> /home/albert/Documents/programs/campsync/backups/backup-cron.log 2>&1
```

Use absolute paths in cron jobs because cron runs with a minimal environment.

### Option 3: Manual setup

```bash
# 1. Install dependencies
npm install

# 2. Start PocketBase (download from https://pocketbase.io/docs/)
./pocketbase/pocketbase serve --http="127.0.0.1:8090"

# 3. Run schema setup
PB_ADMIN_EMAIL=admin@example.com \
PB_ADMIN_PASSWORD=changeme123 \
PB_USER_EMAIL=user@example.com \
PB_USER_PASSWORD=changeme123 \
./setup-pocketbase.sh

# 4. Start the dev server
npm run dev
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_PB_URL` | PocketBase server URL | `http://localhost:8090` |
| `PB_ADMIN_EMAIL` | Admin account email | *(required)* |
| `PB_ADMIN_PASSWORD` | Admin account password | *(required)* |
| `PB_USER_EMAIL` | Seed user email | *(required)* |
| `PB_USER_PASSWORD` | Seed user password | *(required)* |
| `PB_USER_NAME` | Seed user display name | `User` |
| `RESET_DB` | Set to `1` to wipe and recreate all collections | `0` |

---

## Database Schema

```
users              — auth collection (email + name)
recipes            — name, instructions, category, servings
  └── ingredients  — item_name, quantity, unit, storage_type, optional
trips              — name, start_date, end_date, guest_count, people[], members→users
  ├── trip_meals       — date, meal_slot (B/L/D/S), recipe_id→recipes
  ├── checklist_items  — aggregated output: item_name, quantity, unit, storage_type,
  │                      is_grocery, checked, checked_by
  ├── supplies         — free-form gear items: name, category, checked, checked_by
  └── trip_vault_items — copied pack items: name, quantity, quantity_type,
                         list_type (gear/pantry), checked, checked_by, person_id
vault_packs        — name, category (gear/clothing/kids/pantry), owner_id→users
  └── vault_pack_items — name, quantity, quantity_type (per_day/total)
```

---

## Project Structure

```
campsync/
├── src/
│   ├── components/     # Layout, modals, Toast, ProtectedRoute
│   ├── context/        # AuthContext (PocketBase auth state)
│   ├── hooks/
│   │   ├── useQueries.ts       # TanStack Query wrappers for every resource
│   │   ├── useRealtime.ts      # PocketBase WebSocket subscriptions
│   │   └── useFormKeyboardNav.ts  # Tab-navigation for ingredient grid
│   ├── pages/          # One file per route
│   ├── services/       # PocketBase SDK client
│   ├── types/          # Shared TypeScript interfaces
│   └── utils/
│       ├── aggregator.ts  # Ingredient scaling & deduplication logic
│       ├── vault.ts       # Per-day quantity calculation
│       ├── recipeIO.ts    # Recipe JSON export/import + validation
│       └── vaultIO.ts     # Gear pack JSON export/import + validation
├── pb_migrations/      # PocketBase JS migration files
├── pocketbase/         # PocketBase binary (gitignored)
├── Dockerfile
├── docker-compose.yml
├── setup-pocketbase.sh # Idempotent schema + seed-user setup script
└── start-dev.sh        # One-command local dev startup
```

---

## Available Scripts

```bash
npm run dev        # Start Vite dev server (port 3000)
npm run build      # Production build → dist/
npm run preview    # Serve the production build locally
npm run lint       # ESLint
npm run format     # Prettier
```

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Tab` | Move to next cell in ingredient/item grid; creates a new row on the last cell |
| `Ctrl+Enter` | Submit the current form |
| `Esc` | Close modal / cancel |
| `?` | Toggle keyboard shortcut reference |

## Development Workflow

### 1. Authentication (Phase 3)
- Implement login/registration pages
- Set up auth context for state management

### 2. Recipe Vault (Phase 4)
- Create recipe CRUD operations
- Build recipe listing with filtering
- Implement ingredient management

### 3. Trip Planner (Phase 5)
- Design trip creation and management
- Build collaborative calendar view
- Implement meal scheduling with drag-and-drop

### 4. Aggregator Engine (Phase 6)
- Develop ingredient aggregation logic
- Implement quantity multiplication
- Build deduplication engine

### 5. Shared Checklist (Phase 7)
- Create checklist UI with real-time updates
- Implement grocery and packing modes
- Build supplies tracking

### 6. PWA & Offline (Phase 8)
- Configure service worker
- Implement offline data persistence
- Add install prompts

### 7. UI/UX Polish (Phase 9)
- Design mobile-first navigation
- Add loading states and error handling
- Implement toast notifications

### 8. Testing (Phase 10)
- Unit tests for utils and hooks
- Integration tests for auth and API
- E2E tests for user flows

## PocketBase Setup

After starting PocketBase, access the admin panel at `http://localhost:8090/_/` and:

1. Create all required collections as defined in IMPLEMENTATION_PLAN.md
2. Set up collection permissions and API rules
3. Configure real-time subscription rules
4. Define cascade/orphan handling for recipe deletion

## Deployment

### Production Docker Build

```bash
# Build and start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Configuration

Set in `.env` or `docker-compose.yml`:
- `VITE_PB_URL`: PocketBase URL (default: http://localhost:8090)
- `VITE_APP_NAME`: Application name
- `VITE_APP_VERSION`: Version number

## Contributing

1. Create a feature branch
2. Follow the ESLint and Prettier rules
3. Write tests for new functionality
4. Submit a pull request

## License

See LICENSE file for details.

## Notes

- Mobile-first development throughout
- Uses PocketBase Admin UI for initial schema setup
- Real-time features essential for collaborative experience
- PWA caching critical for low-connectivity campsite usage
