import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTrip, useDeleteTrip, useUpdateTrip, useCopyTrip, useTripTodos, useCreateTripTodo, useUpdateTripTodo, useDeleteTripTodo } from '../hooks/useQueries'
import { useRealtimeTripTodos } from '../hooks/useRealtime'
import { PocketBaseService } from '../services/pocketbase'
import { Recipe, TripMeal, Trip, TripTodo } from '../types'
import { useAuth } from '../context/AuthContext'

const MEAL_SLOTS = [
  { key: 'B' as const, label: 'Breakfast' },
  { key: 'L' as const, label: 'Lunch' },
  { key: 'D' as const, label: 'Dinner' },
  { key: 'S' as const, label: 'Snack' },
]

/** Generate an array of date strings (YYYY-MM-DD) between start and end inclusive. */
function getDateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const current = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (current <= last) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatHeaderDate(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${s.toLocaleDateString(undefined, opts)} - ${e.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`
}

interface RecipePickerProps {
  recipes: Recipe[]
  onSelect: (recipeId: string) => void
  onClose: () => void
}

function RecipePicker({ recipes, onSelect, onClose }: RecipePickerProps) {
  const [search, setSearch] = useState('')

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="presentation"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-md max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-lg font-semibold text-camp-900">Pick a Recipe</h3>
          <button
            onClick={onClose}
            className="text-camp-400 hover:text-camp-700 transition"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search recipes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-camp-500 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Recipe list */}
        <div className="overflow-y-auto flex-1 px-4 pb-2">
          {filtered.length === 0 && (
            <p className="text-center text-camp-500 py-6 text-sm">
              No recipes found.
            </p>
          )}
          {filtered.map((recipe) => (
            <button
              key={recipe.id}
              onClick={() => onSelect(recipe.id)}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-camp-50 transition text-sm"
            >
              <span className="font-medium text-camp-900">{recipe.name}</span>
              <span className="ml-2 text-camp-500 text-xs">
                {recipe.category}
              </span>
            </button>
          ))}
        </div>

        {/* New recipe shortcut */}
        <div className="px-4 py-3 border-t border-gray-100">
          <Link
            to="/recipes/new"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-camp-600 hover:bg-camp-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Recipe
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function TripDetail() {
  const { id: tripId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data: trip, isLoading: tripLoading } = useTrip(tripId)
  const deleteTripMutation = useDeleteTrip()
  const updateTrip = useUpdateTrip()
  const copyTripMutation = useCopyTrip()

  // Todo list
  const { data: todosRaw } = useTripTodos(tripId)
  const createTodo = useCreateTripTodo()
  const updateTodo = useUpdateTripTodo()
  const deleteTodo = useDeleteTripTodo()
  useRealtimeTripTodos(tripId)
  const [newTodoTitle, setNewTodoTitle] = useState('')
  const [showCompletedTodos, setShowCompletedTodos] = useState(false)

  const todos: TripTodo[] = Array.isArray(todosRaw)
    ? todosRaw
    : (todosRaw as any)?.items ?? []

  const filteredTodos = showCompletedTodos
    ? todos
    : todos.filter((t) => !t.checked)

  const todosCheckedCount = todos.filter((t) => t.checked).length

  // People inline editor
  const [newPersonName, setNewPersonName] = useState('')
  const [showPeopleEditor, setShowPeopleEditor] = useState(false)

  const tripData = trip as unknown as Trip | undefined
  const people: string[] = tripData?.people ?? []

  const addPerson = () => {
    const name = newPersonName.trim()
    if (!name || !tripId || !tripData) return
    if (people.includes(name)) {
      setNewPersonName('')
      return
    }
    updateTrip.mutate({ id: tripId, data: { people: [...people, name] } })
    setNewPersonName('')
  }

  const removePerson = (name: string) => {
    if (!tripId) return
    updateTrip.mutate({ id: tripId, data: { people: people.filter((p) => p !== name) } })
  }

  // Fetch trip meals
  const { data: mealsRaw } = useQuery({
    queryKey: ['tripMeals', tripId],
    queryFn: () => PocketBaseService.getTripMeals(tripId!),
    enabled: !!tripId,
  })

  // Fetch all recipes
  const { data: recipesRaw } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => PocketBaseService.listRecipes(),
  })

  // Add meal mutation
  const addMealMutation = useMutation({
    mutationFn: (meal: Partial<TripMeal>) =>
      PocketBaseService.addMealToTrip(meal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripMeals', tripId] })
    },
  })

  // Remove meal mutation
  const removeMealMutation = useMutation({
    mutationFn: (mealId: string) => PocketBaseService.deleteMeal(mealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripMeals', tripId] })
    },
  })

  // State for recipe picker
  const [pickerSlot, setPickerSlot] = useState<{
    date: string
    slot: TripMeal['meal_slot']
  } | null>(null)

  // State for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Normalize meals list
  const meals: TripMeal[] = Array.isArray(mealsRaw)
    ? mealsRaw
    : (mealsRaw as any)?.items ?? []

  // Normalize recipes list
  const recipesList: Recipe[] = Array.isArray(recipesRaw)
    ? recipesRaw
    : (recipesRaw as any)?.items ?? []

  // Build a recipe lookup map
  const recipeMap = useMemo(() => {
    const map = new Map<string, Recipe>()
    recipesList.forEach((r) => map.set(r.id, r))
    return map
  }, [recipesList])

  // Build a meals lookup: key = "date|slot" -> TripMeal
  const mealLookup = useMemo(() => {
    const map = new Map<string, TripMeal>()
    meals.forEach((m) => {
      map.set(`${m.date}|${m.meal_slot}`, m)
    })
    return map
  }, [meals])

  // Date range for the trip
  const dates = tripData ? getDateRange(tripData.start_date, tripData.end_date) : []

  const handleAddMeal = (recipeId: string) => {
    if (!pickerSlot || !tripId) return
    addMealMutation.mutate({
      trip_id: tripId,
      recipe_id: recipeId,
      date: pickerSlot.date,
      meal_slot: pickerSlot.slot,
    })
    setPickerSlot(null)
  }

  const handleRemoveMeal = (mealId: string) => {
    removeMealMutation.mutate(mealId)
  }

  const handleDeleteTrip = () => {
    if (!tripId) return
    deleteTripMutation.mutate(tripId, {
      onSuccess: () => navigate('/trips'),
    })
  }

  const handleCopyTrip = () => {
    if (!tripId || !user) return
    copyTripMutation.mutate(
      { sourceTripId: tripId, userId: user.id },
      { onSuccess: (newTrip) => navigate(`/trips/${(newTrip as any).id}/edit`) },
    )
  }

  if (tripLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-camp-600" />
      </div>
    )
  }

  if (!tripData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-camp-800">
            Trip not found
          </h2>
          <button
            onClick={() => navigate('/trips')}
            className="mt-4 text-camp-600 hover:text-camp-800 font-medium transition"
          >
            Back to Trips
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate('/trips')}
              className="text-camp-600 hover:text-camp-800 transition"
              aria-label="Back to trips"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-camp-900 truncate">
              {tripData.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-camp-600">
            <span>{formatHeaderDate(tripData.start_date, tripData.end_date)}</span>
            <span>
              {tripData.guest_count} guest{tripData.guest_count !== 1 ? 's' : ''}
            </span>
            {tripData.members && tripData.members.length > 0 && (
              <span>
                {tripData.members.length} member
                {tripData.members.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* People display / editor */}
          <div className="mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              {people.length > 0 && (
                <span className="text-sm text-camp-500">People:</span>
              )}
              {people.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-camp-100 text-camp-700 rounded-full text-sm"
                >
                  {name}
                  {showPeopleEditor && (
                    <button
                      onClick={() => removePerson(name)}
                      className="text-camp-400 hover:text-red-500 transition"
                      aria-label={`Remove ${name}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </span>
              ))}
              {!showPeopleEditor && (
                <button
                  onClick={() => setShowPeopleEditor(true)}
                  className="text-xs text-camp-500 hover:text-camp-700 transition"
                >
                  {people.length > 0 ? 'Edit' : '+ Add People'}
                </button>
              )}
            </div>
            {showPeopleEditor && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPerson())}
                  placeholder="Name..."
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                />
                <button
                  onClick={addPerson}
                  disabled={!newPersonName.trim()}
                  className="px-3 py-1.5 text-sm bg-camp-600 hover:bg-camp-700 disabled:bg-camp-400 text-white rounded-lg transition font-medium"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowPeopleEditor(false); setNewPersonName('') }}
                  className="px-3 py-1.5 text-sm text-camp-600 hover:text-camp-800 transition font-medium"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Link
                to={`/trips/${tripId}/vault`}
                className="px-4 py-1.5 text-sm bg-camp-100 hover:bg-camp-200 text-camp-800 rounded-lg transition font-medium"
              >
                Gear List
              </Link>
              <Link
                to={`/trips/${tripId}/pantry`}
                className="px-4 py-1.5 text-sm bg-camp-100 hover:bg-camp-200 text-camp-800 rounded-lg transition font-medium"
              >
                Pantry
              </Link>
              <Link
                to={`/trips/${tripId}/checklist`}
                className="px-4 py-1.5 text-sm bg-accent-100 hover:bg-accent-200 text-accent-800 rounded-lg transition font-medium"
              >
                Food List
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/trips/${tripId}/edit`)}
                className="px-4 py-1.5 text-sm bg-camp-100 hover:bg-camp-200 text-camp-800 rounded-lg transition font-medium"
              >
                Edit
              </button>
              <button
                onClick={handleCopyTrip}
                disabled={copyTripMutation.isPending}
                className="px-4 py-1.5 text-sm bg-camp-100 hover:bg-camp-200 text-camp-800 rounded-lg transition font-medium disabled:opacity-50"
              >
                {copyTripMutation.isPending ? 'Copying...' : 'Copy'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-1.5 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">
              Are you sure you want to delete this trip?
            </p>
            <p className="text-red-600 text-sm mt-1">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleDeleteTrip}
                disabled={deleteTripMutation.isPending}
                className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition font-medium"
              >
                {deleteTripMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-1.5 text-sm bg-white hover:bg-gray-50 text-camp-700 border border-gray-300 rounded-lg transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meal Planner */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <h2 className="text-lg font-semibold text-camp-800 mb-4">
          Meal Planner
        </h2>

        {dates.length === 0 && (
          <p className="text-camp-500">
            No dates to display. Check the trip start and end dates.
          </p>
        )}

        <div className="space-y-4">
          {dates.map((date) => (
            <div key={date} className="bg-white rounded-lg shadow">
              {/* Day header */}
              <div className="px-4 py-2 bg-camp-100 rounded-t-lg">
                <h3 className="text-sm font-semibold text-camp-800">
                  {formatDayLabel(date)}
                </h3>
              </div>

              {/* Meal slots grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100">
                {MEAL_SLOTS.map(({ key, label }) => {
                  const meal = mealLookup.get(`${date}|${key}`)
                  const recipe = meal ? recipeMap.get(meal.recipe_id) : null

                  return (
                    <div key={key} className="bg-white p-3 min-h-[5rem]">
                      <span className="block text-xs font-medium text-camp-500 mb-1">
                        {label}
                      </span>

                      {meal && recipe ? (
                        <div className="flex items-start gap-1">
                          <span className="text-sm text-camp-800 leading-tight flex-1">
                            {recipe.name}
                          </span>
                          <button
                            onClick={() => handleRemoveMeal(meal.id)}
                            disabled={removeMealMutation.isPending}
                            className="shrink-0 text-camp-400 hover:text-red-500 transition mt-0.5"
                            aria-label={`Remove ${recipe.name}`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ) : meal && !recipe ? (
                        <div className="flex items-start gap-1">
                          <span className="text-sm text-camp-400 italic leading-tight flex-1">
                            Unknown recipe
                          </span>
                          <button
                            onClick={() => handleRemoveMeal(meal.id)}
                            disabled={removeMealMutation.isPending}
                            className="shrink-0 text-camp-400 hover:text-red-500 transition mt-0.5"
                            aria-label="Remove meal"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setPickerSlot({ date, slot: key })
                          }
                          disabled={addMealMutation.isPending}
                          className="w-full flex items-center justify-center h-8 border-2 border-dashed border-camp-200 hover:border-accent-400 rounded text-camp-300 hover:text-accent-600 transition"
                          aria-label={`Add ${label} for ${formatDayLabel(date)}`}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* To-Do List */}
      <section className="max-w-3xl mx-auto px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-camp-800">
            To-Do List
          </h2>
          {todos.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-camp-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCompletedTodos}
                onChange={() => setShowCompletedTodos(!showCompletedTodos)}
                className="h-4 w-4 rounded border-gray-300 text-camp-600 focus:ring-camp-500"
              />
              Show completed
            </label>
          )}
        </div>

        {/* Progress */}
        {todos.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-camp-500 mb-3">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-camp-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.round((todosCheckedCount / todos.length) * 100)}%` }}
              />
            </div>
            <span>{todosCheckedCount}/{todos.length}</span>
          </div>
        )}

        {/* Todo items */}
        <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
          {filteredTodos.length === 0 && todos.length > 0 && !showCompletedTodos && (
            <p className="px-4 py-3 text-sm text-camp-500">All items completed!</p>
          )}
          {filteredTodos.map((todo) => (
            <div
              key={todo.id}
              className={`flex items-center gap-3 px-4 py-3 transition ${todo.checked ? 'bg-gray-50' : ''}`}
            >
              <input
                type="checkbox"
                checked={todo.checked}
                onChange={() => {
                  if (!tripId) return
                  updateTodo.mutate({
                    id: todo.id,
                    tripId,
                    data: {
                      checked: !todo.checked,
                      checked_by: !todo.checked ? (user?.name || '') : '',
                    },
                  })
                }}
                className="h-5 w-5 rounded border-gray-300 text-camp-600 focus:ring-camp-500"
              />
              <span className={`flex-1 text-sm ${todo.checked ? 'line-through text-gray-400' : 'text-camp-900'}`}>
                {todo.title}
              </span>
              {todo.checked && todo.checked_by && (
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {todo.checked_by}
                </span>
              )}
              <button
                onClick={() => {
                  if (!tripId) return
                  deleteTodo.mutate({ id: todo.id, tripId })
                }}
                className="shrink-0 p-1 text-camp-400 hover:text-red-500 transition"
                aria-label={`Delete ${todo.title}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Add todo form */}
        <div className="flex items-center gap-2 mt-3">
          <input
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const title = newTodoTitle.trim()
                if (!title || !tripId) return
                createTodo.mutate({ trip_id: tripId, title, checked: false })
                setNewTodoTitle('')
              }
            }}
            placeholder="Add a to-do item..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
          />
          <button
            onClick={() => {
              const title = newTodoTitle.trim()
              if (!title || !tripId) return
              createTodo.mutate({ trip_id: tripId, title, checked: false })
              setNewTodoTitle('')
            }}
            disabled={!newTodoTitle.trim() || createTodo.isPending}
            className="px-4 py-2 text-sm bg-camp-600 hover:bg-camp-700 disabled:bg-camp-400 text-white rounded-lg transition font-medium"
          >
            Add
          </button>
        </div>
      </section>

      {/* Recipe Picker Modal */}
      {pickerSlot && (
        <RecipePicker
          recipes={recipesList}
          onSelect={handleAddMeal}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  )
}
