import { useState, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  useVaultPacks,
  useDeleteVaultPack,
  useVaultPackItems,
  useAllVaultPackItems,
  useCreateVaultPackItem,
  useUpdateVaultPackItem,
  useDeleteVaultPackItem,
} from '../hooks/useQueries'
import { useFormKeyboardNav } from '../hooks/useFormKeyboardNav'
import { VaultPack, VaultPackItem, QuantityType } from '../types'
import { exportPack } from '../utils/vaultIO'

const packCategoryLabels: Record<string, string> = {
  gear: 'Gear',
  clothing: 'Clothing',
  kids: 'Kids',
  pantry: 'Pantry',
}

const packCategoryColors: Record<string, string> = {
  gear: 'bg-emerald-100 text-emerald-800',
  clothing: 'bg-blue-100 text-blue-800',
  kids: 'bg-purple-100 text-purple-800',
  pantry: 'bg-amber-100 text-amber-800',
}

type DraftPackItem = {
  name: string
  quantity: number | ''
  quantity_type: QuantityType
}

function emptyDraftPackItem(): DraftPackItem {
  return {
    name: '',
    quantity: 1,
    quantity_type: 'total',
  }
}

export default function VaultPackDetail() {
  const { packId } = useParams<{ packId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: packsData } = useVaultPacks(user?.id)
  const { data: packItemsData, isLoading } = useVaultPackItems(packId)
  const { data: allPackItemsData } = useAllVaultPackItems(user?.id)
  const deleteVaultPack = useDeleteVaultPack()
  const createPackItem = useCreateVaultPackItem()
  const updatePackItem = useUpdateVaultPackItem()
  const deletePackItem = useDeleteVaultPackItem()

  const pack = ((packsData as unknown as VaultPack[]) ?? []).find((p) => p.id === packId)
  const packItems: VaultPackItem[] = (packItemsData as unknown as VaultPackItem[]) ?? []
  const allPackItems: VaultPackItem[] = (allPackItemsData as unknown as VaultPackItem[]) ?? []

  // Unique item names across all packs for autocomplete
  const autocompleteNames = useMemo(() => {
    const names = new Set(allPackItems.map((i) => i.name))
    return Array.from(names).sort()
  }, [allPackItems])

  // Map of name -> most recent item data for pre-fill
  const itemsByName = useMemo(() => {
    const map = new Map<string, VaultPackItem>()
    for (const item of allPackItems) {
      map.set(item.name, item)
    }
    return map
  }, [allPackItems])

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [draftItems, setDraftItems] = useState<DraftPackItem[]>([emptyDraftPackItem()])
  const addFormRef = useRef<HTMLFormElement>(null)

  const handleCtrlEnterSubmit = useCallback(() => {
    addFormRef.current?.requestSubmit()
  }, [])

  useFormKeyboardNav({
    formRef: addFormRef,
    onSubmit: handleCtrlEnterSubmit,
    grid: {
      totalRows: draftItems.length,
      colCount: 3,
      onAddRow: () => setDraftItems((items) => [...items, emptyDraftPackItem()]),
    },
  })

  const resetForm = () => {
    setDraftItems([emptyDraftPackItem()])
    setEditingItemId(null)
  }

  const addDraftItem = () => {
    setDraftItems((items) => [...items, emptyDraftPackItem()])
  }

  const updateDraftItem = (index: number, updates: Partial<DraftPackItem>) => {
    setDraftItems((items) => items.map((item, i) => (i === index ? { ...item, ...updates } : item)))
  }

  const removeDraftItem = (index: number) => {
    setDraftItems((items) => {
      const next = items.filter((_, i) => i !== index)
      return next.length > 0 ? next : [emptyDraftPackItem()]
    })
  }

  const handleDraftNameChange = (index: number, value: string) => {
    updateDraftItem(index, { name: value })
    const existing = itemsByName.get(value)
    if (existing && !editingItemId) {
      updateDraftItem(index, {
        quantity: existing.quantity,
        quantity_type: existing.quantity_type,
      })
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!packId) return

    const validItems = draftItems
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        quantity: item.quantity === '' ? 1 : item.quantity,
      }))
      .filter((item) => item.name)

    if (validItems.length === 0) return

    if (editingItemId) {
      const [item] = validItems
      if (!item) return
      await updatePackItem.mutateAsync({
        id: editingItemId,
        data: {
          name: item.name,
          quantity: item.quantity,
          quantity_type: item.quantity_type,
        },
      })
    } else {
      await Promise.all(
        validItems.map((item) =>
          createPackItem.mutateAsync({
            pack_id: packId,
            name: item.name,
            quantity: item.quantity,
            quantity_type: item.quantity_type,
          }),
        ),
      )
    }
    resetForm()
  }

  const startEdit = (item: VaultPackItem) => {
    setEditingItemId(item.id)
    setDraftItems([
      {
        name: item.name,
        quantity: item.quantity,
        quantity_type: item.quantity_type,
      },
    ])
  }

  const handleDeleteItem = (itemId: string) => {
    deletePackItem.mutate(itemId)
  }

  const handleDeletePack = () => {
    if (confirm('Delete this pack and all its items?')) {
      deleteVaultPack.mutate(packId!, {
        onSuccess: () => navigate('/vault'),
      })
    }
  }

  if (!pack && !isLoading) {
    return (
      <div className="min-h-screen bg-camp-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-camp-600 mb-4">Pack not found.</p>
          <button
            onClick={() => navigate('/vault')}
            className="px-4 py-2 bg-camp-600 text-white rounded-lg hover:bg-camp-700"
          >
            Back to Vault
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-camp-50">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/vault')}
                className="text-camp-600 hover:text-camp-800 transition"
                aria-label="Back to vault"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-camp-900">{pack?.name ?? 'Loading...'}</h1>
              {pack && (
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${packCategoryColors[pack.category] ?? 'bg-gray-100 text-gray-800'}`}>
                  {packCategoryLabels[pack.category]}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportPack(pack as VaultPack, packItems)}
                className="px-3 py-1.5 text-sm bg-camp-100 hover:bg-camp-200 text-camp-700 rounded-lg transition font-medium"
              >
                Export
              </button>
              <button
                onClick={() => navigate(`/vault/packs/${packId}/edit`)}
                className="px-3 py-1.5 text-sm bg-camp-100 hover:bg-camp-200 text-camp-700 rounded-lg transition font-medium"
              >
                Edit
              </button>
              <button
                onClick={handleDeletePack}
                className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition font-medium"
              >
                Delete
              </button>
            </div>
          </div>
          <p className="text-sm text-camp-500 mt-1">
            {packItems.length} item{packItems.length !== 1 ? 's' : ''}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4">
        {/* Add/Edit item form */}
        <form ref={addFormRef} onSubmit={handleAddItem} className="bg-white rounded-lg shadow p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-camp-800">
                {editingItemId ? 'Edit Item' : 'Add Items'}
              </h2>
              {!editingItemId && (
                <button
                  type="button"
                  onClick={addDraftItem}
                  className="px-3 py-1.5 bg-camp-100 hover:bg-camp-200 text-camp-700 text-sm font-medium rounded-lg transition"
                >
                  + Add Item
                </button>
              )}
            </div>

            {draftItems.length === 0 && (
              <p className="text-camp-500 text-sm text-center py-4">
                No items yet. Click &quot;Add Item&quot; to start.
              </p>
            )}

            <div className="space-y-3">
              {draftItems.map((item, index) => (
                <div
                  key={`draft-${index}`}
                  className="border border-camp-100 rounded-lg p-3 space-y-3 sm:space-y-0 sm:flex sm:items-end sm:gap-3"
                >
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-camp-600 mb-1">Item</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleDraftNameChange(index, e.target.value)}
                      list="pack-item-names"
                      placeholder="Item name"
                      autoFocus={index === 0}
                      data-cell-row={index}
                      data-cell-col={0}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                    />
                  </div>

                  <div className="w-full sm:w-24">
                    <label className="block text-xs font-medium text-camp-600 mb-1">Qty</label>
                    <input
                      type="number"
                      min={0.05}
                      step={0.05}
                      value={item.quantity}
                      onChange={(e) => updateDraftItem(index, { quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                      data-cell-row={index}
                      data-cell-col={1}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                    />
                  </div>

                  <div className="w-full sm:w-32">
                    <label className="block text-xs font-medium text-camp-600 mb-1">Type</label>
                    <select
                      value={item.quantity_type}
                      onChange={(e) => updateDraftItem(index, { quantity_type: e.target.value as QuantityType })}
                      data-cell-row={index}
                      data-cell-col={2}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent bg-white"
                    >
                      <option value="total">Total</option>
                      <option value="per_day">Per Day</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeDraftItem(index)}
                    tabIndex={-1}
                    className="mt-2 sm:mt-0 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                    aria-label="Remove item"
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

              <datalist id="pack-item-names">
                {autocompleteNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-camp-700 rounded-lg transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!draftItems.some((item) => item.name.trim())}
                  className="px-4 py-2 text-sm bg-accent-600 hover:bg-accent-700 disabled:bg-accent-400 text-white rounded-lg transition font-medium"
                >
                  {editingItemId ? 'Update' : 'Add Items'}
                </button>
              </div>
            </div>
          </form>

        {/* Items list */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : packItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-5xl mb-4">📦</p>
            <h2 className="text-xl font-bold text-camp-900 mb-2">No items yet</h2>
            <p className="text-camp-600">
              Add items to this pack. Item names autocomplete from your other packs.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y">
            {packItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-camp-900">
                    {item.name}
                  </span>
                  <span className="ml-2 text-sm text-camp-500">
                    {item.quantity} {item.quantity_type === 'per_day' ? '/day' : 'total'}
                  </span>
                </div>
                <button
                  onClick={() => startEdit(item)}
                  className="shrink-0 p-1 text-camp-400 hover:text-camp-700 transition"
                  aria-label={`Edit ${item.name}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="shrink-0 p-1 text-camp-400 hover:text-red-500 transition"
                  aria-label={`Delete ${item.name}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
