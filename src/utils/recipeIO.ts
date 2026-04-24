import { Recipe, Ingredient, GroceryCategory } from '../types'
import { PocketBaseService } from '../services/pocketbase'

interface ExportIngredient {
  item_name: string
  quantity: number
  unit: string
  storage_type: 'Cooler' | 'Dry Box' | 'Trailer Bin' | 'Gear'
  grocery_category?: GroceryCategory
  optional?: boolean
}

export interface RecipeExportPayload {
  campsync_recipe: true
  name: string
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
  servings: number | null
  instructions: string
  ingredients: ExportIngredient[]
}

export interface RecipeVaultExportPayload {
  campsync_recipe_vault: true
  exported_at: string
  recipes: {
    name: string
    category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
    servings: number | null
    instructions: string
    ingredients: ExportIngredient[]
  }[]
}

export type RecipeImportResult =
  | { kind: 'single'; payload: RecipeExportPayload }
  | { kind: 'vault'; payload: RecipeVaultExportPayload }

const VALID_CATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const
const VALID_STORAGE_TYPES = ['Cooler', 'Dry Box', 'Trailer Bin', 'Gear'] as const

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function validateRecipeFields(obj: Record<string, unknown>, label: string) {
  if (typeof obj.name !== 'string' || !obj.name.trim()) {
    throw new Error(`Invalid ${label}: name is required.`)
  }
  if (!VALID_CATEGORIES.includes(obj.category as typeof VALID_CATEGORIES[number])) {
    throw new Error(`Invalid ${label}: category must be one of ${VALID_CATEGORIES.join(', ')}.`)
  }
  if (obj.servings != null && (typeof obj.servings !== 'number' || obj.servings < 1)) {
    throw new Error(`Invalid ${label}: servings must be a positive number.`)
  }
  if (typeof obj.instructions !== 'string') {
    throw new Error(`Invalid ${label}: instructions must be a string.`)
  }
  if (!Array.isArray(obj.ingredients)) {
    throw new Error(`Invalid ${label}: ingredients must be an array.`)
  }
  for (let i = 0; i < obj.ingredients.length; i++) {
    const ing = obj.ingredients[i] as Record<string, unknown>
    if (typeof ing.item_name !== 'string' || !ing.item_name.trim()) {
      throw new Error(`Invalid ${label} ingredient #${i + 1}: item_name is required.`)
    }
    if (typeof ing.quantity !== 'number' || ing.quantity < 0) {
      throw new Error(`Invalid ${label} ingredient #${i + 1}: quantity must be a non-negative number.`)
    }
    if (typeof ing.unit !== 'string') {
      throw new Error(`Invalid ${label} ingredient #${i + 1}: unit must be a string.`)
    }
    if (!VALID_STORAGE_TYPES.includes(ing.storage_type as typeof VALID_STORAGE_TYPES[number])) {
      throw new Error(
        `Invalid ${label} ingredient #${i + 1}: storage_type must be one of ${VALID_STORAGE_TYPES.join(', ')}.`,
      )
    }
    if (ing.optional != null && typeof ing.optional !== 'boolean') {
      throw new Error(`Invalid ${label} ingredient #${i + 1}: optional must be a boolean when provided.`)
    }
  }
}

/**
 * Export a recipe as a JSON file download
 */
export function exportRecipe(recipe: Recipe, ingredients: Ingredient[]) {
  const payload: RecipeExportPayload = {
    campsync_recipe: true,
    name: recipe.name,
    category: recipe.category,
    servings: recipe.servings ?? null,
    instructions: recipe.instructions,
    ingredients: ingredients.map((ing) => ({
      item_name: ing.item_name,
      quantity: ing.quantity,
      unit: ing.unit,
      storage_type: ing.storage_type,
      grocery_category: ing.grocery_category,
      optional: Boolean(ing.optional),
    })),
  }

  const slug = recipe.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  downloadJSON(payload, `${slug || 'recipe'}.json`)
}

/**
 * Export all recipes as a single JSON file download.
 */
