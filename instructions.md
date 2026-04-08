# CampSync: Collaborative Camping & Meal Planner
**Project Specification & Technical Blueprint**

CampSync is a lightweight, self-hosted web application designed to simplify the planning and execution of camping trips. It focuses on turning a library of predefined recipes into a consolidated, real-time checklist for multiple users.

## 1. Project Overview
* **Goal:** Move from manual spreadsheets to an automated system that aggregates ingredients and supplies across multiple meals.
* **Target Platform:** Mobile-first Web App (PWA) for use at home, the grocery store, and the campsite.
* **Deployment:** Single-host Docker system (Home Lab).
* **Key Philosophy:** No complex pantry management; instead, generate trip-specific requirements based on the planned menu.
* **Compatibility Policy:** Do not prioritize legacy support. Optimize for the current CampSync schema and workflows, and prefer clean migrations over backward-compatibility layers.

---

## 2. Technical Stack
| Component | Recommendation |
| :--- | :--- |
| **Frontend** | **React** (with Vite) or **Vue 3** |
| **Styling** | **Tailwind CSS** (Mobile-first, responsive) |
| **Backend/DB** | **PocketBase** (Go-based, SQLite, Real-time subscriptions) |
| **State Sync** | **TanStack Query** (for data fetching and caching) |
| **Deployment** | **Docker Compose** |

---

## 3. Database Schema (PocketBase Collections)

### **Users**
* `id` (System ID)
* `username` / `email` / `password`
* `name` (Display Name)

### **Recipes**
* `id` (System ID)
* `name` (e.g., "Teardrop Tacos")
* `instructions` (Text/Markdown)
* `category` (Breakfast, Lunch, Dinner, Snack)
* `owner_id` (Link to Users)

### **Ingredients** (Relates to Recipes)
* `recipe_id` (Relation)
* `item_name` (e.g., "Onion")
* `quantity` (Float)
* `unit` (e.g., "Grams", "Count", "Cans")
* `storage_type` (Cooler, Dry Box, Trailer Bin, Gear)

### **Trips**
* `id` (System ID)
* `name` (e.g., "Oregon Road Trip 2026")
* `start_date` / `end_date`
* `members` (Multi-relation to Users)
* `guest_count` (Multiplier for scaling ingredients)

### **Trip_Meals** (The Scheduler)
* `trip_id` (Relation)
* `recipe_id` (Relation)
* `date` (Date)
* `meal_slot` (B/L/D/S)

---

## 4. Core Functional Modules

### **A. Recipe Vault**
* A library where users define their "standard" camping meals.
* Ingredients are entered with specific units to allow for mathematical aggregation.

### **B. Trip Planner & Collaboration**
* Create a trip and invite other system users.
* Collaborative "Calendar View" where any member can assign recipes to specific meal slots.
* Real-time updates ensure the menu is synchronized across all devices.

### **C. The Aggregator Engine**
A backend or frontend logic layer that:
1.  Collects all recipes scheduled for a trip.
2.  Multiplies quantities by the trip's `guest_count`.
3.  **Deduplicates and Sums:** Combines "Onion (0.5)" from Recipe A and "Onion (1.0)" from Recipe B into a single "Onion (1.5)" entry.
4.  Groups the final list by `storage_type` (e.g., all "Cooler" items together).

### **D. Real-Time Shared Checklist**
* The output of the Aggregator becomes an interactive checklist.
* **Status Sync:** Checking an item on one phone strikes it through on all other members' phones instantly via PocketBase Real-time API.
* **PWA Support:** Installable on Android/iOS to ensure it works smoothly in low-connectivity areas (using local caching).

---

## 5. Docker Deployment Strategy

Create a `docker-compose.yml` in your project root:

```yaml
version: '3.8'

services:
  campsync-db:
    image: pocketbase/pocketbase:latest
    container_name: campsync-pb
    restart: unless-stopped
    ports:
      - "8090:8080"
    volumes:
      - ./pb_data:/pb_data
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:8080/_/"]
      interval: 10s
      timeout: 5s
      retries: 3

  campsync-app:
    build: ./frontend
    container_name: campsync-ui
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - VITE_PB_URL=http://[YOUR-SERVER-IP]:8090
    depends_on:
      - campsync-db
