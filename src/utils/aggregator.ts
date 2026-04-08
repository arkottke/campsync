import { ChecklistItem, Recipe } from '../types'

/**
 * Normalize item names for deduplication
 * Converts to lowercase and trims whitespace
 */
export const normalizeItemName = (name: string): string => {
  return name.toLowerCase().trim()
}

/**
 * Aggregate ingredients from multiple recipes
 * Multiplies quantities by guest count and deduplicates
 */
export const aggregateIngredients = (
  recipes: Recipe[],
  guestCount: number
): Record<string, ChecklistItem> => {
  const aggregated: Record<string, ChecklistItem> = {}

  recipes.forEach((recipe) => {
    recipe.ingredients?.forEach((ingredient) => {
      const normalizedName = normalizeItemName(ingredient.item_name)
      const key = `${normalizedName}-${ingredient.unit}-${ingredient.storage_type}`

      // Convert quantity based on recipe servings if available
      let adjustedQuantity = ingredient.quantity * guestCount
      if (recipe.servings && recipe.servings > 0) {
        // Adjust based on servings if different from 1
        adjustedQuantity = ingredient.quantity * (guestCount / recipe.servings)
      }

      if (aggregated[key]) {
        // Sum quantities for matching items
        aggregated[key] = {
          ...aggregated[key],
          quantity: aggregated[key].quantity + adjustedQuantity,
        }
      } else {
        aggregated[key] = {
          id: '',
          trip_id: '',
          item_name: ingredient.item_name,
          quantity: adjustedQuantity,
          unit: ingredient.unit,
          storage_type: ingredient.storage_type,
          checked: false,
          is_grocery: isGroceryItem(ingredient.storage_type),
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        }
      }
    })
  })

  return aggregated
}

/**
 * Group checklist items by storage type
 */
export const groupByStorageType = (
  items: ChecklistItem[]
): Record<string, ChecklistItem[]> => {
  const grouped: Record<string, ChecklistItem[]> = {
    'Cooler': [],
    'Dry Box': [],
    'Trailer Bin': [],
    'Gear': [],
  }

  items.forEach((item) => {
    if (grouped[item.storage_type]) {
      grouped[item.storage_type].push(item)
    }
  })

  // Sort items within each group by name
  Object.keys(grouped).forEach((key) => {
    grouped[key].sort((a, b) => a.item_name.localeCompare(b.item_name))
  })

  return grouped
}

/**
 * Group checklist items for grocery shopping mode
 * Groups by category (Produce, Dairy, etc.)
 */
export const groupByGroceryCategory = (
  items: ChecklistItem[]
): Record<string, ChecklistItem[]> => {
  const groceryItems = items.filter((item) => item.is_grocery)

  const grouped: Record<string, ChecklistItem[]> = {
    'Produce': [],
    'Dairy': [],
    'Meat': [],
    'Pantry': [],
    'Frozen': [],
    'Beverages': [],
    'Other': [],
  }

  groceryItems.forEach((item) => {
    const category = getGroceryCategory(item.item_name)
    if (grouped[category]) {
      grouped[category].push(item)
    }
  })

  return grouped
}

/**
 * Determine if an item is a grocery item based on storage type
 */
const isGroceryItem = (storageType: string): boolean => {
  return storageType === 'Cooler' || storageType === 'Dry Box'
}

/**
 * Infer grocery category from item name
 * This is a simple heuristic; could be extended
 */
const getGroceryCategory = (itemName: string): string => {
  const lower = itemName.toLowerCase()

  if (
    ['milk', 'cheese', 'yogurt', 'butter', 'cream'].some((word) =>
      lower.includes(word)
    )
  ) {
    return 'Dairy'
  }

  if (
    ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'ground'].some(
      (word) => lower.includes(word)
    )
  ) {
    return 'Meat'
  }

  if (
    ['tomato', 'lettuce', 'onion', 'carrot', 'potato', 'pepper', 'spinach'].some(
      (word) => lower.includes(word)
    )
  ) {
    return 'Produce'
  }

  if (
    ['frozen', 'ice'].some((word) => lower.includes(word))
  ) {
    return 'Frozen'
  }

  if (
    ['coffee', 'tea', 'juice', 'water', 'soda'].some((word) =>
      lower.includes(word)
    )
  ) {
    return 'Beverages'
  }

  if (
    ['flour', 'sugar', 'salt', 'rice', 'pasta', 'oil', 'spice'].some((word) =>
      lower.includes(word)
    )
  ) {
    return 'Pantry'
  }

  return 'Other'
}

/**
 * Check if an item needs to be packed (not a grocery item)
 */
export const isPacking = (item: ChecklistItem): boolean => {
  return !item.is_grocery
}

/**
 * Filter items by checked status
 */
export const filterByChecked = (items: ChecklistItem[], checked: boolean) => {
  return items.filter((item) => item.checked === checked)
}
