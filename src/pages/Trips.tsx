import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrips, useCopyTrip, useDeleteTrip } from '../hooks/useQueries'
import { useAuth } from '../context/AuthContext'
import { Trip } from '../types'

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start + 'T00:00:00')
  const endDate = new Date(end + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startStr = startDate.toLocaleDateString(undefined, opts)
  const endStr = endDate.toLocaleDateString(undefined, {
    ...opts,
    year: 'numeric',
  })
  return `${startStr} - ${endStr}`
}

function countDays(start: string, end: string): number {
  const ms =
    new Date(end + 'T00:00:00').getTime() -
    new Date(start + 'T00:00:00').getTime()
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1)
}

function TripCard({ trip }: { trip: Trip }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const copyMutation = useCopyTrip()
  const deleteMutation = useDeleteTrip()
  const days = countDays(trip.start_date, trip.end_date)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleCopy = () => {
    setMenuOpen(false)
    if (!user) return
    copyMutation.mutate(
      { sourceTripId: trip.id, userId: user.id },
      { onSuccess: (newTrip) => navigate(`/trips/${(newTrip as Trip).id}/edit`) },
    )
  }

  const handleDelete = () => {
    deleteMutation.mutate(trip.id)
  }

  return (
    <div className="relative group">
      {/* Main card */}
      <button
        type="button"
        onClick={() => navigate(`/trips/${trip.id}`)}
        className="w-full text-left bg-white rounded-lg shadow hover:shadow-md transition p-5 pr-12"
      >
        <h3 className="text-lg font-bold text-camp-900 truncate">{trip.name}</h3>
        <p className="text-sm text-camp-600 mt-1">
          {formatDateRange(trip.start_date, trip.end_date)}
        </p>
        <div className="flex items-center gap-4 mt-3 text-sm text-camp-700">
          <span className="flex items-center gap-1">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {days} day{days !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {trip.guest_count} guest{trip.guest_count !== 1 ? 's' : ''}
          </span>
        </div>
      </button>

      {/* Kebab menu */}
      <div ref={menuRef} className="absolute top-3 right-3 z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((v) => !v)
          }}
          className="p-1.5 rounded-md text-camp-400 opacity-0 group-hover:opacity-100 hover:bg-camp-100 hover:text-camp-700 transition-opacity"
          aria-label="Trip options"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px] z-20">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                navigate(`/trips/${trip.id}/edit`)
              }}
              className="w-full text-left px-4 py-2 text-sm text-camp-800 hover:bg-camp-50 transition"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={copyMutation.isPending}
              className="w-full text-left px-4 py-2 text-sm text-camp-800 hover:bg-camp-50 transition disabled:opacity-50"
            >
              {copyMutation.isPending ? 'Copying…' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setDeleteConfirm(true)
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation overlay */}
      {deleteConfirm && (
        <div className="absolute inset-0 bg-red-50 border border-red-200 rounded-lg p-4 z-10 flex flex-col justify-center">
          <p className="text-red-800 font-medium text-sm">
            Delete &ldquo;{trip.name}&rdquo;? This cannot be undone.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition font-medium"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Yes, Delete'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirm(false)}
              className="px-3 py-1.5 text-sm bg-white hover:bg-gray-50 text-camp-700 border border-gray-300 rounded-lg transition font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Trips() {
  const navigate = useNavigate()
  const { data: trips, isLoading, error } = useTrips()

  const today = new Date().toISOString().split('T')[0]

  const tripList: Trip[] = trips ?? []

  const upcoming = tripList.filter((t) => t.end_date >= today)
  const past = tripList.filter((t) => t.end_date < today)

  return (
    <div className="">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 text-camp-600 hover:text-camp-800 font-medium transition"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Dashboard
            </button>
            <h1 className="text-2xl font-bold text-camp-900">Trips</h1>
          </div>
          <button
            onClick={() => navigate('/trips/new')}
            className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-lg transition"
          >
            Create Trip
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-camp-600" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            Failed to load trips. Please try again.
          </div>
        )}

        {!isLoading && !error && tripList.length === 0 && (
          <div className="text-center py-16">
            <svg
              className="mx-auto h-16 w-16 text-camp-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-camp-800">
              No trips yet
            </h2>
            <p className="mt-2 text-camp-600">
              Create your first camping trip to get started.
            </p>
            <button
              onClick={() => navigate('/trips/new')}
              className="mt-6 px-6 py-2 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-lg transition"
            >
              Create Trip
            </button>
          </div>
        )}

        {!isLoading && upcoming.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-camp-800 mb-3">
              Upcoming
            </h2>
            <div className="space-y-3">
              {upcoming.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          </section>
        )}

        {!isLoading && past.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-camp-500 mb-3">Past</h2>
            <div className="space-y-3 opacity-75">
              {past.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
