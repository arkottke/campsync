import { useState, useEffect } from 'react'

const shortcuts = [
  { key: 'Tab', description: 'Move to next field (auto-creates row in recipe editor)' },
  { key: 'Ctrl+Enter', description: 'Submit form' },
  { key: '?', description: 'Show / hide this help' },
  { key: 'Esc', description: 'Close dialogs' },
]

export default function KeyboardHelpModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false)
        return
      }

      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement)?.isContentEditable) return

      if (e.key === '?') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setOpen(false)}
        role="presentation"
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-camp-900">Keyboard Shortcuts</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-camp-400 hover:text-camp-700 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-4 py-3 space-y-3">
          {shortcuts.map(({ key, description }) => (
            <div key={key} className="flex items-center gap-3">
              <kbd className="inline-flex items-center px-2 py-1 text-xs font-mono font-medium text-camp-700 bg-camp-100 border border-camp-200 rounded min-w-[4rem] justify-center">
                {key}
              </kbd>
              <span className="text-sm text-camp-600">{description}</span>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-camp-400 text-center">
            Press <kbd className="px-1 py-0.5 bg-camp-100 rounded text-camp-600 font-mono">?</kbd> anytime to toggle this help
          </p>
        </div>
      </div>
    </div>
  )
}
