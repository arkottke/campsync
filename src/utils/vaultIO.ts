import { VaultPack, VaultPackItem, PackCategory, QuantityType } from '../types'
import { PocketBaseService } from '../services/pocketbase'

interface ExportPackItem {
  name: string
  quantity: number
  quantity_type: QuantityType
}

export interface PackExportPayload {
  campsync_vault_pack: true
  name: string
  category: PackCategory
  items: ExportPackItem[]
}

export interface GearVaultExportPayload {
  campsync_gear_vault: true
  exported_at: string
  packs: {
    name: string
    category: PackCategory
    items: ExportPackItem[]
  }[]
}

export type VaultImportResult =
  | { kind: 'single'; payload: PackExportPayload }
  | { kind: 'vault'; payload: GearVaultExportPayload }

const VALID_CATEGORIES: PackCategory[] = ['gear', 'clothing', 'kids', 'pantry']
const VALID_QUANTITY_TYPES: QuantityType[] = ['per_day', 'total']

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Export a single vault pack as a JSON file download.
 */
export function exportPack(pack: VaultPack, items: VaultPackItem[]) {
  const payload: PackExportPayload = {
    campsync_vault_pack: true,
    name: pack.name,
    category: pack.category,
    items: items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      quantity_type: i.quantity_type,
    })),
  }
  downloadJSON(payload, `${slugify(pack.name) || 'pack'}.json`)
}

/**
 * Export all vault packs as a single JSON file download.
 */
export async function exportAllPacks(ownerId: string) {
  const packs = (await PocketBaseService.getVaultPacks(ownerId)) as unknown as VaultPack[]

  const packsWithItems = await Promise.all(
    packs.map(async (pack) => {
      const items = (await PocketBaseService.getVaultPackItems(pack.id)) as unknown as VaultPackItem[]
      return {
        name: pack.name,
        category: pack.category,
        items: items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          quantity_type: i.quantity_type,
        })),
      }
    }),
  )

  const payload: GearVaultExportPayload = {
    campsync_gear_vault: true,
    exported_at: new Date().toISOString(),
    packs: packsWithItems,
  }
  downloadJSON(payload, 'campsync-gear-vault.json')
}

function validatePackFields(obj: Record<string, unknown>, label: string) {
  if (typeof obj.name !== 'string' || !obj.name.trim()) {
    throw new Error(`Invalid ${label}: name is required.`)
  }
  if (!VALID_CATEGORIES.includes(obj.category as PackCategory)) {
    throw new Error(`Invalid ${label}: category must be one of ${VALID_CATEGORIES.join(', ')}.`)
  }
  if (!Array.isArray(obj.items)) {
    throw new Error(`Invalid ${label}: items must be an array.`)
  }
  for (let i = 0; i < obj.items.length; i++) {
    const item = obj.items[i] as Record<string, unknown>
    if (typeof item.name !== 'string' || !item.name.trim()) {
      throw new Error(`Invalid ${label} item #${i + 1}: name is required.`)
    }
    if (typeof item.quantity !== 'number' || item.quantity < 0) {
      throw new Error(`Invalid ${label} item #${i + 1}: quantity must be a non-negative number.`)
    }
    if (!VALID_QUANTITY_TYPES.includes(item.quantity_type as QuantityType)) {
      throw new Error(`Invalid ${label} item #${i + 1}: quantity_type must be one of ${VALID_QUANTITY_TYPES.join(', ')}.`)
    }
  }
}

/**
 * Validate imported JSON as a single vault pack.
 */
export function validatePackImport(data: unknown): PackExportPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file: not a JSON object.')
  }
  const obj = data as Record<string, unknown>
  if (obj.campsync_vault_pack !== true) {
    throw new Error('Invalid file: missing CampSync vault pack marker.')
  }
  validatePackFields(obj, 'pack')
  return data as PackExportPayload
}

/**
 * Validate imported JSON as a full gear vault export.
 */
export function validateGearVaultImport(data: unknown): GearVaultExportPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file: not a JSON object.')
  }
  const obj = data as Record<string, unknown>
  if (obj.campsync_gear_vault !== true) {
    throw new Error('Invalid file: missing CampSync gear vault marker.')
  }
  if (!Array.isArray(obj.packs)) {
    throw new Error('Invalid gear vault: packs must be an array.')
  }
  for (let i = 0; i < obj.packs.length; i++) {
    validatePackFields(obj.packs[i] as Record<string, unknown>, `pack #${i + 1}`)
  }
  return data as GearVaultExportPayload
}

/**
 * Auto-detect whether the imported JSON is a single pack or a full gear vault.
 */
export function detectAndValidateVaultImport(data: unknown): VaultImportResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid file: not a JSON object.')
  }
  const obj = data as Record<string, unknown>
  if (obj.campsync_vault_pack === true) {
    return { kind: 'single', payload: validatePackImport(data) }
  }
  if (obj.campsync_gear_vault === true) {
    return { kind: 'vault', payload: validateGearVaultImport(data) }
  }
  throw new Error('Unrecognized file format: not a CampSync vault pack or gear vault export.')
}

/**
 * Import a validated pack payload into PocketBase.
 * Returns the new pack ID.
 */
export async function importPack(payload: PackExportPayload, ownerId: string): Promise<string> {
  const created = (await PocketBaseService.createVaultPack({
    name: payload.name,
    category: payload.category,
    owner_id: ownerId,
  })) as unknown as { id: string }

  const packId = created.id

  await Promise.all(
    payload.items.map((item) =>
      PocketBaseService.createVaultPackItem({
        pack_id: packId,
        name: item.name,
        quantity: item.quantity,
        quantity_type: item.quantity_type,
      }),
    ),
  )

  return packId
}

/**
 * Import a full gear vault export into PocketBase.
 * Returns array of new pack IDs.
 */
export async function importGearVault(payload: GearVaultExportPayload, ownerId: string): Promise<string[]> {
  const ids: string[] = []
  for (const pack of payload.packs) {
    const id = await importPack(
      { campsync_vault_pack: true, name: pack.name, category: pack.category, items: pack.items },
      ownerId,
    )
    ids.push(id)
  }
  return ids
}
