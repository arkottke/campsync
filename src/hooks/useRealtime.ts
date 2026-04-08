import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import pb from '../services/pocketbase'

/**
 * Subscribe to real-time updates for checklist items belonging to a trip.
 * Automatically invalidates the query cache when items change on other devices.
 */
export function useRealtimeChecklist(tripId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tripId) return

    const unsubscribe = pb.collection('checklist_items').subscribe('*', (e) => {
      if (e.record.trip_id === tripId) {
        queryClient.invalidateQueries({ queryKey: ['checklist', tripId] })
      }
    })

    return () => {
      unsubscribe.then((unsub) => {
        if (typeof unsub === 'function') unsub()
      }).catch(() => {
        pb.collection('checklist_items').unsubscribe('*')
      })
    }
  }, [tripId, queryClient])
}

/**
 * Subscribe to real-time updates for trip meals.
 */
export function useRealtimeTripMeals(tripId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tripId) return

    const unsubscribe = pb.collection('trip_meals').subscribe('*', (e) => {
      if (e.record.trip_id === tripId) {
        queryClient.invalidateQueries({ queryKey: ['tripMeals', tripId] })
      }
    })

    return () => {
      unsubscribe.then((unsub) => {
        if (typeof unsub === 'function') unsub()
      }).catch(() => {
        pb.collection('trip_meals').unsubscribe('*')
      })
    }
  }, [tripId, queryClient])
}

/**
 * Subscribe to real-time updates for supplies.
 */
export function useRealtimeSupplies(tripId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tripId) return

    const unsubscribe = pb.collection('supplies').subscribe('*', (e) => {
      if (e.record.trip_id === tripId) {
        queryClient.invalidateQueries({ queryKey: ['supplies', tripId] })
      }
    })

    return () => {
      unsubscribe.then((unsub) => {
        if (typeof unsub === 'function') unsub()
      }).catch(() => {
        pb.collection('supplies').unsubscribe('*')
      })
    }
  }, [tripId, queryClient])
}

/**
 * Subscribe to real-time updates for trip vault items.
 */
export function useRealtimeTripVaultItems(tripId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tripId) return

    const unsubscribe = pb.collection('trip_vault_items').subscribe('*', (e) => {
      if (e.record.trip_id === tripId) {
        queryClient.invalidateQueries({ queryKey: ['tripVaultItems', tripId] })
      }
    })

    return () => {
      unsubscribe.then((unsub) => {
        if (typeof unsub === 'function') unsub()
      }).catch(() => {
        pb.collection('trip_vault_items').unsubscribe('*')
      })
    }
  }, [tripId, queryClient])
}
