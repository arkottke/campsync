import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAllIngredientsAdmin, useBulkUpdateIngredients } from '../hooks/useQueries'
import { Ingredient, GroceryCategory } from '../types'
import { normalizeItemName, GROCERY_CATEGORIES } from '../utils/aggregator'

const STORAGE_TYPES = ['Cooler', 'Dry Box', 'Trailer Bin', 'Gear'] as const
type StorageType = (typeof STORAGE_TYPES)[number]

interface FoodItemRow {
  normalizedName: string
  displayName: string
  unit: string
  storage_type: StorageType
  grocery_category: GroceryCategory | undefined
  recipeCount: number
  ids: string[]
}

interface EditDraft {
  item_name: string
  unit: string
  storage_type: StorageType
  grocery_category: GroceryCategory
}

function isPackingStorage(s: StorageType) {
  return s === 'Trailer Bin' || s === 'Gear'
}

export default function FoodItems() {
  const navigate = useNavigate()
  const { data: ingredients, isLoading, isError } = useAllIngredientsAdmin()
  const bulkUpdate = useBulkUpdateIngredients()

  const [search, setSearch] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const rows = useMemo<FoodItemRow[]>(() => {
    if (!ingredients) return []

    const groups = new Map<string, { items: Ingredient[]; recipeIds: Set<string> }>()

    for (const ing of ingredients) {
      const key = normalizeItemName(ing.item_name)
      if (!key) continue
      if (!groups.has(key)) {
        groups.set(key, { items: [], recipeIds: new Set() })
      }
      const g = groups.get(key)!
      g.items.push(ing)
      if (ing.recipe_id) g.recipeIds.add(ing.recipe_id)
    }

    const result: FoodItemRow[] = []
    for (const [normalizedName, { items, recipeIds }] of groups) {
      const first = items[0]
      result.push({
        normalizedName,
        displayName: first.item_name,
        unit: first.unit ?? '',
        storage_type: first.storage_type as StorageType,
        grocery_category: first.grocery_category,
        recipeCount: recipeIds.size,
        ids: items.map((i) => i.id),
      })
    }

    result.sort((a, b) => a.normalizedName.localeCompare(b.normalizedName))
    return result
  }, [ingredients])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => r.displayName.toLowerCase().includes(q))
  }, [rows, search])

  const startEdit = (row: FoodItemRow) => {
    setEditingKey(row.normalizedName)
    setSaveError(null)
    setEditDraft({
      item_name: row.displayName,
      unit: row.unit,
      storage_type: row.storage_type,
      grocery_category: row.grocery_category ?? 'Other',
    })
  }

  const cancelEdit = () => {
    setEditingKey(null)
    setEditDraft(null)
    setSaveError(null)
  }

  const saveEdit = async (row: FoodItemRow) => {
    if (!editDraft) return
    const name = editDraft.item_name.trim()
    if (!name) return

    setSavingKey(row.normalizedName)
    setSaveError(null)
    try {
      await bulkUpdate.mutateAsync(
        row.ids.map((id) => ({
          id,
          data: {
            item_name: name,
            unit: editDraft.unit.trim(),
            storage_type: editDraft.storage_type,
            grocery_category: editDraft.grocery_category,
          },
        })),
      )
      setEditingKey(null)
      setEditDraft(null)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSavingKey(null)
    }
  }

  const newNormalizedConflicts = (row: FoodItemRow): boolean => {
    if (!editDraft) return false
    const newKey = normalizeItemName(editDraft.item_name)
    return newKey !== row.normalizedName && rows.some((r) => r.normalizedName === newKey)
  }

  return (
    <div className="">
      <header className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 text-camp-600 hover:text-camp-800 font-medium transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </button>
            <h1 className="text-2xl font-bold text-camp-900">Food Items</h1>
          </div>
          {!isLoading && !isError && (
            <span className="text-sm text-camp-500">{filteredRows.length} item{filteredRows.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ingredients…"
            className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent text-sm"
          />
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-camp-600" />
          </div>
        )}

        {isError && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            Failed to load food items. Please try again.
          </div>
        )}

        {!isLoading && !isError && filteredRows.length === 0 && (
          <div className="text-center py-16 text-camp-500">
            {search ? 'No items match your search.' : 'No food items found.'}
          </div>
        )}

        {!isLoading && !isError && filteredRows.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-camp-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-camp-700 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-camp-700 font-medium w-24">Unit</th>
                  <th className="text-left px-4 py-3 text-camp-700 font-medium w-32">Storage</th>
                  <th className="text-left px-4 py-3 text-camp-700 font-medium w-32">Category</th>
                  <th className="text-left px-4 py-3 text-camp-700 font-medium w-24">Recipes</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map((row) => {
                  const isEditing = editingKey === row.normalizedName
                  const isSaving = savingKey === row.normalizedName
                  const conflicts = isEditing && newNormalizedConflicts(row)

                  if (isEditing && editDraft) {
                    return (
                      <tr key={row.normalizedName} className="bg-camp-50">
                        <td className="px-4 py-2">
                          <div>
                            <input
                              type="text"
                              value={editDraft.item_name}
                              onChange={(e) =>
                                setEditDraft((d) => d && { ...d, item_name: e.target.value })
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                              autoFocus
                            />
                            {conflicts && (
                              <p className="text-xs text-amber-600 mt-1">
                                Will merge with existing &ldquo;{editDraft.item_name.trim()}&rdquo; entry.
                              </p>
                            )}
                            {saveError && (
                              <p className="text-xs text-red-600 mt-1">{saveError}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editDraft.unit}
                            onChange={(e) =>
                              setEditDraft((d) => d && { ...d, unit: e.target.value })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editDraft.storage_type}
                            onChange={(e) =>
                              setEditDraft((d) =>
                                d && { ...d, storage_type: e.target.value as StorageType },
                              )
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                          >
                            {STORAGE_TYPES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editDraft.grocery_category}
                            onChange={(e) =>
                              setEditDraft((d) =>
                                d && { ...d, grocery_category: e.target.value as GroceryCategory },
                              )
                            }
                            disabled={isPackingStorage(editDraft.storage_type)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-camp-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
                          >
                            {GROCERY_CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-camp-500">{row.recipeCount}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => saveEdit(row)}
                              disabled={isSaving || !editDraft.item_name.trim()}
                              className="px-3 py-1 text-xs bg-camp-600 hover:bg-camp-700 disabled:bg-camp-400 text-white rounded-lg transition font-medium"
                            >
                              {isSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={isSaving}
                              className="px-3 py-1 text-xs bg-white hover:bg-gray-50 text-camp-700 border border-gray-300 rounded-lg transition font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={row.normalizedName} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-camp-900">{row.displayName}</td>
                      <td className="px-4 py-3 text-camp-600">{row.unit || <span className="text-camp-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            isPackingStorage(row.storage_type)
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-camp-100 text-camp-700'
                          }`}
                        >
                          {row.storage_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-camp-600">
                        {isPackingStorage(row.storage_type) ? (
                          <span className="text-camp-300">—</span>
                        ) : (
                          row.grocery_category ?? <span className="text-camp-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                          {row.recipeCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="text-camp-600 hover:text-camp-800 text-sm font-medium transition"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
