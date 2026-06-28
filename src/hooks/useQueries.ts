import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PocketBaseService } from '../services/pocketbase'
import { Ingredient, Recipe, Trip, ChecklistItem, Supply, TripVaultItem, VaultPack, VaultPackItem, TripItemListType, TripTodo } from '../types'

// Recipe hooks
export const useRecipes = () => {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: () => PocketBaseService.listRecipes(),
  })
}

export const useRecipe = (id: string | undefined) => {
  return useQuery({
    queryKey: ['recipes', id],
    queryFn: () => PocketBaseService.getRecipe(id!),
    enabled: !!id,
  })
}

export const useCreateRecipe = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (recipe: Partial<Recipe>) => PocketBaseService.createRecipe(recipe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export const useUpdateRecipe = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Recipe> }) =>
      PocketBaseService.updateRecipe(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipes', variables.id] })
    },
  })
}

export const useDeleteRecipe = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => PocketBaseService.deleteRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export const useAllIngredients = () => {
  return useQuery({
    queryKey: ['allIngredients'],
    queryFn: () => PocketBaseService.listAllIngredients(),
    staleTime: 60_000,
  })
}

export const useAllIngredientsAdmin = () => {
  return useQuery({
    queryKey: ['allIngredientsAdmin'],
    queryFn: () => PocketBaseService.listAllIngredientsAdmin() as Promise<Ingredient[]>,
    staleTime: 30_000,
  })
}

export const useBulkUpdateIngredients = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (updates: Array<{ id: string; data: Record<string, unknown> }>) =>
      Promise.all(updates.map(({ id, data }) => PocketBaseService.updateIngredient(id, data))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allIngredientsAdmin'] })
      queryClient.invalidateQueries({ queryKey: ['allIngredients'] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

// Trip hooks
export const useTrips = () => {
  return useQuery({
    queryKey: ['trips'],
    queryFn: () => PocketBaseService.listTrips(),
  })
}

export const useTrip = (id: string | undefined) => {
  return useQuery({
    queryKey: ['trips', id],
    queryFn: () => PocketBaseService.getTrip(id!),
    enabled: !!id,
  })
}

export const useCreateTrip = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (trip: Partial<Trip>) => PocketBaseService.createTrip(trip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

export const useUpdateTrip = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Trip> }) =>
      PocketBaseService.updateTrip(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
      queryClient.invalidateQueries({ queryKey: ['trips', variables.id] })
    },
  })
}

export const useDeleteTrip = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => PocketBaseService.deleteTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

// Checklist hooks
export const useChecklistItems = (tripId: string | undefined) => {
  return useQuery({
    queryKey: ['checklist', tripId],
    queryFn: () => PocketBaseService.getChecklistItems(tripId!),
    enabled: !!tripId,
  })
}

export const useCreateChecklistItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (item: Partial<ChecklistItem>) =>
      PocketBaseService.createChecklistItem(item),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', variables.trip_id] })
    },
  })
}

export const useUpdateChecklistItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data, tripId }: { id: string; data: Partial<ChecklistItem>; tripId: string }) =>
      PocketBaseService.updateChecklistItem(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['checklist', variables.tripId] })
    },
  })
}

export const useDeleteChecklistItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => PocketBaseService.deleteChecklistItem(id),
    onSuccess: () => {
      // The trip ID should be passed separately if needed
      queryClient.invalidateQueries({ queryKey: ['checklist'] })
    },
  })
}

// Supply hooks
export const useSupplies = (tripId: string | undefined) => {
  return useQuery({
    queryKey: ['supplies', tripId],
    queryFn: () => PocketBaseService.getSupplies(tripId!),
    enabled: !!tripId,
  })
}

export const useCreateSupply = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (supply: Partial<Supply>) => PocketBaseService.createSupply(supply),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplies', variables.trip_id] })
    },
  })
}

export const useUpdateSupply = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data, tripId }: { id: string; data: Partial<Supply>; tripId: string }) =>
      PocketBaseService.updateSupply(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplies', variables.tripId] })
    },
  })
}

export const useDeleteSupply = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => PocketBaseService.deleteSupply(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] })
    },
  })
}

