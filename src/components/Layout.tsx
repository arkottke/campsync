import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import KeyboardHelpModal from './KeyboardHelpModal'

const navItems = [
  { path: '/dashboard', label: 'Home', icon: HomeIcon },
  { path: '/recipes', label: 'Recipes', icon: BookIcon },
  { path: '/vault', label: 'Gear', icon: GearIcon },
  { path: '/trips', label: 'Trips', icon: CalendarIcon },
]

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function BookIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function GearIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { user, logout } = useAuth()

  // Don't show layout on login/register
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'
  if (isAuthPage) return <>{children}</>

  return (
    <div className="min-h-screen bg-camp-50 pb-16">
      {/* Top header */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link to="/dashboard" className="text-xl font-bold text-camp-800">
            CampSync
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-camp-600 hidden sm:inline">{user?.name || user?.email}</span>
            {user?.is_admin && (
              <Link
                to="/admin"
                className="text-sm px-3 py-1.5 text-camp-600 hover:text-camp-800 hover:bg-camp-100 rounded-lg transition"
              >
                Admin
              </Link>
            )}
            <button
              onClick={logout}
              className="text-sm px-3 py-1.5 text-camp-600 hover:text-camp-800 hover:bg-camp-100 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-4xl mx-auto">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-20 safe-area-bottom">
        <div className="max-w-4xl mx-auto flex justify-around">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path || location.pathname.startsWith(path + '/')
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center py-2 px-4 text-xs font-medium transition ${
                  active ? 'text-camp-600' : 'text-gray-400 hover:text-camp-500'
                }`}
              >
                <Icon active={active} />
                <span className="mt-0.5">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <KeyboardHelpModal />
    </div>
  )
}
