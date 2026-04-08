import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import { useVaultPacks, useVaultPackItems, useCopyPackToTrip } from '../hooks/useQueries'
import { VaultPack, VaultPackItem, PackCategory } from '../types'

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

interface PackImportModalProps {
  tripId: string
  tripPeople: { id: string; name: string }[]
  onClose: () => void
  allowedCategories?: PackCategory[]
  title?: string
}

function PackOption({
  pack,
  selected,
  personIds,
  tripPeople,
  onToggle,
  onPersonChange,
  onPersonToggle,
}: {
  pack: VaultPack
  selected: boolean
  personIds: string[]
  tripPeople: { id: string; name: string }[]
  onToggle: () => void
  onPersonChange: (personId: string) => void
  onPersonToggle: (personId: string) => void
}) {
  const { data } = useVaultPackItems(pack.id)
  const items: VaultPackItem[] = (data as unknown as VaultPackItem[]) ?? []
  const itemCount = items.length

  return (
    <div
      className={`px-3 py-3 rounded-lg transition ${
        selected ? 'bg-camp-50 ring-2 ring-camp-500' : 'hover:bg-camp-50'
      }`}
    >
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 rounded border-gray-300 text-camp-600 focus:ring-camp-500"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-camp-900">{pack.name}</span>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${packCategoryColors[pack.category] ?? 'bg-gray-100 text-gray-800'}`}>
              {packCategoryLabels[pack.category]}
            </span>
            <span className="text-xs text-camp-500">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </span>
          </div>
          {items.length > 0 && (
            <p className="text-xs text-camp-400 mt-0.5 truncate">
              {items.map((i) => i.name).join(', ')}
            </p>
          )}
        </div>
      </label>
      {selected && (
        <div className="mt-2 ml-7">
          {pack.category === 'clothing' && tripPeople.length > 0 ? (
            <div>
              <p className="text-xs text-camp-600 font-medium mb-1">Assign clothing to people:</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {tripPeople.map((p) => {
                  const checked = personIds.includes(p.id)
                  return (
                    <label key={p.id} className="inline-flex items-center gap-1.5 text-xs text-camp-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onPersonToggle(p.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-camp-600 focus:ring-camp-500"
                      />
                      <span>{p.name}</span>
                    </label>
                  )
                })}
              </div>
              <p className="text-[11px] text-camp-500 mt-1">
                If none selected, items are imported to Group.
              </p>
            </div>
          ) : (
            <div>
              <label className="text-xs text-camp-600 font-medium">Assign to:</label>
              <select
                value={personIds[0] ?? ''}
                onChange={(e) => onPersonChange(e.target.value)}
                className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent bg-white"
              >
                <option value="">Group (shared)</option>
                {tripPeople.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PackImportModal({
  tripId,
  tripPeople,
  onClose,
  allowedCategories,
  title,
}: PackImportModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { data } = useVaultPacks(user?.id)
  const copyPackToTrip = useCopyPackToTrip()
  // Map of packId -> selected person IDs (empty = group/shared)
  const [assignments, setAssignments] = useState<Map<string, string[]>>(new Map())
  const [importing, setImporting] = useState(false)

  const allPacks: VaultPack[] = (data as unknown as VaultPack[]) ?? []
  const packs: VaultPack[] = allowedCategories?.length
    ? allPacks.filter((pack) => allowedCategories.includes(pack.category))
    : allPacks

  const togglePack = (id: string) => {
    setAssignments((prev) => {
      const next = new Map(prev)
      if (next.has(id)) next.delete(id)
      else next.set(id, [])
      return next
    })
  }

  const setPersonForPack = (packId: string, personId: string) => {
    setAssignments((prev) => {
      const next = new Map(prev)
      next.set(packId, personId ? [personId] : [])
      return next
    })
  }

  const togglePersonForPack = (packId: string, personId: string) => {
    setAssignments((prev) => {
      const next = new Map(prev)
      const selected = new Set(next.get(packId) ?? [])
      if (selected.has(personId)) selected.delete(personId)
      else selected.add(personId)
      next.set(packId, Array.from(selected))
      return next
    })
  }

  const handleImport = async () => {
    if (assignments.size === 0) return
    setImporting(true)
    try {
      for (const pack of packs) {
        if (!assignments.has(pack.id)) continue
        const personIds = assignments.get(pack.id) ?? []

        if (pack.category === 'clothing' && personIds.length > 0) {
          for (const personId of personIds) {
            await copyPackToTrip.mutateAsync({
              tripId,
              packId: pack.id,
              personId,
            })
          }
        } else {
          await copyPackToTrip.mutateAsync({
            tripId,
            packId: pack.id,
            personId: personIds[0] || undefined,
          })
        }
      }

      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import one or more packs.'
      toast(message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} role="presentation" />

      <div className="relative bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-lg font-semibold text-camp-900">
            {title ?? 'Import Gear Pack'}
          </h3>
          <button
            onClick={onClose}
            className="text-camp-400 hover:text-camp-700 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-2 space-y-1">
          {packs.length === 0 && (
            <p className="text-center text-camp-500 py-6 text-sm">
              No matching packs in your vault yet.
            </p>
          )}
          {packs.map((pack) => (
            <PackOption
              key={pack.id}
              pack={pack}
              selected={assignments.has(pack.id)}
              personIds={assignments.get(pack.id) ?? []}
              tripPeople={tripPeople}
              onToggle={() => togglePack(pack.id)}
              onPersonChange={(pid) => setPersonForPack(pack.id, pid)}
              onPersonToggle={(pid) => togglePersonForPack(pack.id, pid)}
            />
          ))}
        </div>

        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={handleImport}
            disabled={assignments.size === 0 || importing}
            className="w-full px-4 py-2 bg-accent-600 hover:bg-accent-700 disabled:bg-accent-400 text-white font-medium rounded-lg transition text-sm"
          >
            {importing
              ? 'Importing...'
              : `Import Selected (${assignments.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}
