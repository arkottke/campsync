# CampSync Implementation Plan

## Project Overview
A collaborative camping & meal planner web application with real-time synchronization.

---

## Phase 1: Project Setup & Infrastructure
- [x] **1.1** Initialize project structure with Vite + React + TypeScript
- [x] **1.2** Configure ESLint and Prettier for code quality
- [x] **1.3** Configure Tailwind CSS with mobile-first responsive design
- [x] **1.4** Set up React Router for navigation
- [x] **1.5** Set up Docker Compose configuration for development
- [x] **1.6** Configure PocketBase container and verify connectivity
- [x] **1.7** Set up TanStack Query for data fetching/caching
- [x] **1.8** Configure PWA manifest and service worker

---

## Phase 2: PocketBase Schema & Backend Setup
- [x] **2.1** Create `users` collection (extend built-in auth)
- [x] **2.2** Create `recipes` collection
- [x] **2.3** Create `ingredients` collection
- [x] **2.4** Create `supplies` collection for non-food gear
- [x] **2.5** Create `trips` collection
- [x] **2.6** Create `trip_meals` collection
- [x] **2.7** Create `checklist_items` collection
- [x] **2.8** Define cascade/orphan handling rules (recipe deletion policy)
- [x] **2.9** Configure collection permissions and API rules
- [x] **2.10** Set up real-time subscription rules

---

## Phase 3: Authentication & User Management
- [x] **3.1** Create login page with email/password authentication
- [x] **3.2** Create registration page
- [x] **3.3** Implement auth context/provider for React
- [x] **3.4** Create protected route wrapper component
- [ ] **3.5** Build user profile page (display name editing)
- [x] **3.6** Implement logout functionality

---

## Phase 4: Recipe Vault Module
- [x] **4.1** Create recipe list view with category filtering
- [x] **4.2** Build recipe detail view with instructions display
- [x] **4.3** Create recipe form (add/edit) with validation
- [x] **4.4** Implement ingredient management within recipe form
- [ ] **4.5** Add ingredient autocomplete from existing ingredients
- [x] **4.6** Add recipe search functionality
- [ ] **4.7** Implement recipe duplication/copy feature
- [x] **4.8** Implement recipe delete with confirmation
- [x] **4.9** Add category badges/tags (Breakfast, Lunch, Dinner, Snack)
- [x] **4.10** Add servings field with scaling preview

---

## Phase 5: Trip Planner Module
- [x] **5.1** Create trips list view (upcoming/past)
- [x] **5.2** Build trip creation form
- [x] **5.3** Implement trip detail/dashboard page
- [x] **5.4** Build people management system
- [x] **5.5** Create calendar view component for meal scheduling
- [ ] **5.6** Implement drag-and-drop recipe assignment to meal slots
- [x] **5.7** Add meal slot management (B/L/D/S per day)
- [x] **5.8** Set up real-time sync for collaborative editing
- [x] **5.9** Implement trip edit and delete functionality

---

## Phase 6: Aggregator Engine
- [x] **6.1** Create aggregation utility/hook
- [x] **6.2** Implement quantity multiplication by guest count
- [x] **6.3** Build deduplication logic
- [x] **6.4** Implement grouping by storage type
- [ ] **6.5** Create unit conversion helpers (optional enhancement)
- [x] **6.6** Add aggregated list preview (via checklist generation)

---

## Phase 7: Real-Time Shared Checklist
- [x] **7.1** Create checklist view grouped by storage type
- [x] **7.2** Implement item checkbox with strike-through styling
- [x] **7.3** Set up PocketBase real-time subscriptions for checklist
- [x] **7.4** Sync checkbox state across all connected devices
- [x] **7.5** Display who checked each item (attribution)
- [x] **7.6** Add checklist regeneration functionality
- [ ] **7.7** Implement optimistic updates for snappy UX
- [x] **7.8** Add **Grocery Mode** view
- [x] **7.9** Add **Packing Mode** view
- [x] **7.10** Add checklist filter (show unchecked only)
- [N/A] **7.11** Implement supplies checklist (non-food gear) — superseded by Phase 7.5 Gear Vault

---

