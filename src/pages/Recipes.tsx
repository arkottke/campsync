import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useRecipes } from '../hooks/useQueries'
import { useAuth } from '../context/AuthContext'
import { Recipe } from '../types'
import { importRecipe, exportAllRecipes, detectAndValidateRecipeImport, importRecipeVault } from '../utils/recipeIO'

const categories = ['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack'] as const
type CategoryFilter = (typeof categories)[number]

const categoryColors: Record<string, string> = {
  Breakfast: 'bg-amber-100 text-amber-800',
  Lunch: 'bg-green-100 text-green-800',
  Dinner: 'bg-blue-100 text-blue-800',
  Snack: 'bg-purple-100 text-purple-800',
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow p-5 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-1/3" />
    </div>
  )
}

export default function Recipes() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { data, isLoading } = useRecipes()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All')
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState('')
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setImportError('')
    setImportSuccess('')
    setImporting(true)

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const result = detectAndValidateRecipeImport(parsed)
      if (result.kind === 'single') {
        const newId = await importRecipe(result.payload, user.id)
        queryClient.invalidateQueries({ queryKey: ['recipes'] })
        navigate(`/recipes/${newId}`)
      } else {
        const newIds = await importRecipeVault(result.payload, user.id)
        queryClient.invalidateQueries({ queryKey: ['recipes'] })
        setImportSuccess(`Imported ${newIds.length} recipe${newIds.length !== 1 ? 's' : ''} successfully.`)
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import.')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleExportAll = async () => {
    if (!user) return
    setExporting(true)
    setImportError('')
    try {
      await exportAllRecipes(user.id)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to export recipes.')
    } finally {
      setExporting(false)
    }
  }

  const recipes: Recipe[] = (data as unknown as { items?: Recipe[] })?.items ?? (data as unknown as Recipe[] | undefined) ?? []

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = activeCategory === 'All' || r.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [recipes, search, activeCategory])

  return (
    <div className="">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1 text-camp-600 hover:text-camp-800 font-medium transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Home
            </button>
            <h1 className="text-2xl font-bold text-camp-900">Recipe Vault</h1>
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
              disabled={exporting || recipes.length === 0}
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
              onClick={() => navigate('/recipes/new')}
              className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-lg transition"
            >
              + Add Recipe
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
            placeholder="Search recipes..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent bg-white"
          />
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-1 px-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeCategory === cat
                  ? 'bg-camp-600 text-white'
                  : 'bg-white text-camp-700 border border-camp-200 hover:bg-camp-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🍳</div>
            <h2 className="text-xl font-semibold text-camp-800 mb-2">No recipes found</h2>
            <p className="text-camp-600 mb-6">
              {recipes.length === 0
                ? 'Your recipe vault is empty. Add your first camping recipe!'
                : 'No recipes match your current filters.'}
            </p>
            {recipes.length === 0 && (
              <button
                onClick={() => navigate('/recipes/new')}
                className="px-6 py-2 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-lg transition"
              >
                Add Your First Recipe
              </button>
            )}
          </div>
        )}

        {/* Recipe grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => navigate(`/recipes/${recipe.id}`)}
                className="bg-white rounded-lg shadow p-5 text-left hover:shadow-lg transition cursor-pointer w-full"
              >
                <h3 className="text-lg font-semibold text-camp-900 mb-2 truncate">{recipe.name}</h3>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[recipe.category] ?? 'bg-gray-100 text-gray-800'}`}
                >
                  {recipe.category}
                </span>
                {recipe.servings != null && (
                  <p className="text-sm text-camp-600 mt-3">
                    <span className="font-medium">{recipe.servings}</span> serving{recipe.servings !== 1 ? 's' : ''}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
