import PocketBase from 'pocketbase'
import { User, Recipe, Trip, TripMeal, ChecklistItem, Supply, TripVaultItem, VaultPack, VaultPackItem, TripItemListType } from '../types'

const pb = new PocketBase(import.meta.env.VITE_PB_URL || 'http://localhost:8090')

// Disable auto-cancellation to prevent duplicate request issues
pb.autoCancellation(false)

/** Strip PocketBase datetime to YYYY-MM-DD */
function toDateOnly(v: string): string {
  if (!v) return v
  return v.split('T')[0].split(' ')[0]
}

function uniquePeople(names: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of names) {
    const name = String(raw || '').trim()
    if (!name) continue
    if (seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

export class PocketBaseService {
  // Auth methods
  static async login(email: string, password: string) {
    return await pb.collection('users').authWithPassword(email, password)
  }

  static async register(
    email: string,
    password: string,
    passwordConfirm: string,
    name: string
  ) {
    const userData = {
      email,
      password,
      passwordConfirm,
      name,
    }
    try {
      return await pb.collection('users').create(userData)
    } catch (err: unknown) {
      console.error('PocketBase register error details:', JSON.stringify(err))
      throw err
    }
  }

  static async logout() {
    pb.authStore.clear()
  }

  static isAuthenticated(): boolean {
    return pb.authStore.isValid
  }

  static getCurrentUser(): User | null {
    const model = pb.authStore.record
    if (!model) return null
    return {
      id: model.id,
      email: model.email || '',
      name: model.name || model.email || '',
      is_admin: model.is_admin || false,
      avatar: model.avatar,
      created: model.created,
      updated: model.updated,
    }
  }

  static getAuthToken(): string {
    return pb.authStore.token
  }

  // User methods
  static async updateProfile(userId: string, data: Partial<User>) {
    return await pb.collection('users').update(userId, data)
  }

  static async getUser(userId: string) {
    return await pb.collection('users').getOne(userId)
  }

  // Admin user management
  static async listUsers(): Promise<User[]> {
    const records = await pb.collection('users').getFullList({ sort: 'name' })
    return records.map(r => ({
      id: r.id,
      email: r.email || '',
      name: r.name || r.email || '',
      is_admin: r.is_admin || false,
      avatar: r.avatar,
      created: r.created,
      updated: r.updated,
    }))
  }

  static async createUser(email: string, password: string, name: string, isAdmin = false) {
    return await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      name,
      is_admin: isAdmin,
    })
  }

  static async deleteUser(id: string) {
    return await pb.collection('users').delete(id)
  }

  // Recipe methods
  static async createRecipe(recipe: Partial<Recipe>) {
    return await pb.collection('recipes').create(recipe)
  }

  static async getRecipe(id: string) {
    const recipe = await pb.collection('recipes').getOne(id)
    const ingredients = await pb.collection('ingredients').getFullList({
      filter: `recipe_id='${id}'`,
    })
    return { ...recipe, ingredients }
  }

  static async listRecipes(page = 1, perPage = 50) {
    return await pb.collection('recipes').getList(page, perPage, {
      sort: 'name',
    })
  }

  static async getAllRecipes() {
    return await pb.collection('recipes').getFullList({ sort: 'name' })
  }

  static async updateRecipe(id: string, data: Partial<Recipe>) {
    return await pb.collection('recipes').update(id, data)
  }

  static async deleteRecipe(id: string) {
    return await pb.collection('recipes').delete(id)
  }

  // Ingredient methods
  static async createIngredient(ingredient: Record<string, unknown>) {
    try {
      return await pb.collection('ingredients').create(ingredient)
    } catch (err: unknown) {
      console.error('createIngredient failed:', JSON.stringify(err), 'data:', ingredient)
      throw err
    }
  }

  static async getIngredients(recipeId: string) {
    return await pb.collection('ingredients').getFullList({
      filter: `recipe_id='${recipeId}'`,
    })
  }

  static async listAllIngredients() {
    return await pb.collection('ingredients').getFullList({
      fields: 'item_name,unit,storage_type',
    })
  }

  static async updateIngredient(id: string, data: Record<string, unknown>) {
    return await pb.collection('ingredients').update(id, data)
  }

  static async deleteIngredient(id: string) {
    return await pb.collection('ingredients').delete(id)
  }

  // Trip methods
  static async createTrip(trip: Partial<Trip>) {
    const people = Array.isArray((trip as any).people)
      ? uniquePeople((trip as any).people as string[])
      : []

    return await pb.collection('trips').create({
      ...trip,
      people,
    })
  }

  static async getTrip(id: string) {
    const trip = await pb.collection('trips').getOne(id)
    trip.start_date = toDateOnly(trip.start_date)
    trip.end_date = toDateOnly(trip.end_date)
    trip.people = uniquePeople(Array.isArray(trip.people) ? trip.people : [])

    return trip
  }

  static async listTrips() {
    const trips = await pb.collection('trips').getFullList({
      sort: '-start_date',
    })

    for (const t of trips) {
      t.start_date = toDateOnly(t.start_date)
      t.end_date = toDateOnly(t.end_date)
      t.people = uniquePeople(Array.isArray(t.people) ? t.people : [])
    }

    return trips
  }

  static async updateTrip(id: string, data: Partial<Trip>) {
    const hasPeople = Object.prototype.hasOwnProperty.call(data, 'people')
    const nextData: Partial<Trip> = hasPeople
      ? {
          ...data,
          people: uniquePeople(Array.isArray((data as any).people) ? ((data as any).people as string[]) : []),
        }
      : data

    return await pb.collection('trips').update(id, nextData)
  }

  static async deleteTrip(id: string) {
    return await pb.collection('trips').delete(id)
  }

  // Trip Meal methods
  static async addMealToTrip(meal: Partial<TripMeal>) {
    return await pb.collection('trip_meals').create(meal)
  }

  static async getTripMeals(tripId: string) {
    const meals = await pb.collection('trip_meals').getFullList({
      filter: `trip_id='${tripId}'`,
      expand: 'recipe_id',
    })
    for (const m of meals) {
      m.date = toDateOnly(m.date)
    }
    return meals
  }

  static async deleteMeal(id: string) {
    return await pb.collection('trip_meals').delete(id)
  }

  // Checklist methods
  static async createChecklistItem(item: Partial<ChecklistItem>) {
    try {
      return await pb.collection('checklist_items').create(item)
    } catch (err: unknown) {
      console.error('createChecklistItem failed:', JSON.stringify(err), 'data:', item)
      throw err
    }
  }

  static async getChecklistItems(tripId: string) {
    return await pb.collection('checklist_items').getFullList({
      filter: `trip_id='${tripId}'`,
      sort: 'storage_type,item_name',
    })
  }

  static async updateChecklistItem(id: string, data: Partial<ChecklistItem>) {
    return await pb.collection('checklist_items').update(id, data)
  }

  static async deleteChecklistItem(id: string) {
    return await pb.collection('checklist_items').delete(id)
  }

  // Supply methods
  static async createSupply(supply: Partial<Supply>) {
    return await pb.collection('supplies').create(supply)
  }

  static async getSupplies(tripId: string) {
    return await pb.collection('supplies').getFullList({
      filter: `trip_id='${tripId}'`,
      sort: 'category,name',
    })
  }

  static async updateSupply(id: string, data: Partial<Supply>) {
    return await pb.collection('supplies').update(id, data)
  }

  static async deleteSupply(id: string) {
    return await pb.collection('supplies').delete(id)
  }

  // Real-time subscription methods
  static subscribeToChecklist(tripId: string, callback: (data: unknown) => void) {
    return pb.collection('checklist_items').subscribe('*', (e) => {
      if (e.record.trip_id === tripId) {
        callback(e)
      }
    })
  }

  static subscribeToTrip(tripId: string, callback: (data: unknown) => void) {
    return pb.collection('trips').subscribe(tripId, callback)
  }

  static unsubscribe(subscription: string) {
    pb.collection('checklist_items').unsubscribe(subscription)
  }

  // Trip Vault Item methods
  static async createTripVaultItem(item: Partial<TripVaultItem>) {
    return await pb.collection('trip_vault_items').create(item)
  }

  static async getTripVaultItems(tripId: string, listType?: TripItemListType) {
    const items = await pb.collection('trip_vault_items').getFullList({
      filter: `trip_id='${tripId}'`,
      sort: 'name',
    })

    if (!listType) return items
    if (listType === 'pantry') {
      return items.filter((item) => item.list_type === 'pantry')
    }

    // Backward compatibility: older records may not have list_type set.
    return items.filter((item) => !item.list_type || item.list_type === 'gear')
  }

  static async updateTripVaultItem(id: string, data: Partial<TripVaultItem>) {
    return await pb.collection('trip_vault_items').update(id, data)
  }

  static async deleteTripVaultItem(id: string) {
    return await pb.collection('trip_vault_items').delete(id)
  }

  static subscribeToTripVaultItems(tripId: string, callback: (data: unknown) => void) {
    return pb.collection('trip_vault_items').subscribe('*', (e) => {
      if (e.record.trip_id === tripId) {
        callback(e)
      }
    })
  }

  // Vault Pack methods
  static async createVaultPack(pack: Partial<VaultPack>) {
    return await pb.collection('vault_packs').create(pack)
  }

  static async getVaultPacks(ownerId: string) {
    return await pb.collection('vault_packs').getFullList({
      filter: `owner_id='${ownerId}'`,
      sort: 'name',
    })
  }

  static async updateVaultPack(id: string, data: Partial<VaultPack>) {
    return await pb.collection('vault_packs').update(id, data)
  }

  static async deleteVaultPack(id: string) {
    return await pb.collection('vault_packs').delete(id)
  }

  // Vault Pack Item methods
  static async createVaultPackItem(item: Partial<VaultPackItem>) {
    return await pb.collection('vault_pack_items').create(item)
  }

  static async getVaultPackItems(packId: string) {
    return await pb.collection('vault_pack_items').getFullList({
      filter: `pack_id='${packId}'`,
      sort: 'name',
    })
  }

  static async getAllVaultPackItems(ownerId: string) {
    // Get all packs for this user, then all items across those packs
    const packs = await pb.collection('vault_packs').getFullList({
      filter: `owner_id='${ownerId}'`,
    })
    if (packs.length === 0) return []
    const packIds = packs.map((p) => `pack_id='${p.id}'`).join(' || ')
    return await pb.collection('vault_pack_items').getFullList({
      filter: packIds,
      sort: 'name',
    })
  }

  static async updateVaultPackItem(id: string, data: Partial<VaultPackItem>) {
    return await pb.collection('vault_pack_items').update(id, data)
  }

  static async deleteVaultPackItem(id: string) {
    return await pb.collection('vault_pack_items').delete(id)
  }

  static async copyPackToTrip(tripId: string, packId: string, personId?: string) {
    const pack = await pb.collection('vault_packs').getOne(packId)
    const listType: TripItemListType = pack.category === 'pantry' ? 'pantry' : 'gear'
    const items = await pb.collection('vault_pack_items').getFullList({
      filter: `pack_id='${packId}'`,
    })
    const results = []
    for (const item of items) {
      try {
        const tripItem = await pb.collection('trip_vault_items').create({
          trip_id: tripId,
          source_pack_id: packId,
          name: item.name,
          quantity: item.quantity,
          quantity_type: item.quantity_type,
          list_type: listType,
          checked: false,
          ...(listType === 'gear' && personId ? { person_id: personId } : {}),
        })
        results.push(tripItem)
      } catch (err: any) {
        const details = err?.response?.data ? ` ${JSON.stringify(err.response.data)}` : ''
        throw new Error(`Failed to import pack item "${item.name}".${details}`)
      }
    }
    return results
  }

  // Copy trip
  static async copyTrip(sourceTripId: string, userId: string) {
    const source = await PocketBaseService.getTrip(sourceTripId)

    // Create new trip with blank name/dates
    const newTrip = await pb.collection('trips').create({
      name: '',
      start_date: '',
      end_date: '',
      guest_count: source.guest_count,
      members: [userId],
      people: uniquePeople(Array.isArray(source.people) ? source.people : []),
    })

    // Copy meals (keep original dates)
    const meals = await PocketBaseService.getTripMeals(sourceTripId)
    for (const meal of meals) {
      await pb.collection('trip_meals').create({
        trip_id: newTrip.id,
        recipe_id: meal.recipe_id,
        date: meal.date,
        meal_slot: meal.meal_slot,
      })
    }

    // Copy vault items (reset checked)
    const vaultItems = await PocketBaseService.getTripVaultItems(sourceTripId)
    for (const item of vaultItems) {
      await pb.collection('trip_vault_items').create({
        trip_id: newTrip.id,
        source_pack_id: item.source_pack_id || '',
        name: item.name,
        quantity: item.quantity,
        quantity_type: item.quantity_type,
        list_type: item.list_type || 'gear',
        checked: false,
        ...(item.person_id ? { person_id: item.person_id } : {}),
      })
    }

    // Copy supplies (reset checked)
    const supplies = await PocketBaseService.getSupplies(sourceTripId)
    for (const supply of supplies) {
      await pb.collection('supplies').create({
        trip_id: newTrip.id,
        name: supply.name,
        category: supply.category,
        checked: false,
      })
    }

    return newTrip
  }
}

export default pb