// Trip Vault Item hooks
export const useTripVaultItems = (tripId: string | undefined, listType?: TripItemListType) => {
  return useQuery({
    queryKey: ['tripVaultItems', tripId, listType ?? 'all'],
    queryFn: () => PocketBaseService.getTripVaultItems(tripId!, listType),
    enabled: !!tripId,
  })
}

export const useCreateTripVaultItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (item: Partial<TripVaultItem>) => PocketBaseService.createTripVaultItem(item),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tripVaultItems', variables.trip_id] })
    },
  })
}

export const useUpdateTripVaultItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TripVaultItem> }) =>
      PocketBaseService.updateTripVaultItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripVaultItems'] })
    },
  })
}

export const useDeleteTripVaultItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => PocketBaseService.deleteTripVaultItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripVaultItems'] })
    },
  })
}

// Vault Pack hooks
export const useVaultPacks = (ownerId: string | undefined) => {
  return useQuery({
    queryKey: ['vaultPacks', ownerId],
    queryFn: () => PocketBaseService.getVaultPacks(ownerId!),
    enabled: !!ownerId,
  })
}

export const useCreateVaultPack = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (pack: Partial<VaultPack>) => PocketBaseService.createVaultPack(pack),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultPacks'] })
    },
  })
}

export const useUpdateVaultPack = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VaultPack> }) =>
      PocketBaseService.updateVaultPack(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultPacks'] })
    },
  })
}

export const useDeleteVaultPack = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => PocketBaseService.deleteVaultPack(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultPacks'] })
    },
  })
}

// Vault Pack Item hooks
export const useVaultPackItems = (packId: string | undefined) => {
  return useQuery({
    queryKey: ['vaultPackItems', packId],
    queryFn: () => PocketBaseService.getVaultPackItems(packId!),
    enabled: !!packId,
  })
}

export const useAllVaultPackItems = (ownerId: string | undefined) => {
  return useQuery({
    queryKey: ['allVaultPackItems', ownerId],
    queryFn: () => PocketBaseService.getAllVaultPackItems(ownerId!),
    enabled: !!ownerId,
  })
}

export const useCreateVaultPackItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (item: Partial<VaultPackItem>) => PocketBaseService.createVaultPackItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultPackItems'] })
      queryClient.invalidateQueries({ queryKey: ['allVaultPackItems'] })
    },
  })
}

export const useUpdateVaultPackItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VaultPackItem> }) =>
      PocketBaseService.updateVaultPackItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultPackItems'] })
      queryClient.invalidateQueries({ queryKey: ['allVaultPackItems'] })
    },
  })
}

export const useDeleteVaultPackItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => PocketBaseService.deleteVaultPackItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaultPackItems'] })
      queryClient.invalidateQueries({ queryKey: ['allVaultPackItems'] })
    },
  })
}

export const useCopyPackToTrip = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tripId, packId, personId }: { tripId: string; packId: string; personId?: string }) =>
      PocketBaseService.copyPackToTrip(tripId, packId, personId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tripVaultItems', variables.tripId] })
    },
  })
}

export const useCopyTrip = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sourceTripId, userId }: { sourceTripId: string; userId: string }) =>
      PocketBaseService.copyTrip(sourceTripId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}

// Trip Todo hooks
export const useTripTodos = (tripId: string | undefined) => {
  return useQuery({
    queryKey: ['tripTodos', tripId],
    queryFn: () => PocketBaseService.getTripTodos(tripId!),
    enabled: !!tripId,
  })
}

export const useCreateTripTodo = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (todo: Partial<TripTodo>) => PocketBaseService.createTripTodo(todo),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tripTodos', variables.trip_id] })
    },
  })
}

export const useUpdateTripTodo = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data, tripId }: { id: string; data: Partial<TripTodo>; tripId: string }) =>
      PocketBaseService.updateTripTodo(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tripTodos', variables.tripId] })
    },
  })
}

export const useDeleteTripTodo = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, tripId }: { id: string; tripId: string }) =>
      PocketBaseService.deleteTripTodo(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tripTodos', variables.tripId] })
    },
  })
}
