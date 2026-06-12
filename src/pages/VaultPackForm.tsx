import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useVaultPacks, useCreateVaultPack, useUpdateVaultPack } from '../hooks/useQueries'
import { VaultPack, PackCategory } from '../types'

export default function VaultPackForm() {
  const { packId } = useParams<{ packId: string }>()
  const isEdit = !!packId
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data } = useVaultPacks(user?.id)
  const createVaultPack = useCreateVaultPack()
  const updateVaultPack = useUpdateVaultPack()

  const existingPack = isEdit
    ? ((data as unknown as VaultPack[]) ?? []).find((p) => p.id === packId)
    : undefined

  const [name, setName] = useState('')
  const [category, setCategory] = useState<PackCategory>('gear')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit && existingPack) {
      setName(existingPack.name)
      setCategory(existingPack.category || 'gear')
    }
  }, [isEdit, existingPack])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Pack name is required.')
      return
    }

    setError('')
    setSaving(true)

    try {
      if (isEdit && packId) {
        await updateVaultPack.mutateAsync({ id: packId, data: { name: name.trim(), category } })
        navigate(`/vault/packs/${packId}`)
      } else {
        const result = await createVaultPack.mutateAsync({
          name: name.trim(),
          category,
          owner_id: user?.id,
        })
        navigate(`/vault/packs/${result.id}`)
      }
    } catch (err) {
      const msg = (err as { message?: string })?.message || 'Failed to save pack.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-camp-50">
      <header className="bg-white shadow">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(isEdit ? `/vault/packs/${packId}` : '/vault')}
            className="flex items-center gap-1 text-camp-600 hover:text-camp-800 font-medium transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {isEdit ? 'Pack' : 'Gear Vault'}
          </button>
          <h1 className="text-2xl font-bold text-camp-900">
            {isEdit ? 'Edit Pack' : 'New Gear Pack'}
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <label htmlFor="pack-name" className="block text-sm font-medium text-camp-900 mb-1">
              Pack Name <span className="text-red-500">*</span>
            </label>
            <input
              id="pack-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="e.g. Summer Pack, Cold Weather Pack"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent"
            />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <label htmlFor="pack-category" className="block text-sm font-medium text-camp-900 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="pack-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as PackCategory)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-camp-500 focus:border-transparent bg-white"
            >
              <option value="gear">Gear</option>
              <option value="clothing">Clothing</option>
              <option value="kids">Kids</option>
              <option value="pantry">Pantry</option>
            </select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(isEdit ? `/vault/packs/${packId}` : '/vault')}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-camp-700 font-medium rounded-lg transition text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-accent-600 hover:bg-accent-700 disabled:bg-accent-400 text-white font-medium rounded-lg transition"
            >
              {saving ? 'Saving...' : isEdit ? 'Update Pack' : 'Create Pack'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
