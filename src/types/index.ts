// User types
export interface User {
  id: string
  email: string
  username?: string
  name: string
  is_admin?: boolean
  avatar?: string
  created: string
  updated: string
}

// Recipe types
export type GroceryCategory = 'Produce' | 'Dairy' | 'Meat' | 'Frozen' | 'Beverages' | 'Pantry' | 'Bakery' | 'Condiments' | 'Snacks' | 'Other'

export interface Ingredient {
  id: string
  recipe_id: string
  item_name: string
  quantity: number
  unit: string
  storage_type: 'Cooler' | 'Dry Box' | 'Trailer Bin' | 'Gear'
  grocery_category?: GroceryCategory
  optional?: boolean
}

export interface Recipe {
  id: string
  name: string
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
  owner_id: string
  instructions: string
  servings?: number
  created: string
  updated: string
  ingredients?: Ingredient[]
}

// Trip types
export interface Trip {
  id: string
  name: string
  start_date: string
  end_date: string
  members: string[] // User IDs
  guest_count: number
  people: string[] // Person names for this trip
  created: string
  updated: string
}

export interface TripMeal {
  id: string
  trip_id: string
  recipe_id: string
  date: string
  meal_slot: 'B' | 'L' | 'D' | 'S' // Breakfast, Lunch, Dinner, Snack
}

// Checklist types
export interface ChecklistItem {
  id: string
  trip_id: string
  item_name: string
  quantity: number
  unit: string
  storage_type: 'Cooler' | 'Dry Box' | 'Trailer Bin' | 'Gear'
  grocery_category?: GroceryCategory
  checked: boolean
  checked_by?: string
  is_grocery: boolean
  created: string
  updated: string
}

export interface Supply {
  id: string
  name: string
  category: string
  trip_id: string
  checked: boolean
  checked_by?: string
  created: string
  updated: string
}

// Vault types
export type PackCategory = 'gear' | 'clothing' | 'kids' | 'pantry'
export type QuantityType = 'per_day' | 'total'
export type TripItemListType = 'gear' | 'pantry'

export interface VaultPack {
  id: string
  owner_id: string
  name: string
  category: PackCategory
  created: string
  updated: string
}

export interface VaultPackItem {
  id: string
  pack_id: string
  name: string
  quantity: number
  quantity_type: QuantityType
  created: string
  updated: string
}

export interface TripVaultItem {
  id: string
  trip_id: string
  source_pack_id?: string
  name: string
  quantity: number
  quantity_type: QuantityType
  list_type?: TripItemListType
  checked: boolean
  checked_by?: string
  person_id?: string
  created: string
  updated: string
}

// Auth types
export interface AuthToken {
  token: string
  user: User
}
