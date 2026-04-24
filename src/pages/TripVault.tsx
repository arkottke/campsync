import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useTripVaultItems, useCreateTripVaultItem, useUpdateTripVaultItem, useDeleteTripVaultItem } from '../hooks/useQueries'
import { useRealtimeTripVaultItems } from '../hooks/useRealtime'
import { PocketBaseService } from '../services/pocketbase'
import { TripVaultItem, Trip } from '../types'
import { computeDisplayQuantity, countTripDays } from '../utils/vault'
import PackImportModal from '../components/PackImportModal'

function ItemRow({
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
    <div
      className={`flex items-center gap-3 px-4 py-3 transition ${
        item.checked ? 'bg-gray-50' : ''
      }`}
    >
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

function SectionProgress({ items }: { items: TripVaultItem[] }) {
  const checked = items.filter((i) => i.checked).length
  const total = items.length
  if (total === 0) return null
  const pct = Math.round((checked / total) * 100)
  return (
    <div className="flex items-center gap-2 text-xs text-camp-500 mt-1">
      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
        <div className="bg-camp-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span>{checked}/{total}</span>
    </div>
  )
}

export default function TripVault() {
  const { id: tripId } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [showPackImport, setShowPackImport] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showUncheckedOnly, setShowUncheckedOnly] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty] = useState<number>(1)
  const [newItemQtyType, setNewItemQtyType] = useState<'per_day' | 'total'>('total')
  const [newItemPersonId, setNewItemPersonId] = useState<string>('')

  useRealtimeTripVaultItems(tripId)

  const { data: trip } = useQuery({
    queryKey: ['trips', tripId],
    queryFn: () => PocketBaseService.getTrip(tripId!),
    enabled: !!tripId,
  })

  const { data: vaultItemsRaw, isLoading } = useTripVaultItems(tripId, 'gear')

  const createTripVaultItem = useCreateTripVaultItem()
  const updateTripVaultItem = useUpdateTripVaultItem()
  const deleteTripVaultItem = useDeleteTripVaultItem()

  const allItems: TripVaultItem[] = (vaultItemsRaw as unknown as TripVaultItem[]) ?? []
  const tripData = trip as unknown as Trip | undefined

  const assignedPeople = useMemo(() => {
    const people: string[] = tripData?.people ?? []
    return people.map((name) => ({ id: name, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [tripData])

  const autocompleteGearNames = useMemo(() => {
    const names = new Set(allItems.map((i) => i.name).filter(Boolean))
    return Array.from(names).sort()
  }, [allItems])

  const gearItemsByName = useMemo(() => {
    const map = new Map<string, { quantity: number; quantity_type: 'per_day' | 'total' }>()
    for (const item of allItems) {
      if (item.name.trim()) {
        map.set(item.name, { quantity: item.quantity, quantity_type: item.quantity_type })
      }
    }
    return map
  }, [allItems])

  const handleGearNameChange = (value: string) => {
    setNewItemName(value)
    const existing = gearItemsByName.get(value)
    if (existing) {
      if (newItemQty === 1) setNewItemQty(existing.quantity)
      if (newItemQtyType === 'total') setNewItemQtyType(existing.quantity_type)
    }
  }

  const tripDays = useMemo(() => {
    if (!tripData) return 1
    return countTripDays(tripData.start_date, tripData.end_date)
  }, [tripData])

  const groupItems = useMemo(() => {
    const items = allItems.filter((item) => !item.person_id)
    return showUncheckedOnly ? items.filter((item) => !item.checked) : items
  }, [allItems, showUncheckedOnly])

  const personItemsMap = useMemo(() => {
    const map = new Map<string, TripVaultItem[]>()
    for (const person of assignedPeople) {
      let items = allItems.filter((item) => item.person_id === person.id)
      if (showUncheckedOnly) items = items.filter((item) => !item.checked)
      map.set(person.id, items)
    }
    return map
  }, [allItems, assignedPeople, showUncheckedOnly])

  const checkedCount = allItems.filter((i) => i.checked).length
  const totalCount = allItems.length
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
      list_type: 'gear',
      checked: false,
      ...(newItemPersonId ? { person_id: newItemPersonId } : {}),
    })
    setNewItemName('')
    setNewItemQty(1)
    setNewItemQtyType('total')
    setNewItemPersonId('')
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
          <div className="flex items-center justify-between mb-2">
            <Link to={`/trips/${tripId}`} className="text-camp-600 hover:text-camp-700 font-medium text-sm">
              ← Back to Trip
            </Link>
          </div>
          <h1 className="text-xl font-bold text-camp-900">
            Trip Gear
            {tripData && (
              <span className="text-sm font-normal text-camp-500 ml-2">
                ({tripData.name} — {tripDays} day{tripDays !== 1 ? 's' : ''})
              </span>
            )}
          </h1>

          {/* Overall progress */}
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

          {/* Filter */}
          {totalCount > 0 && (
            <label className="flex items-center gap-2 mt-2 text-sm text-camp-600">
              <input
                type="checkbox"
                checked={showUncheckedOnly}
                onChange={e => setShowUncheckedOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show unchecked only
            </label>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        {/* Action buttons */}
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

        {/* Add custom item form */}
        {showAddForm && (
          <form onSubmit={handleAddCustomItem} className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => handleGearNameChange(e.target.value)}
                list="gear-item-names"
                placeholder="Item name..."
                autoFocus
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
              />
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={newItemQty}
                onChange={(e) => setNewItemQty(Number(e.target.value))}
                className="w-20 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
              />
              <select
                value={newItemQtyType}
                onChange={(e) => setNewItemQtyType(e.target.value as 'per_day' | 'total')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent bg-white"
              >
                <option value="total">Total</option>
                <option value="per_day">Per Day</option>
              </select>
              <select
                value={newItemPersonId}
                onChange={(e) => setNewItemPersonId(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent bg-white"
              >
                <option value="">Group (shared)</option>
                {assignedPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
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

        <datalist id="gear-item-names">
          {autocompleteGearNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>

        {/* Items - organized by person */}
        {allItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">⛺</p>
            <h2 className="text-xl font-bold text-camp-900 mb-2">No gear yet</h2>
            <p className="text-camp-600">
              Import packs from your vault or add custom items for this trip.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Group items */}
            {groupItems.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-camp-700 uppercase tracking-wide mb-1">
                  Group
                </h3>
                <SectionProgress items={groupItems} />
                <div className="bg-white rounded-lg shadow divide-y mt-2">
                  {groupItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      tripDays={tripDays}
                      onToggle={() => handleToggle(item)}
                      onDelete={() => handleDeleteItem(item.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Per-person items */}
            {assignedPeople.map((person) => {
              const items = personItemsMap.get(person.id) ?? []
              if (items.length === 0) return null
              return (
                <div key={person.id}>
                  <h3 className="text-sm font-semibold text-camp-700 uppercase tracking-wide mb-1">
                    {person.name}
                  </h3>
                  <SectionProgress items={items} />
                  <div className="bg-white rounded-lg shadow divide-y mt-2">
                    {items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        tripDays={tripDays}
                        onToggle={() => handleToggle(item)}
                        onDelete={() => handleDeleteItem(item.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Pack Import Modal */}
      {showPackImport && (
        <PackImportModal
          tripId={tripId!}
          tripPeople={assignedPeople}
          allowedCategories={['gear', 'clothing', 'kids']}
          title="Import Gear Pack"
          onClose={() => setShowPackImport(false)}
        />
      )}
    </div>
  )
}
