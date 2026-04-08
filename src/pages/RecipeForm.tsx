import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRecipe, useCreateRecipe, useUpdateRecipe, useAllIngredients } from '../hooks/useQueries'
import { useFormKeyboardNav } from '../hooks/useFormKeyboardNav'
import { PocketBaseService } from '../services/pocketbase'
import { Ingredient, Recipe } from '../types'

type IngredientRow = {
  id?: string
  item_name: string
  quantity: number
  unit: string
  storage_type: 'Cooler' | 'Dry Box' | 'Trailer Bin' | 'Gear'
  optional: boolean
}

const storageTypes: IngredientRow['storage_type'][] = ['Cooler', 'Dry Box', 'Trailer Bin', 'Gear']
const categoryOptions: Recipe['category'][] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

function emptyIngredient(): IngredientRow {
  return { item_name: '', quantity: 1, unit: '', storage_type: 'Dry Box', optional: false }
}

export default function RecipeForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: existingRecipe, isLoading: loadingRecipe } = useRecipe(id)
  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()

  const [name, setName] = useState('')
  const [category, setCategory] = useState<Recipe['category']>('Dinner')
  const [servings, setServings] = useState<number | ''>('')
  const [instructions, setInstructions] = useState('')
  const [ingredients, setIngredients] = useState<IngredientRow[]>([])
  const [originalIngredientIds, setOriginalIngredientIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const [acIndex, setAcIndex] = useState<number | null>(null) // which row has open autocomplete
  const [acHighlight, setAcHighlight] = useState(0)

  const { data: allIngredientsRaw } = useAllIngredients()
  // Build a de-duplicated map of lowercase name -> canonical display name + defaults
  const allIngredientDefaults = useMemo(() => {
    const map = new Map<string, { label: string; unit: string; storage_type: IngredientRow['storage_type'] }>()
    for (const ing of (allIngredientsRaw ?? []) as Array<{ item_name: string; unit: string; storage_type: IngredientRow['storage_type'] }>) {
      const key = ing.item_name.toLowerCase().trim()
      const label = ing.item_name.trim()
      const unit = ing.unit?.trim() ?? ''
      if (!key || !label) continue

      const existing = map.get(key)
      if (!existing) {
        map.set(key, { label, unit, storage_type: ing.storage_type })
        continue
      }

      // Prefer a known unit over blank entries when multiple historical rows exist.
      if (!existing.unit && unit) {
        map.set(key, { ...existing, unit })
      }
    }
    return map
  }, [allIngredientsRaw])

  // Pre-populate when editing
  useEffect(() => {
    if (isEdit && existingRecipe) {
      setName(existingRecipe.name)
      setCategory(existingRecipe.category)
      setServings(existingRecipe.servings ?? '')
      setInstructions(existingRecipe.instructions ?? '')

      const existingIngredients: Ingredient[] = existingRecipe.ingredients ?? []
      setIngredients(
        existingIngredients.map((ing) => ({
          id: ing.id,
          item_name: ing.item_name,
          quantity: ing.quantity,
          unit: ing.unit,
          storage_type: ing.storage_type,
          optional: Boolean(ing.optional),
        })),
      )
      setOriginalIngredientIds(existingIngredients.map((ing) => ing.id))
    }
  }, [isEdit, existingRecipe])

  const ingredientsByName = useMemo(() => {
    const map = new Map<string, { unit: string; storage_type: IngredientRow['storage_type'] }>()
    for (const ing of ingredients) {
      if (ing.item_name.trim()) {
        map.set(ing.item_name.toLowerCase().trim(), { unit: ing.unit, storage_type: ing.storage_type })
      }
    }
    return map
  }, [ingredients])

  const getSuggestions = (value: string) => {
    const q = value.toLowerCase().trim()
    if (q.length < 2) return []
    const seen = new Set<string>()
    const results: string[] = []
    for (const [key, defaults] of allIngredientDefaults.entries()) {
      if (key.includes(q) && !seen.has(key)) {
        seen.add(key)
        results.push(defaults.label)
      }
    }
    return results.slice(0, 8)
  }

  const applyAutocomplete = (index: number, name: string) => {
    const defaults = allIngredientDefaults.get(name.toLowerCase().trim())
    setIngredients(
      ingredients.map((ing, i) => {
        if (i !== index) return ing
        const updated = { ...ing, item_name: name }
        if (defaults) {
          updated.unit = defaults.unit
          if (ing.storage_type === 'Dry Box') updated.storage_type = defaults.storage_type
        }
        return updated
      })
    )
    setAcIndex(null)
    setAcHighlight(0)
  }

  const handleItemNameChange = (index: number, value: string) => {
    const existing = ingredientsByName.get(value.toLowerCase().trim())
    setIngredients(
      ingredients.map((ing, i) => {
        if (i !== index) return ing
        const updated = { ...ing, item_name: value }
        if (existing) {
          if (!ing.unit) updated.unit = existing.unit
          if (ing.storage_type === 'Dry Box') updated.storage_type = existing.storage_type
        }
        return updated
      })
    )
    setAcHighlight(0)
    setAcIndex(value.trim().length >= 2 ? index : null)
  }

  const addIngredient = () => {
    setIngredients([...ingredients, emptyIngredient()])
  }

  const handleCtrlEnterSubmit = useCallback(() => {
    formRef.current?.requestSubmit()
  }, [])

  useFormKeyboardNav({
    formRef,
    onSubmit: handleCtrlEnterSubmit,
    grid: {
      totalRows: ingredients.length,
      colCount: 4,
      onAddRow: addIngredient,
    },
  })

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof IngredientRow, value: string | number | boolean) => {
    setIngredients(
      ingredients.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)),
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Recipe name is required.')
      return
    }

    setError('')
    setSaving(true)

    try {
      const recipeData: Partial<Recipe> = {
        name: name.trim(),
        category,
        instructions: instructions || ' ',
        servings: servings === '' ? 1 : servings,
        owner_id: user?.id,
      }

      let recipeId: string

      if (isEdit && id) {
        await updateRecipe.mutateAsync({ id, data: recipeData })
        recipeId = id

        // Delete removed ingredients
        const keptIds = ingredients.filter((ing) => ing.id).map((ing) => ing.id!)
        const toDelete = originalIngredientIds.filter((oid) => !keptIds.includes(oid))
        await Promise.all(toDelete.map((oid) => PocketBaseService.deleteIngredient(oid)))

        // Update existing ingredients
        const existingIngredients = ingredients.filter((ing) => ing.id && ing.item_name.trim())
        await Promise.all(
          existingIngredients.map((ing) =>
            PocketBaseService.updateIngredient(ing.id!, {
              item_name: ing.item_name.trim(),
              quantity: ing.quantity,
              unit: ing.unit,
              storage_type: ing.storage_type,
              optional: ing.optional,
            }),
          ),
        )
      } else {
        const created = (await createRecipe.mutateAsync(recipeData)) as { id: string }
        recipeId = created.id
      }

      // Create new ingredients (those without an existing id)
      const newIngredients = ingredients.filter((ing) => !ing.id && ing.item_name.trim())
      await Promise.all(
        newIngredients.map((ing) =>
          PocketBaseService.createIngredient({
            recipe_id: recipeId,
            item_name: ing.item_name.trim(),
            quantity: ing.quantity,
            unit: ing.unit,
            storage_type: ing.storage_type,
            optional: ing.optional,
          }),
        ),
      )

      navigate(isEdit ? `/recipes/${recipeId}` : '/recipes')
    } catch (err) {
      const msg = (err as { message?: string })?.message || 'Failed to save recipe.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && loadingRecipe) {
    return (
      <div className="">
        <header className="bg-white shadow">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow p-6 animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded w-1/2" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(isEdit ? `/recipes/${id}` : '/recipes')}
            className="text-camp-600 hover:text-camp-800 transition"
            aria-label="Go back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-camp-900">
            {isEdit ? 'Edit Recipe' : 'New Recipe'}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div>
              <label htmlFor="recipe-name" className="block text-sm font-medium text-camp-900 mb-1">
                Recipe Name <span className="text-red-500">*</span>
              </label>
              <input
                id="recipe-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Campfire Chili"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-camp-900 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Recipe['category'])}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent bg-white"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="servings" className="block text-sm font-medium text-camp-900 mb-1">
                  Servings
                </label>
                <input
                  id="servings"
                  type="number"
                  min={1}
                  value={servings}
                  onChange={(e) => setServings(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="instructions" className="block text-sm font-medium text-camp-900 mb-1">
                Instructions
              </label>
              <textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={6}
                placeholder="Step-by-step cooking instructions..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent resize-y"
              />
            </div>
          </div>

          {/* Ingredients */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-camp-800">Ingredients</h2>
              <button
                type="button"
                onClick={addIngredient}
                className="px-3 py-1.5 bg-camp-100 hover:bg-camp-200 text-camp-700 text-sm font-medium rounded-lg transition"
              >
                + Add Ingredient
              </button>
            </div>

            {ingredients.length === 0 && (
              <p className="text-camp-500 text-sm text-center py-4">
                No ingredients yet. Click "Add Ingredient" to start.
              </p>
            )}

            <div className="space-y-3">
              {ingredients.map((ing, index) => (
                <div
                  key={ing.id ?? `new-${index}`}
                  className="border border-camp-100 rounded-lg p-3 space-y-3 sm:space-y-0 sm:flex sm:items-end sm:gap-3"
                >
                  {/* Item name */}
                  <div className="flex-1 relative">
                    <label className="block text-xs font-medium text-camp-600 mb-1">Item</label>
                    <input
                      type="text"
                      value={ing.item_name}
                      onChange={(e) => handleItemNameChange(index, e.target.value)}
                      onFocus={() => { if (ing.item_name.trim().length >= 2) setAcIndex(index) }}
                      onBlur={() => setTimeout(() => setAcIndex(null), 150)}
                      onKeyDown={(e) => {
                        const suggs = getSuggestions(ing.item_name)
                        if (acIndex !== index || suggs.length === 0) return
                        if (e.key === 'ArrowDown') { e.preventDefault(); setAcHighlight((h) => Math.min(h + 1, suggs.length - 1)) }
                        else if (e.key === 'ArrowUp') { e.preventDefault(); setAcHighlight((h) => Math.max(h - 1, 0)) }
                        else if (e.key === 'Enter') { e.preventDefault(); applyAutocomplete(index, suggs[acHighlight]) }
                        else if (e.key === 'Escape') { e.preventDefault(); setAcIndex(null) }
                      }}
                      placeholder="Item name"
                      data-cell-row={index}
                      data-cell-col={0}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                    />
                    {acIndex === index && getSuggestions(ing.item_name).length > 0 && (
                      <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {getSuggestions(ing.item_name).map((s, si) => (
                          <li
                            key={s}
                            onMouseDown={() => applyAutocomplete(index, s)}
                            onMouseEnter={() => setAcHighlight(si)}
                            className={`px-3 py-1.5 text-sm cursor-pointer ${
                              si === acHighlight ? 'bg-camp-100 text-camp-900' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="w-full sm:w-20">
                    <label className="block text-xs font-medium text-camp-600 mb-1">Qty</label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', Number(e.target.value))}
                      data-cell-row={index}
                      data-cell-col={1}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                    />
                  </div>

                  {/* Unit */}
                  <div className="w-full sm:w-24">
                    <label className="block text-xs font-medium text-camp-600 mb-1">Unit</label>
                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      placeholder="lbs, cups..."
                      data-cell-row={index}
                      data-cell-col={2}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                    />
                  </div>

                  {/* Storage type */}
                  <div className="w-full sm:w-36">
                    <label className="block text-xs font-medium text-camp-600 mb-1">Storage</label>
                    <select
                      value={ing.storage_type}
                      onChange={(e) =>
                        updateIngredient(index, 'storage_type', e.target.value)
                      }
                      data-cell-row={index}
                      data-cell-col={3}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent bg-white"
                    >
                      {storageTypes.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-auto sm:min-w-28">
                    <label className="block text-xs font-medium text-camp-600 mb-1">Optional</label>
                    <label className="inline-flex items-center gap-2 text-sm text-camp-700 h-[34px]">
                      <input
                        type="checkbox"
                        checked={ing.optional}
                        onChange={(e) => updateIngredient(index, 'optional', e.target.checked)}
                        className="rounded border-gray-300 text-camp-600 focus:ring-camp-500"
                      />
                      Optional
                    </label>
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    tabIndex={-1}
                    className="mt-2 sm:mt-0 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                    aria-label="Remove ingredient"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(isEdit ? `/recipes/${id}` : '/recipes')}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-camp-700 font-medium rounded-lg transition text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-accent-600 hover:bg-accent-700 disabled:bg-accent-400 text-white font-medium rounded-lg transition"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Recipe' : 'Save Recipe'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