export async function exportAllRecipes(ownerId: string) {
  const allRecipes = (await PocketBaseService.getAllRecipes()) as unknown as Recipe[]

  const recipesWithIngredients = await Promise.all(
    allRecipes
      .filter((r) => r.owner_id === ownerId)
      .map(async (recipe) => {
        const ingredients = (await PocketBaseService.getIngredients(recipe.id)) as unknown as Ingredient[]
        return {
          name: recipe.name,
          category: recipe.category,
          servings: recipe.servings ?? null,
          instructions: recipe.instructions,
          ingredients: ingredients.map((ing) => ({
            item_name: ing.item_name,
            quantity: ing.quantity,
            unit: ing.unit,
            storage_type: ing.storage_type,
            grocery_category: ing.grocery_category,
            optional: Boolean(ing.optional),
          })),
        }
      }),
  )

  const payload: RecipeVaultExportPayload = {
    campsync_recipe_vault: true,
    exported_at: new Date().toISOString(),
    recipes: recipesWithIngredients,
  }
  downloadJSON(payload, 'campsync-recipes.json')
}

/**
 * Validate imported JSON and return a typed payload.
 * Throws a descriptive error string on failure.
 */
export function validateRecipeImport(data: unknown): RecipeExportPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file: not a JSON object.')
  }
  const obj = data as Record<string, unknown>
  if (obj.campsync_recipe !== true) {
    throw new Error('Invalid file: missing CampSync recipe marker.')
  }
  validateRecipeFields(obj, 'recipe')
  return data as RecipeExportPayload
}

/**
 * Validate imported JSON as a full recipe vault export.
 */
export function validateRecipeVaultImport(data: unknown): RecipeVaultExportPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file: not a JSON object.')
  }
  const obj = data as Record<string, unknown>
  if (obj.campsync_recipe_vault !== true) {
    throw new Error('Invalid file: missing CampSync recipe vault marker.')
  }
  if (!Array.isArray(obj.recipes)) {
    throw new Error('Invalid recipe vault: recipes must be an array.')
  }
  for (let i = 0; i < obj.recipes.length; i++) {
    validateRecipeFields(obj.recipes[i] as Record<string, unknown>, `recipe #${i + 1}`)
  }
  return data as RecipeVaultExportPayload
}

/**
 * Auto-detect whether the imported JSON is a single recipe or a full recipe vault.
 */
export function detectAndValidateRecipeImport(data: unknown): RecipeImportResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file: not a JSON object.')
  }
  const obj = data as Record<string, unknown>
  if (obj.campsync_recipe === true) {
    return { kind: 'single', payload: validateRecipeImport(data) }
  }
  if (obj.campsync_recipe_vault === true) {
    return { kind: 'vault', payload: validateRecipeVaultImport(data) }
  }
  throw new Error('Unrecognized file format: not a CampSync recipe or recipe vault export.')
}

/**
 * Import a validated recipe payload into PocketBase.
 * Returns the new recipe ID.
 */
export async function importRecipe(payload: RecipeExportPayload, ownerId: string): Promise<string> {
  const created = (await PocketBaseService.createRecipe({
    name: payload.name,
    category: payload.category,
    servings: payload.servings ?? 1,
    instructions: payload.instructions,
    owner_id: ownerId,
  })) as { id: string }

  const recipeId = created.id

  await Promise.all(
    payload.ingredients.map((ing) =>
      PocketBaseService.createIngredient({
        recipe_id: recipeId,
        item_name: ing.item_name,
        quantity: ing.quantity,
        unit: ing.unit,
        storage_type: ing.storage_type,
        optional: Boolean(ing.optional),
      }),
    ),
  )

  return recipeId
}

/**
 * Import a full recipe vault export into PocketBase.
 * Returns array of new recipe IDs.
 */
export async function importRecipeVault(payload: RecipeVaultExportPayload, ownerId: string): Promise<string[]> {
  const ids: string[] = []
  for (const recipe of payload.recipes) {
    const id = await importRecipe(
      {
        campsync_recipe: true,
        name: recipe.name,
        category: recipe.category,
        servings: recipe.servings,
        instructions: recipe.instructions,
        ingredients: recipe.ingredients,
      },
      ownerId,
    )
    ids.push(id)
  }
  return ids
}
