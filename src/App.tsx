import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Recipes from './pages/Recipes'
import RecipeDetail from './pages/RecipeDetail'
import RecipeForm from './pages/RecipeForm'
import Vault from './pages/Vault'
import VaultPackForm from './pages/VaultPackForm'
import VaultPackDetail from './pages/VaultPackDetail'
import Trips from './pages/Trips'
import TripDetail from './pages/TripDetail'
import TripForm from './pages/TripForm'
import TripVault from './pages/TripVault'
import TripPantry from './pages/TripPantry'
import Checklist from './pages/Checklist'
import ProtectedRoute from './components/ProtectedRoute'
import Admin from './pages/Admin'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
})

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-camp-50">
          <div className="text-center">
            <p className="text-camp-700 mb-4">Something went wrong.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-camp-600 text-white rounded-lg hover:bg-camp-700"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function P({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-camp-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-camp-600 mx-auto" />
      </div>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={<Navigate to="/login" />} />
        <Route path="/dashboard" element={<P><Dashboard /></P>} />
        <Route path="/recipes" element={<P><Recipes /></P>} />
        <Route path="/recipes/new" element={<P><RecipeForm /></P>} />
        <Route path="/recipes/:id" element={<P><RecipeDetail /></P>} />
        <Route path="/recipes/:id/edit" element={<P><RecipeForm /></P>} />
        <Route path="/vault" element={<P><Vault /></P>} />
        <Route path="/vault/packs/new" element={<P><VaultPackForm /></P>} />
        <Route path="/vault/packs/:packId" element={<P><VaultPackDetail /></P>} />
        <Route path="/vault/packs/:packId/edit" element={<P><VaultPackForm /></P>} />
        <Route path="/trips" element={<P><Trips /></P>} />
        <Route path="/trips/new" element={<P><TripForm /></P>} />
        <Route path="/trips/:id" element={<P><TripDetail /></P>} />
        <Route path="/trips/:id/edit" element={<P><TripForm /></P>} />
        <Route path="/trips/:id/vault" element={<P><TripVault /></P>} />
        <Route path="/trips/:id/pantry" element={<P><TripPantry /></P>} />
        <Route path="/trips/:id/checklist" element={<P><Checklist /></P>} />
        <Route path="/admin" element={<P><Admin /></P>} />
        <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <Router>
              <AppRoutes />
            </Router>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
