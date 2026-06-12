import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useTripVaultItems, useCreateTripVaultItem, useUpdateTripVaultItem, useDeleteTripVaultItem } from '../hooks/useQueries'
import { useRealtimeTripVaultItems } from '../hooks/useRealtime'
import { PocketBaseService } from '../services/pocketbase'
import { TripVaultItem, Trip } from '../types'
import { computeDisplayQuantity, countTripDays } from '../utils/vault'
import PackImportModal from '../components/PackImportModal'

function PantryItemRow({
  item,
  tripDays,
  onToggle,
  onDelete,
}: {
  item: TripVaultItem
  tripDays: number
  onToggle: () => void
  onDelete: () => void
}) {
  const displayQty = computeDisplayQuantity(item, tripDays)

  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition ${item.checked ? 'bg-gray-50' : ''}`}>
      <input
        type="checkbox"
        checked={item.checked}
        onChange={onToggle}
        className="h-5 w-5 rounded border-gray-300 text-camp-600 focus:ring-camp-500"
      />
      <div className="flex-1 min-w-0">
        <span className={`font-medium ${item.checked ? 'line-through text-gray-400' : 'text-camp-900'}`}>
          {item.name}
        </span>
        <span className={`ml-2 font-medium ${item.checked ? 'line-through text-gray-400' : 'text-camp-900'}`}>
          {displayQty}
        </span>
        {item.quantity_type === 'per_day' && (
          <span className={`ml-1 text-xs ${item.checked ? 'text-gray-400' : 'text-camp-500'}`}>
            ({item.quantity}/day x {tripDays}d)
          </span>
        )}
      </div>
      {item.checked && item.checked_by && (
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {item.checked_by}
        </span>
      )}
      <button
        onClick={onDelete}
        className="shrink-0 p-1 text-camp-400 hover:text-red-500 transition"
        aria-label={`Delete ${item.name}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function TripPantry() {
  const { id: tripId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [showPackImport, setShowPackImport] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState<number>(1)
  const [newItemQtyType, setNewItemQtyType] = useState<'per_day' | 'total'>('total')

  useRealtimeTripVaultItems(tripId)

  const { data: trip } = useQuery({
    queryKey: ['trips', tripId],
    queryFn: () => PocketBaseService.getTrip(tripId!),
    enabled: !!tripId,
  })

  const { data: pantryItemsRaw, isLoading } = useTripVaultItems(tripId, 'pantry')

  const createTripVaultItem = useCreateTripVaultItem()
  const updateTripVaultItem = useUpdateTripVaultItem()
  const deleteTripVaultItem = useDeleteTripVaultItem()

  const pantryItems: TripVaultItem[] = (pantryItemsRaw as unknown as TripVaultItem[]) ?? []
  const tripData = trip as unknown as Trip | undefined

  const tripDays = useMemo(() => {
    if (!tripData) return 1
    return countTripDays(tripData.start_date, tripData.end_date)
  }, [tripData])

  const checkedCount = pantryItems.filter((i) => i.checked).length
  const totalCount = pantryItems.length
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  const handleToggle = (item: TripVaultItem) => {
    updateTripVaultItem.mutate({
      id: item.id,
      data: {
        checked: !item.checked,
        checked_by: !item.checked ? (user?.name || user?.email || '') : '',
      },
    })
  }

  const handleDeleteItem = (itemId: string) => {
    deleteTripVaultItem.mutate(itemId)
  }

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim() || !tripId) return

    createTripVaultItem.mutate({
      trip_id: tripId,
      name: newItemName.trim(),
      quantity: newItemQty,
      quantity_type: newItemQtyType,
      list_type: 'pantry',
      checked: false,
    })

    setNewItemName('')
    setNewItemQty(1)
    setNewItemQtyType('total')
    setShowAddForm(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-camp-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-camp-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-camp-50">
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate(`/trips/${tripId}`)}
              className="flex items-center gap-1 text-camp-600 hover:text-camp-800 font-medium transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Trip
            </button>
            <h1 className="text-xl font-bold text-camp-900">Trip Pantry</h1>
          </div>
          {tripData && (
            <p className="text-sm text-camp-500 mb-1">
              {tripData.name} — {tripDays} day{tripDays !== 1 ? 's' : ''}
            </p>
          )}

          {totalCount > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-sm text-camp-600 mb-1">
                <span>{checkedCount} of {totalCount} items</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-camp-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowPackImport(true)}
            className="px-3 py-1.5 text-sm bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition font-medium"
          >
            Import Pack
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 text-sm bg-camp-100 hover:bg-camp-200 text-camp-700 rounded-lg transition font-medium"
          >
            + Custom Item
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddCustomItem} className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Pantry item name..."
                autoFocus
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
              />
              <input
                type="number"
                min={0.05}
                step={0.05}
                value={newItemQty}
                onChange={(e) => setNewItemQty(Number(e.target.value))}
                className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
              />
              <select
                value={newItemQtyType}
                onChange={(e) => setNewItemQtyType(e.target.value as 'per_day' | 'total')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent bg-white"
              >
                <option value="total">Total</option>
                <option value="per_day">Per Day</option>
              </select>
              <button
                type="submit"
                disabled={!newItemName.trim()}
                className="px-4 py-2 text-sm bg-accent-600 hover:bg-accent-700 disabled:bg-accent-400 text-white rounded-lg transition font-medium"
              >
                Add
              </button>
            </div>
          </form>
        )}

        {pantryItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">🥫</p>
            <h2 className="text-xl font-bold text-camp-900 mb-2">No pantry items yet</h2>
            <p className="text-camp-600">
              Import pantry packs from your vault or add custom items for this trip.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y">
            {pantryItems.map((item) => (
              <PantryItemRow
                key={item.id}
                item={item}
                tripDays={tripDays}
                onToggle={() => handleToggle(item)}
                onDelete={() => handleDeleteItem(item.id)}
              />
            ))}
          </div>
        )}
      </main>

      {showPackImport && (
        <PackImportModal
          tripId={tripId!}
          tripPeople={[]}
          allowedCategories={['pantry']}
          title="Import Pantry Pack"
          onClose={() => setShowPackImport(false)}
        />
      )}
    </div>
  )
}
