import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  useTrip,
  useCreateTrip,
  useUpdateTrip,
} from '../hooks/useQueries'

export default function TripForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: existingTrip, isLoading: tripLoading } = useTrip(
    isEdit ? id : undefined,
  )
  const createTrip = useCreateTrip()
  const updateTrip = useUpdateTrip()

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [guestCount, setGuestCount] = useState(1)
  const [people, setPeople] = useState<string[]>([])
  const [newPersonName, setNewPersonName] = useState('')
  const [error, setError] = useState('')

  // Pre-populate for edit mode
  useEffect(() => {
    if (isEdit && existingTrip) {
      setName(existingTrip.name || '')
      setStartDate(existingTrip.start_date || '')
      setEndDate(existingTrip.end_date || '')
      setGuestCount(existingTrip.guest_count || 1)
      setPeople(existingTrip.people ?? [])
    }
  }, [isEdit, existingTrip])

  const isSaving = createTrip.isPending || updateTrip.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Trip name is required.')
      return
    }
    if (!startDate) {
      setError('Start date is required.')
      return
    }
    if (!endDate) {
      setError('End date is required.')
      return
    }
    if (endDate < startDate) {
      setError('End date must be on or after the start date.')
      return
    }
    if (guestCount < 1) {
      setError('Guest count must be at least 1.')
      return
    }

    try {
      if (isEdit && id) {
        await updateTrip.mutateAsync({
          id,
          data: {
            name: name.trim(),
            start_date: startDate,
            end_date: endDate,
            guest_count: guestCount,
            people,
          },
        })
        navigate(`/trips/${id}`)
      } else {
        const members = user ? [user.id] : []
        const created = await createTrip.mutateAsync({
          name: name.trim(),
          start_date: startDate,
          end_date: endDate,
          guest_count: guestCount,
          members,
          people,
        })
        navigate(`/trips/${(created as any).id}`)
      }
    } catch (err) {
      const pbErr = err as { message?: string }
      setError(pbErr.message || 'Failed to save trip. Please try again.')
    }
  }

  if (isEdit && tripLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-camp-600" />
      </div>
    )
  }

  return (
    <div className="">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(isEdit ? `/trips/${id}` : '/trips')}
            className="text-camp-600 hover:text-camp-800 transition"
            aria-label="Go back"
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
          <h1 className="text-2xl font-bold text-camp-900">
            {isEdit ? 'Edit Trip' : 'New Trip'}
          </h1>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Trip name */}
            <div>
              <label
                htmlFor="tripName"
                className="block text-sm font-medium text-camp-900 mb-1"
              >
                Trip Name
              </label>
              <input
                id="tripName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Memorial Day at Yosemite"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
              />
            </div>

            {/* Start date */}
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-camp-900 mb-1"
              >
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
              />
            </div>

            {/* End date */}
            <div>
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-camp-900 mb-1"
              >
                End Date
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                min={startDate || undefined}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
              />
            </div>

            {/* Guest count */}
            <div>
              <label
                htmlFor="guestCount"
                className="block text-sm font-medium text-camp-900 mb-1"
              >
                Guest Count
              </label>
              <input
                id="guestCount"
                type="number"
                value={guestCount}
                onChange={(e) =>
                  setGuestCount(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                min={1}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
              />
            </div>

            {/* People */}
            <div>
              <label className="block text-sm font-medium text-camp-900 mb-1">
                People
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {people.map((person) => (
                  <span
                    key={person}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-camp-100 text-camp-700 rounded-full text-sm"
                  >
                    {person}
                    <button
                      type="button"
                      onClick={() => setPeople(people.filter((p) => p !== person))}
                      className="text-camp-400 hover:text-red-500 transition"
                      aria-label={`Remove ${person}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const n = newPersonName.trim()
                      if (n && !people.includes(n)) {
                        setPeople([...people, n])
                        setNewPersonName('')
                      }
                    }
                  }}
                  placeholder="Add a person..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => {
                    const n = newPersonName.trim()
                    if (n && !people.includes(n)) {
                      setPeople([...people, n])
                      setNewPersonName('')
                    }
                  }}
                  disabled={!newPersonName.trim()}
                  className="px-4 py-2 bg-camp-100 hover:bg-camp-200 disabled:bg-gray-100 text-camp-700 font-medium rounded-lg transition"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-accent-600 hover:bg-accent-700 disabled:bg-accent-400 text-white font-medium rounded-lg transition"
              >
                {isSaving
                  ? 'Saving...'
                  : isEdit
                    ? 'Save Changes'
                    : 'Create Trip'}
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(isEdit ? `/trips/${id}` : '/trips')
                }
                className="px-4 py-2 bg-white hover:bg-gray-50 text-camp-700 border border-gray-300 font-medium rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
