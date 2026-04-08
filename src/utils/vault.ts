import { TripVaultItem } from '../types'

/** Calculate the display quantity for a trip vault item based on trip duration. */
export function computeDisplayQuantity(item: TripVaultItem, tripDays: number): number {
  if (item.quantity_type === 'per_day') {
    return Math.ceil(item.quantity * tripDays)
  }
  return item.quantity
}

/** Count trip days from start_date and end_date strings (YYYY-MM-DD), inclusive. */
export function countTripDays(startDate: string, endDate: string): number {
  const ms = new Date(endDate + 'T00:00:00').getTime() - new Date(startDate + 'T00:00:00').getTime()
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1)
}
