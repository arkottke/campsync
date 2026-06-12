import { useNavigate } from 'react-router-dom'
import { useTrips } from '../hooks/useQueries'
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

function TripCard({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  const days = countDays(trip.start_date, trip.end_date)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg shadow hover:shadow-md transition p-5"
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
        {trip.members && trip.members.length > 0 && (
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
              />
            </svg>
            {trip.members.length} member{trip.members.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  )
}

export default function Trips() {
  const navigate = useNavigate()
  const { data: trips, isLoading, error } = useTrips()

  const today = new Date().toISOString().split('T')[0]

  // The hook may return a PocketBase list or an array
  const tripList: Trip[] = Array.isArray(trips)
    ? trips
    : (trips as any)?.items ?? []

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
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                />
              ))}
            </div>
          </section>
        )}

        {!isLoading && past.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-camp-500 mb-3">Past</h2>
            <div className="space-y-3 opacity-75">
              {past.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
