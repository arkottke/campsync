import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== passwordConfirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await register(email, password, passwordConfirm, name)
    } catch (err) {
      const pbErr = err as { response?: { data?: Record<string, { message: string }> }; message?: string }
      if (pbErr.response?.data) {
        const messages = Object.values(pbErr.response.data).map(v => v.message)
        setError(messages.join('. '))
      } else {
        setError(pbErr.message || 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-camp-50 to-camp-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-camp-900">CampSync</h1>
            <p className="text-camp-600 mt-2">Create Your Account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-camp-900 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-camp-900 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-camp-900 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                placeholder="Create a password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-camp-900 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                placeholder="Confirm password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-camp-600 hover:bg-camp-700 disabled:bg-camp-400 text-white font-medium py-2 rounded-lg transition"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <p className="text-center text-camp-600 text-sm mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-camp-600 hover:text-camp-700 font-medium">
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
