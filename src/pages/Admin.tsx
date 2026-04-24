import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { PocketBaseService } from '../services/pocketbase'
import { useToast } from '../components/Toast'
import { User } from '../types'

interface UserForm {
  email: string
  password: string
  name: string
  is_admin: boolean
}

const emptyForm: UserForm = { email: '', password: '', name: '', is_admin: false }

export default function Admin() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin-users'],
    queryFn: () => PocketBaseService.listUsers(),
    enabled: !!currentUser?.is_admin,
  })

  const createMutation = useMutation({
    mutationFn: () => PocketBaseService.createUser(form.email, form.password, form.name, form.is_admin),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setForm(emptyForm)
      setShowForm(false)
      toast('User created')
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message || 'Failed to create user'
      toast(msg, 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => PocketBaseService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setConfirmDelete(null)
      toast('User deleted')
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message || 'Failed to delete user'
      toast(msg, 'error')
    },
  })

  if (!currentUser?.is_admin) {
    return (
      <div className="p-4 max-w-4xl mx-auto pt-8">
        <p className="text-red-600 font-medium">Access denied. Admin privileges required.</p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 pt-4">
        <h1 className="text-2xl font-bold text-camp-900">User Management</h1>
        <button
          onClick={() => { setShowForm(!showForm); setForm(emptyForm) }}
          className="px-4 py-2 bg-camp-600 text-white rounded-lg hover:bg-camp-700 text-sm font-medium transition"
        >
          {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <h2 className="text-lg font-semibold text-camp-900 mb-4">New User</h2>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-camp-900 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                  placeholder="Display name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-camp-900 mb-1">Email <span className="text-camp-400 text-xs">(optional)</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-camp-900 mb-1">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div className="flex items-center gap-2 sm:pt-7">
                <input
                  type="checkbox"
                  id="is_admin"
                  checked={form.is_admin}
                  onChange={(e) => setForm(f => ({ ...f, is_admin: e.target.checked }))}
                  className="w-4 h-4 text-camp-600 rounded"
                />
                <label htmlFor="is_admin" className="text-sm font-medium text-camp-900">Admin privileges</label>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-camp-600 text-white rounded-lg hover:bg-camp-700 disabled:bg-camp-400 text-sm font-medium transition"
              >
                {createMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-camp-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-camp-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-camp-700 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-camp-700 font-medium">Username</th>
                <th className="text-left px-4 py-3 text-camp-700 font-medium">Role</th>
                <th className="text-right px-4 py-3 text-camp-700 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-camp-900 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-camp-700">{u.username || u.email}</td>
                  <td className="px-4 py-3">
                    {u.is_admin ? (
                      <span className="px-2 py-0.5 bg-camp-100 text-camp-700 rounded text-xs font-medium">Admin</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">User</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== currentUser?.id && (
                      confirmDelete === u.id ? (
                        <span className="inline-flex gap-2 justify-end">
                          <button
                            onClick={() => deleteMutation.mutate(u.id)}
                            disabled={deleteMutation.isPending}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-3 py-1 border border-gray-300 text-camp-700 rounded text-xs hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(u.id)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-xs transition"
                        >
                          Delete
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
