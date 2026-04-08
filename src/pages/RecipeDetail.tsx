import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRecipe, useDeleteRecipe } from '../hooks/useQueries'
import { Ingredient, Recipe } from '../types'
import { exportRecipe } from '../utils/recipeIO'

const categoryColors: Record<string, string> = {
  Breakfast: 'bg-amber-100 text-amber-800',
  Lunch: 'bg-green-100 text-green-800',
  Dinner: 'bg-blue-100 text-blue-800',
  Snack: 'bg-purple-100 text-purple-800',
}

const storageIcons: Record<string, string> = {
  Cooler: '🧊',
  'Dry Box': '📦',
  'Trailer Bin': '🚛',
  Gear: '🎒',
}

function groupIngredientsByStorage(ingredients: Ingredient[]): Record<string, Ingredient[]> {
  return ingredients.reduce(
    (groups, ing) => {
      const key = ing.storage_type
      if (!groups[key]) groups[key] = []
      groups[key].push(ing)
      return groups
    },
    {} as Record<string, Ingredient[]>,
  )
}

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: recipe, isLoading } = useRecipe(id)
  const deleteRecipe = useDeleteRecipe()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteRecipe.mutateAsync(id)
      navigate('/recipes')
    } catch (err) {
      console.error('Failed to delete recipe:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="">
        <header className="bg-white shadow">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <div className="bg-white rounded-lg shadow p-6 animate-pulse space-y-3">
            <div className="h-7 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-full mt-6" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
          </div>
        </main>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-camp-800 mb-2">Recipe not found</h2>
          <button
            onClick={() => navigate('/recipes')}
            className="text-camp-600 hover:text-camp-800 font-medium transition"
          >
            Back to Recipes
          </button>
        </div>
      </div>
    )
  }

  const ingredients: Ingredient[] = recipe.ingredients ?? []
  const groupedIngredients = groupIngredientsByStorage(ingredients)

  return (
    <div className="">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/recipes')}
            className="flex items-center gap-1 text-camp-600 hover:text-camp-800 font-medium transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Recipes
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportRecipe(recipe as unknown as Recipe, ingredients)}
              className="px-4 py-2 bg-camp-100 hover:bg-camp-200 text-camp-700 font-medium rounded-lg transition"
            >
              Export
            </button>
            <button
              onClick={() => navigate(`/recipes/${id}/edit`)}
              className="px-4 py-2 bg-camp-600 hover:bg-camp-700 text-white font-medium rounded-lg transition"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition"
            >
              Delete
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Title section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h1 className="text-2xl font-bold text-camp-900">{recipe.name}</h1>
            <div className="flex items-center gap-3">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${categoryColors[recipe.category] ?? 'bg-gray-100 text-gray-800'}`}
              >
                {recipe.category}
              </span>
              {recipe.servings != null && (
                <span className="text-sm text-camp-600">
                  {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Instructions */}
          {recipe.instructions && (
            <div>
              <h2 className="text-lg font-semibold text-camp-800 mb-2">Instructions</h2>
              <div className="prose prose-camp max-w-none text-camp-700 whitespace-pre-wrap">
                {recipe.instructions}
              </div>
            </div>
          )}
        </div>

        {/* Ingredients grouped by storage type */}
        {ingredients.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-camp-800 mb-4">
              Ingredients ({ingredients.length})
            </h2>
            <div className="space-y-5">
              {Object.entries(groupedIngredients).map(([storageType, items]) => (
                <div key={storageType}>
                  <h3 className="text-sm font-semibold text-camp-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <span>{storageIcons[storageType] ?? '📋'}</span>
                    {storageType}
                  </h3>
                  <ul className="divide-y divide-camp-100">
                    {items.map((ing) => (
                      <li key={ing.id} className="py-2 flex justify-between items-center">
                        <span className="text-camp-800 flex items-center gap-2">
                          {ing.item_name}
                          {ing.optional && (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Optional
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-camp-500">
                          {ing.quantity} {ing.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {ingredients.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 text-center text-camp-500">
            No ingredients added yet.
          </div>
        )}
      </main>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-camp-900 mb-2">Delete Recipe</h3>
            <p className="text-camp-600 mb-6">
              Are you sure you want to delete <span className="font-semibold">{recipe.name}</span>? This
              action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-camp-700 font-medium rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteRecipe.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition"
              >
                {deleteRecipe.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
