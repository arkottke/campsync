import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PocketBaseService } from '../services/pocketbase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { useRealtimeChecklist } from '../hooks/useRealtime'
import { ChecklistItem, Recipe, TripVaultItem } from '../types'
import { aggregateIngredients, groupByStorageType, groupByGroceryCategory, normalizeItemName } from '../utils/aggregator'
import { countTripDays, computeDisplayQuantity } from '../utils/vault'

type ViewMode = 'all' | 'grocery' | 'packing'

const storageIcons: Record<string, string> = {
  Cooler: '🧊',
  'Dry Box': '📦',
  'Trailer Bin': '🚛',
  Gear: '⛺',
}

const groceryIcons: Record<string, string> = {
  Produce: '🥬',
  Dairy: '🧀',
  Meat: '🥩',
  Pantry: '🫙',
  Frozen: '🧊',
  Beverages: '☕',
  Bakery: '🍞',
  Condiments: '🧂',
  Snacks: '🍿',
  Other: '🛒',
}

export default function Checklist() {
  const { id: tripId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [showUncheckedOnly, setShowUncheckedOnly] = useState(false)

  // Real-time sync
  useRealtimeChecklist(tripId)

  const { data: trip } = useQuery({
    queryKey: ['trips', tripId],
    queryFn: () => PocketBaseService.getTrip(tripId!),
    enabled: !!tripId,
  })

  const { data: checklistItems, isLoading: checklistLoading } = useQuery({
    queryKey: ['checklist', tripId],
    queryFn: () => PocketBaseService.getChecklistItems(tripId!),
    enabled: !!tripId,
  })

  const { data: tripMeals } = useQuery({
    queryKey: ['tripMeals', tripId],
    queryFn: () => PocketBaseService.getTripMeals(tripId!),
    enabled: !!tripId,
  })

  const toggleItem = useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: boolean }) =>
      PocketBaseService.updateChecklistItem(id, {
        checked,
        checked_by: checked ? (user?.name || user?.email || '') : '',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklist', tripId] }),
  })

  const generateChecklist = useMutation({
    mutationFn: async () => {
      const mealList = (tripMeals as unknown as Array<{ recipe_id: string }>) ?? []

      // Delete existing checklist items for this trip
      const existing = checklistItems as unknown as ChecklistItem[] ?? []
      for (const item of existing) {
        await PocketBaseService.deleteChecklistItem(item.id)
      }

      // Get unique recipe IDs from meals
      const recipeIds = [...new Set(mealList.map(m => m.recipe_id))]

      // Fetch full recipe + ingredients for each
      const recipesWithIngredients: Recipe[] = []
      for (const rid of recipeIds) {
        const recipe = await PocketBaseService.getRecipe(rid) as unknown as Recipe
        // Count how many times this recipe appears in the meal plan
        const count = mealList.filter(m => m.recipe_id === rid).length
        for (let i = 0; i < count; i++) {
          recipesWithIngredients.push(recipe)
        }
      }

      const guestCount = (trip as unknown as { guest_count?: number })?.guest_count ?? 1
      const aggregated = aggregateIngredients(recipesWithIngredients, guestCount)

      // Merge in trip pantry items (total + per-day converted to trip duration)
      const pantryItems = (await PocketBaseService.getTripVaultItems(tripId!, 'pantry')) as unknown as TripVaultItem[]
      const tripData = trip as unknown as { start_date?: string; end_date?: string }
      const tripDays = tripData.start_date && tripData.end_date
        ? countTripDays(tripData.start_date, tripData.end_date)
        : 1

      for (const pantryItem of pantryItems) {
        const qty = computeDisplayQuantity(pantryItem, tripDays)
        const key = `${normalizeItemName(pantryItem.name)}--Dry Box`
        if (aggregated[key]) {
          aggregated[key] = {
            ...aggregated[key],
            quantity: aggregated[key].quantity + qty,
          }
        } else {
          aggregated[key] = {
            id: '',
            trip_id: tripId!,
            item_name: pantryItem.name,
            quantity: qty,
            unit: '',
            storage_type: 'Dry Box',
            checked: false,
            is_grocery: true,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          }
        }
      }

      // Create checklist items
      for (const item of Object.values(aggregated)) {
        await PocketBaseService.createChecklistItem({
          trip_id: tripId!,
          item_name: item.item_name,
          quantity: Math.round(item.quantity * 100) / 100,
          unit: item.unit,
          storage_type: item.storage_type,
          grocery_category: item.grocery_category,
          checked: false,
          is_grocery: item.is_grocery,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist', tripId] })
      toast('Checklist generated!')
    },
  })

  const items = useMemo(() => {
    const all = (checklistItems as unknown as ChecklistItem[]) ?? []
    if (showUncheckedOnly) return all.filter(i => !i.checked)
    return all
  }, [checklistItems, showUncheckedOnly])

  const grouped = useMemo(() => {
    if (viewMode === 'grocery') return groupByGroceryCategory(items)
    return groupByStorageType(items)
  }, [items, viewMode])

  const icons = viewMode === 'grocery' ? groceryIcons : storageIcons
  const totalItems = items.length
  const checkedItems = items.filter(i => i.checked).length
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  if (checklistLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-camp-600" />
      </div>
    )
  }

  return (
    <div className="">
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Link to={`/trips/${tripId}`} className="text-camp-600 hover:text-camp-700 font-medium text-sm">
              ← Back to Trip
            </Link>
            <button
              onClick={() => generateChecklist.mutate()}
              disabled={generateChecklist.isPending}
              className="text-sm px-3 py-1 bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {generateChecklist.isPending ? 'Generating...' : 'Regenerate List'}
            </button>
          </div>
          <h1 className="text-xl font-bold text-camp-900">Checklist</h1>

          {/* Progress */}
          <div className="mt-2">
            <div className="flex justify-between text-sm text-camp-600 mb-1">
              <span>{checkedItems} of {totalItems} items</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-camp-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* View mode tabs */}
          <div className="flex gap-1 mt-3">
            {(['all', 'grocery', 'packing'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                  viewMode === mode
                    ? 'bg-camp-600 text-white'
                    : 'bg-camp-100 text-camp-700 hover:bg-camp-200'
                }`}
              >
                {mode === 'all' ? 'All Items' : mode === 'grocery' ? 'Grocery Mode' : 'Packing Mode'}
              </button>
            ))}
          </div>

          {/* Filter */}
          <label className="flex items-center gap-2 mt-2 text-sm text-camp-600">
            <input
              type="checkbox"
              checked={showUncheckedOnly}
              onChange={e => setShowUncheckedOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show unchecked only
          </label>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        {totalItems === 0 ? (
          <div className="text-center py-12">
            <p className="text-6xl mb-4">📋</p>
            <h2 className="text-xl font-bold text-camp-900 mb-2">No checklist items yet</h2>
            <p className="text-camp-600 mb-4">
              Add meals and/or pantry items to your trip, then click "Regenerate List" to generate the checklist.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([group, groupItems]) => {
              if (groupItems.length === 0) return null
              return (
                <div key={group}>
                  <h2 className="text-lg font-bold text-camp-900 mb-2 flex items-center gap-2">
                    <span>{icons[group] || '📦'}</span>
                    {group}
                    <span className="text-sm font-normal text-camp-500">({groupItems.length})</span>
                  </h2>
                  <div className="bg-white rounded-lg shadow divide-y">
                    {groupItems.map((item: ChecklistItem) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 px-4 py-3 transition ${
                          item.checked ? 'bg-gray-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleItem.mutate({ id: item.id, checked: !item.checked })}
                          className="h-5 w-5 rounded border-gray-300 text-camp-600 focus:ring-camp-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`font-medium ${item.checked ? 'line-through text-gray-400' : 'text-camp-900'}`}>
                            {item.item_name}
                          </span>
                          <span className={`ml-2 text-sm ${item.checked ? 'text-gray-400' : 'text-camp-500'}`}>
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                        {item.checked && item.checked_by && (
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {item.checked_by}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