## Phase 7.5: Gear Vault System (Added)
- [x] Master Vault: User-level gear/clothing templates (CRUD)
- [x] Trip Vault: Trip-specific copies with checklist functionality
- [x] Per-day auto-multiply: Items with `per_day` quantity multiply by trip days
- [x] 4 categories: Group Gear, Adult Clothing, Kids Clothing, Food
- [x] Import flow: Multi-select modal to copy master vault items into a trip
- [x] Gear Packs: Reusable bundles of items
- [x] Pack detail: View/edit pack items with inline form
- [x] Name autocomplete from all pack items
- [x] Trip import: Copy pack items to trip

---

## Phase 8: PWA & Offline Support
- [x] **8.1** Configure Vite PWA plugin
- [ ] **8.2** Create app icons (multiple sizes)
- [x] **8.3** Set up service worker for caching
- [ ] **8.4** Implement offline data persistence
- [ ] **8.5** Add install prompt/banner
- [ ] **8.6** Test offline functionality (checklist access)
- [ ] **8.7** Implement background sync for offline changes

---

## Phase 9: UI/UX Polish
- [x] **9.1** Design and implement navigation (bottom nav for mobile)
- [x] **9.2** Add loading states and skeletons
- [x] **9.3** Implement error boundaries and error messages
- [x] **9.4** Add toast notifications for actions
- [x] **9.5** Create empty states for lists
- [ ] **9.6** Implement pull-to-refresh on mobile
- [ ] **9.7** Add dark mode support (optional)
- [ ] **9.8** Ensure accessibility (ARIA labels, keyboard nav)

---

## Phase 10: Testing & Quality Assurance
- [ ] **10.1** Set up testing framework
- [ ] **10.2** Write unit tests for aggregator logic
- [ ] **10.3** Write integration tests for auth flow
- [ ] **10.4** Test real-time sync across multiple browsers
- [ ] **10.5** Perform mobile device testing
- [ ] **10.6** Test PWA installation on Android/iOS
- [ ] **10.7** Load testing with multiple concurrent users

---

## Phase 11: Deployment & Production
- [x] **11.1** Finalize production Docker Compose configuration
- [x] **11.2** Set up environment variable management
- [ ] **11.3** Configure reverse proxy (Traefik/Nginx) if needed
- [ ] **11.4** Set up backup strategy for PocketBase data
- [ ] **11.5** Create deployment documentation
- [ ] **11.6** Deploy to home lab server
- [ ] **11.7** Configure domain/SSL (optional)

---

## Phase 12: Documentation & Handoff
- [x] **12.1** Write README with setup instructions
- [ ] **12.2** Document API endpoints and data models
- [ ] **12.3** Create user guide for app features
- [ ] **12.4** Document backup/restore procedures

---

## Progress Summary

| Phase | Status | Tasks | Completed |
|-------|--------|-------|-----------|
| 1. Project Setup | Complete | 8 | 8 |
| 2. Backend Schema | Complete | 10 | 10 |
| 3. Authentication | Mostly Done | 6 | 5 |
| 4. Recipe Vault | Mostly Done | 10 | 8 |
| 5. Trip Planner | Mostly Done | 9 | 8 |
| 6. Aggregator Engine | Mostly Done | 6 | 5 |
| 7. Shared Checklist | Mostly Done | 11 | 9 |
| 7.5 Gear Vault | Complete | 9 | 9 |
| 8. PWA Support | In Progress | 7 | 2 |
| 9. UI/UX Polish | In Progress | 8 | 4 |
| 10. Testing | Not Started | 7 | 0 |
| 11. Deployment | In Progress | 7 | 2 |
| 12. Documentation | In Progress | 4 | 1 |
| **TOTAL** | | **102** | **71** |

---

## Notes
- Prioritize mobile-first development throughout
- PocketBase schema setup is automated via `setup-pocketbase.sh`
- Real-time features are critical for collaborative experience
- PWA caching essential for low-connectivity campsite usage
- **Tech Decision:** Using React + TypeScript (not Vue)
- **Grocery Mode:** Optimized for shopping - groups items by store section
- **Packing Mode:** Optimized for loading vehicle - groups by storage destination

## Optional ideas:

- [x] Mark some ingredients or gear within a recipe/pack as optional