import { ChecklistItem, GroceryCategory, Recipe } from '../types'

export const GROCERY_CATEGORIES: GroceryCategory[] = [
  'Produce', 'Dairy', 'Meat', 'Frozen', 'Beverages', 'Pantry', 'Bakery', 'Condiments', 'Snacks', 'Other',
]

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
          grocery_category: ingredient.grocery_category || getGroceryCategory(ingredient.item_name),
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
 * Uses the stored grocery_category field when available, falls back to heuristic
 */
export const groupByGroceryCategory = (
  items: ChecklistItem[]
): Record<string, ChecklistItem[]> => {
  const groceryItems = items.filter((item) => item.is_grocery)

  const grouped: Record<string, ChecklistItem[]> = {}
  for (const cat of GROCERY_CATEGORIES) {
    grouped[cat] = []
  }

  groceryItems.forEach((item) => {
    const category = item.grocery_category || getGroceryCategory(item.item_name)
    if (grouped[category]) {
      grouped[category].push(item)
    } else {
      grouped['Other'].push(item)
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
 * Infer grocery category from item name.
 * Expanded heuristic with 10 categories.
 */
export const getGroceryCategory = (itemName: string): GroceryCategory => {
  const lower = itemName.toLowerCase()

  if (
    ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage',
     'half and half', 'half & half', 'whipping', 'cheddar', 'mozzarella',
     'parmesan', 'brie', 'gouda', 'swiss', 'provolone', 'ricotta',
     'cream cheese', 'egg', 'eggs', 'whipped cream'].some((word) =>
      lower.includes(word)
    )
  ) {
    return 'Dairy'
  }

  if (
    ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon', 'ground',
     'steak', 'sausage', 'bacon', 'ham', 'lamb', 'shrimp', 'crab',
     'lobster', 'tuna', 'tilapia', 'cod', 'mahi', 'brisket', 'ribs',
     'hot dog', 'hotdog', 'bratwurst', 'brat', 'jerky', 'pepperoni',
     'salami', 'deli meat', 'lunch meat', 'prosciutto'].some((word) =>
      lower.includes(word)
    )
  ) {
    return 'Meat'
  }

  if (
    ['tomato', 'lettuce', 'onion', 'carrot', 'potato', 'pepper', 'spinach',
     'garlic', 'celery', 'cucumber', 'avocado', 'broccoli', 'cauliflower',
     'zucchini', 'squash', 'mushroom', 'corn', 'bean sprout', 'cabbage',
     'kale', 'arugula', 'radish', 'beet', 'turnip', 'parsley', 'cilantro',
     'basil', 'mint', 'dill', 'rosemary', 'thyme', 'green onion', 'scallion',
     'leek', 'ginger', 'jalapeno', 'serrano', 'habanero', 'bell pepper',
     'apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'strawberr',
     'blueberr', 'raspberr', 'blackberr', 'peach', 'pear', 'plum',
     'mango', 'pineapple', 'watermelon', 'melon', 'kiwi', 'cherry',
     'berries', 'fruit', 'salad mix', 'coleslaw', 'herb'].some((word) =>
      lower.includes(word)
    )
  ) {
    return 'Produce'
  }

  if (
    ['bread', 'bun', 'buns', 'roll', 'rolls', 'bagel', 'croissant',
     'tortilla', 'pita', 'naan', 'flatbread', 'english muffin', 'muffin',
     'cake', 'donut', 'doughnut', 'pastry', 'pie crust', 'biscuit',
     'cornbread', 'sourdough', 'ciabatta', 'focaccia', 'baguette',
     'crouton', 'breadcrumb', 'hamburger bun', 'hot dog bun'].some((word) =>
      lower.includes(word)
    )
  ) {
    return 'Bakery'
  }

  if (
    ['frozen', 'ice cream', 'popsicle', 'ice pop', 'frozen pizza',
     'frozen vegetable', 'frozen fruit', 'ice'].some((word) =>
      lower.includes(word)
    )
  ) {
    return 'Frozen'
  }

  if (
    ['coffee', 'tea', 'juice', 'water', 'soda', 'pop', 'lemonade',
     'gatorade', 'drink mix', 'cocoa', 'hot chocolate', 'cider',
     'sparkling', 'seltzer', 'beer', 'wine', 'liquor', 'vodka',
     'rum', 'whiskey', 'tequila', 'bourbon', 'gin', 'margarita',
     'kombucha', 'energy drink', 'creamer'].some((word) =>
      lower.includes(word)
    )
  ) {
    return 'Beverages'
  }

  if (
    ['ketchup', 'mustard', 'mayo', 'mayonnaise', 'relish', 'hot sauce',
     'bbq sauce', 'barbecue sauce', 'soy sauce', 'teriyaki', 'sriracha',
     'salsa', 'ranch', 'dressing', 'vinegar', 'worcestershire', 'tabasco',
     'honey', 'maple syrup', 'jam', 'jelly', 'peanut butter', 'nutella',
     'hummus', 'guacamole', 'sauce', 'marinade', 'seasoning',
     'steak sauce', 'a1', 'buffalo sauce'].some((word) =>
      lower.includes(word)
    )
  ) {
    return 'Condiments'
  }

  if (
    ['chip', 'chips', 'pretzel', 'popcorn', 'cracker', 'cookie', 'cookies',
     'granola bar', 'trail mix', 'nut', 'nuts', 'peanut', 'almond',
     'cashew', 'pistachio', 'snack', 'goldfish', 'cheez-it',
     'fruit snack', 'gummy', 'candy', 'chocolate', 'marshmallow',
     's\'more', 'smore', 'graham', 'dried fruit', 'beef jerky',
     'protein bar', 'energy bar', 'raisin', 'sunflower seed'].some((word) =>
      lower.includes(word)
    )
  ) {
    return 'Snacks'
  }

  if (
    ['flour', 'sugar', 'salt', 'rice', 'pasta', 'oil', 'spice', 'noodle',
     'can of', 'canned', 'bean', 'beans', 'lentil', 'cereal', 'oatmeal',
     'oats', 'pancake mix', 'baking', 'baking soda', 'baking powder',
     'vanilla', 'cinnamon', 'cumin', 'paprika', 'oregano', 'chili powder',
     'garlic powder', 'onion powder', 'pepper flake', 'cayenne',
     'olive oil', 'vegetable oil', 'canola oil', 'coconut oil',
     'cooking spray', 'broth', 'stock', 'bouillon', 'tomato sauce',
     'tomato paste', 'soup', 'mac and cheese', 'ramen', 'couscous',
     'quinoa', 'corn starch', 'cornstarch', 'spaghetti', 'macaroni',
     'penne', 'aluminum foil', 'foil', 'wrap', 'plastic wrap',
     'zip lock', 'ziplock', 'paper towel', 'napkin', 'plate',
     'cup', 'utensil', 'charcoal', 'lighter', 'match'].some((word) =>
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
