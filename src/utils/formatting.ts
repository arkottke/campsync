/**
 * Format a number with commas for thousands separators
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat().format(value)
}

/**
 * Format a date in a user-friendly way
 */
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

/**
 * Format a date with time
 */
export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

/**
 * Get days between two dates
 */
export const getDaysBetween = (startDate: string | Date, endDate: string | Date): number => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Truncate text to a maximum length
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Capitalize first letter
 */
export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Parse error message from various error types
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as any).message)
  }
  return 'An unknown error occurred'
}

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }

    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Parse quantity string (e.g., "1 1/2" -> 1.5)
 */
export const parseQuantity = (quantityStr: string): number => {
  const trimmed = quantityStr.trim()

  // Check if it's a fraction like "1/2"
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/)
  if (fractionMatch) {
    return parseFloat(fractionMatch[1]) / parseFloat(fractionMatch[2])
  }

  // Check if it's a mixed number like "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1])
    const numerator = parseFloat(mixedMatch[2])
    const denominator = parseFloat(mixedMatch[3])
    return whole + numerator / denominator
  }

  // Otherwise, just parse as a decimal
  return parseFloat(trimmed)
}
