import { Link } from 'react-router-dom'
import { useTrips } from '../hooks/useQueries'

export default function Dashboard() {
  const { data: trips } = useTrips()
  const upcomingTrips = (trips || []).filter(
    (t: { end_date: string }) => t.end_date >= new Date().toISOString().split('T')[0]
  )

  return (
    <div className="px-4 py-6">
      <h2 className="text-2xl font-bold text-camp-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link to="/recipes" className="bg-white rounded-xl shadow-sm border border-camp-100 p-5 hover:shadow-md transition group">
          <div className="text-3xl mb-2">📖</div>
          <h3 className="text-lg font-bold text-camp-900 mb-1">Recipe Vault</h3>
          <p className="text-sm text-camp-600">Manage your camping meals</p>
          <span className="text-accent-600 text-sm font-medium mt-2 inline-block group-hover:translate-x-1 transition-transform">Browse →</span>
        </Link>

        <Link to="/vault" className="bg-white rounded-xl shadow-sm border border-camp-100 p-5 hover:shadow-md transition group">
          <div className="text-3xl mb-2">🎒</div>
          <h3 className="text-lg font-bold text-camp-900 mb-1">Gear Vault</h3>
          <p className="text-sm text-camp-600">Manage your gear templates</p>
          <span className="text-accent-600 text-sm font-medium mt-2 inline-block group-hover:translate-x-1 transition-transform">Browse →</span>
        </Link>

        <Link to="/trips" className="bg-white rounded-xl shadow-sm border border-camp-100 p-5 hover:shadow-md transition group">
          <div className="text-3xl mb-2">🗓️</div>
          <h3 className="text-lg font-bold text-camp-900 mb-1">Trip Planner</h3>
          <p className="text-sm text-camp-600">Plan trips and assign meals</p>
          <span className="text-accent-600 text-sm font-medium mt-2 inline-block group-hover:translate-x-1 transition-transform">View Trips →</span>
        </Link>

        <Link to="/trips" className="bg-white rounded-xl shadow-sm border border-camp-100 p-5 hover:shadow-md transition group">
          <div className="text-3xl mb-2">✅</div>
          <h3 className="text-lg font-bold text-camp-900 mb-1">Checklists</h3>
          <p className="text-sm text-camp-600">Shopping & packing lists</p>
          <span className="text-accent-600 text-sm font-medium mt-2 inline-block group-hover:translate-x-1 transition-transform">Select Trip →</span>
        </Link>
      </div>

      {/* Upcoming trips */}
      {upcomingTrips.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-camp-900 mb-3">Upcoming Trips</h3>
          <div className="space-y-3">
            {upcomingTrips.slice(0, 3).map((trip: { id: string; name: string; start_date: string; end_date: string; guest_count?: number }) => (
              <Link
                key={trip.id}
                to={`/trips/${trip.id}`}
                className="block bg-white rounded-xl shadow-sm border border-camp-100 p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-camp-900">{trip.name}</h4>
                    <p className="text-sm text-camp-500">
                      {new Date(trip.start_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      {' - '}
                      {new Date(trip.end_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-camp-400">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
