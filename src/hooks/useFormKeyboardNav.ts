import { RefObject, useEffect, useRef } from 'react'

interface GridConfig {
  totalRows: number
  colCount: number
  onAddRow: () => void
}

interface UseFormKeyboardNavOptions {
  formRef: RefObject<HTMLFormElement | null>
  onSubmit: () => void
  grid?: GridConfig
}

export function useFormKeyboardNav({ formRef, onSubmit, grid }: UseFormKeyboardNavOptions) {
  const pendingFocusRef = useRef<{ row: number; col: number } | null>(null)

  // Focus the newly created row's first cell after React commits the new row
  useEffect(() => {
    if (!pendingFocusRef.current || !formRef.current) return
    const { row, col } = pendingFocusRef.current
    const el = formRef.current.querySelector<HTMLElement>(
      `[data-cell-row="${row}"][data-cell-col="${col}"]`,
    )
    if (el) {
      el.focus()
      pendingFocusRef.current = null
    }
  }, [grid?.totalRows, formRef])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (!formRef.current?.contains(target)) return

      // Ctrl+Enter or Cmd+Enter: submit form
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        onSubmit()
        return
      }

      // Tab grid navigation (only when grid config provided)
      if (grid && e.key === 'Tab' && !e.shiftKey) {
        const rowAttr = target.getAttribute('data-cell-row')
        const colAttr = target.getAttribute('data-cell-col')
        if (rowAttr === null || colAttr === null) return

        const row = parseInt(rowAttr, 10)
        const col = parseInt(colAttr, 10)

        // Only intercept on last column of last row
        if (col === grid.colCount - 1 && row === grid.totalRows - 1) {
          e.preventDefault()
          pendingFocusRef.current = { row: row + 1, col: 0 }
          grid.onAddRow()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [formRef, onSubmit, grid])
}
