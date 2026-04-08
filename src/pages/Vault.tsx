import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useVaultPacks, useDeleteVaultPack, useVaultPackItems } from '../hooks/useQueries'
import { VaultPack, PackCategory } from '../types'
import { exportAllPacks, detectAndValidateVaultImport, importPack, importGearVault } from '../utils/vaultIO'

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

const packCategoryIcons: Record<string, string> = {
  gear: '⛺',
  clothing: '👔',
  kids: '👶',
  pantry: '🥫',
}

const categoryFilters = ['All', 'gear', 'clothing', 'kids', 'pantry'] as const
type CategoryFilter = (typeof categoryFilters)[number]

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow p-5 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-1/3" />
    </div>
  )
}

function PackCard({ pack, onDelete }: { pack: VaultPack; onDelete: (e: React.MouseEvent) => void }) {
  const navigate = useNavigate()
  const { data } = useVaultPackItems(pack.id)
  const itemCount = (data as unknown as unknown[])?.length ?? 0

  return (
    <div
      onClick={() => navigate(`/vault/packs/${pack.id}`)}
      className="bg-white rounded-lg shadow p-5 text-left hover:shadow-lg transition cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-camp-900 mb-2 truncate">
            {packCategoryIcons[pack.category]} {pack.name}
          </h3>
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
              packCategoryColors[pack.category] ?? 'bg-gray-100 text-gray-800'
            }`}
          >
            {packCategoryLabels[pack.category]}
          </span>
          <p className="text-sm text-camp-500 mt-2">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="shrink-0 p-1.5 text-camp-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          aria-label={`Delete ${pack.name}`}
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
    </div>
  )
}

export default function Vault() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { data: packsData, isLoading } = useVaultPacks(user?.id)
  const deleteVaultPack = useDeleteVaultPack()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All')
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const packs: VaultPack[] = (packsData as unknown as VaultPack[]) ?? []

  const filtered = useMemo(() => {
    return packs.filter((pack) => {
      const matchesSearch = pack.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = activeCategory === 'All' || pack.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [packs, search, activeCategory])

  const handleDeletePack = (e: React.MouseEvent, packId: string) => {
    e.stopPropagation()
    if (confirm('Delete this pack and all its items?')) {
      deleteVaultPack.mutate(packId)
    }
  }

  const handleExportAll = async () => {
    if (!user) return
    setExporting(true)
    setImportError('')
    try {
      await exportAllPacks(user.id)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to export gear vault.')
    } finally {
      setExporting(false)
    }
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setImportError('')
    setImportSuccess('')
    setImporting(true)

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const result = detectAndValidateVaultImport(parsed)
      if (result.kind === 'single') {
        const newId = await importPack(result.payload, user.id)
        queryClient.invalidateQueries({ queryKey: ['vaultPacks'] })
        navigate(`/vault/packs/${newId}`)
      } else {
        const newIds = await importGearVault(result.payload, user.id)
        queryClient.invalidateQueries({ queryKey: ['vaultPacks'] })
        queryClient.invalidateQueries({ queryKey: ['allVaultPackItems'] })
        setImportSuccess(`Imported ${newIds.length} pack${newIds.length !== 1 ? 's' : ''} successfully.`)
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-camp-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-camp-600 hover:text-camp-800 transition"
              aria-label="Back to dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-camp-900">Gear Vault</h1>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              onClick={handleExportAll}
              disabled={exporting || packs.length === 0}
              className="px-4 py-2 bg-camp-100 hover:bg-camp-200 text-camp-700 font-medium rounded-lg transition disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export All'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-4 py-2 bg-camp-100 hover:bg-camp-200 text-camp-700 font-medium rounded-lg transition disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Import'}
            </button>
            <button
              onClick={() => navigate('/vault/packs/new')}
              className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-lg transition"
            >
              + New Pack
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {importError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center justify-between">
            <span>{importError}</span>
            <button onClick={() => setImportError('')} className="text-red-700 hover:text-red-900 font-bold ml-2">
              &times;
            </button>
          </div>
        )}
        {importSuccess && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded flex items-center justify-between">
            <span>{importSuccess}</span>
            <button onClick={() => setImportSuccess('')} className="text-green-700 hover:text-green-900 font-bold ml-2">
              &times;
            </button>
          </div>
        )}
        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packs..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent bg-white"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
          {categoryFilters.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeCategory === cat
                  ? 'bg-camp-600 text-white'
                  : 'bg-white text-camp-700 border border-camp-200 hover:bg-camp-100'
              }`}
            >
              {cat === 'All' ? 'All' : packCategoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Packs */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📦</div>
            <h2 className="text-xl font-semibold text-camp-800 mb-2">No packs found</h2>
            <p className="text-camp-600 mb-6">
              {packs.length === 0
                ? 'Create gear packs to organize your camping gear (e.g. Summer Pack, Cold Weather Pack).'
                : 'No packs match your current filters.'}
            </p>
            {packs.length === 0 && (
              <button
                onClick={() => navigate('/vault/packs/new')}
                className="px-6 py-2 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-lg transition"
              >
                Create Your First Pack
              </button>
            )}
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                onDelete={(e) => handleDeletePack(e, pack.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
