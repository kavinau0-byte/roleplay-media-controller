// Persistent local media storage.
// "assets" holds lightweight metadata (safe to list); "blobs" holds the file data
// and is only read when a specific asset is needed.
import { openDB } from 'idb'

const DB_NAME = 'roleplay-media'
const DB_VERSION = 1
const ASSETS = 'assets'
const BLOBS = 'blobs'

const QUOTA_MESSAGE = 'Not enough local storage space for this file.'

let dbPromise = null
let persistRequested = false

function requestPersistence() {
  if (persistRequested) return
  persistRequested = true
  try {
    navigator.storage?.persist?.()?.catch?.(() => {})
  } catch {
    // ignore: persistence is best effort
  }
}

function getDB() {
  if (!dbPromise) {
    requestPersistence()
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS, { keyPath: 'id' })
        if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS, { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

function isQuotaError(err) {
  return err?.name === 'QuotaExceededError'
}

async function withQuotaCheck(fn) {
  try {
    return await fn()
  } catch (err) {
    if (isQuotaError(err)) throw new Error(QUOTA_MESSAGE, { cause: err })
    throw err
  }
}

// meta.mimeType should be the resolved MIME type (file.type may be empty).
export async function addAsset(file, meta = {}) {
  const db = await getDB()
  const mimeType = meta.mimeType || file.type || ''
  const blob = new Blob([file], { type: mimeType })
  const record = {
    id: crypto.randomUUID(),
    name: meta.name ?? file.name,
    type: meta.type,
    mimeType,
    size: file.size,
    description: meta.description ?? '',
    duration: meta.duration ?? null,
    createdAt: Date.now(),
  }
  return withQuotaCheck(async () => {
    const tx = db.transaction([ASSETS, BLOBS], 'readwrite')
    await Promise.all([
      tx.objectStore(ASSETS).put(record),
      tx.objectStore(BLOBS).put({ id: record.id, blob }),
      tx.done,
    ])
    return record
  })
}

// Restore helper: inserts an asset with a GIVEN id (metadata + blob in one transaction).
// Rejects (ConstraintError) if the id already exists, so existing assets are never overwritten.
export async function addAssetWithId(record, blob) {
  const db = await getDB()
  return withQuotaCheck(async () => {
    const tx = db.transaction([ASSETS, BLOBS], 'readwrite')
    await Promise.all([tx.objectStore(ASSETS).add(record), tx.objectStore(BLOBS).add({ id: record.id, blob }), tx.done])
    return record
  })
}

export async function listAssets() {
  const db = await getDB()
  const all = await db.getAll(ASSETS)
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

// Returns the stored blob, re-wrapped with the asset's mimeType if its own type is empty.
export async function getAssetBlob(id) {
  const db = await getDB()
  const tx = db.transaction([ASSETS, BLOBS], 'readonly')
  const [asset, entry] = await Promise.all([tx.objectStore(ASSETS).get(id), tx.objectStore(BLOBS).get(id), tx.done])
  const blob = entry?.blob ?? null
  if (blob && !blob.type && asset?.mimeType) return new Blob([blob], { type: asset.mimeType })
  return blob
}

async function updateAsset(id, changes) {
  const db = await getDB()
  const tx = db.transaction(ASSETS, 'readwrite')
  const store = tx.objectStore(ASSETS)
  const existing = await store.get(id)
  if (!existing) {
    tx.done.catch(() => {})
    tx.abort()
    throw new Error('This media item no longer exists.')
  }
  const updated = { ...existing, ...changes }
  await Promise.all([store.put(updated), tx.done])
  return updated
}

export function renameAsset(id, name) {
  return updateAsset(id, { name })
}

export function updateDescription(id, description) {
  return updateAsset(id, { description })
}

export async function deleteAsset(id) {
  const db = await getDB()
  const tx = db.transaction([ASSETS, BLOBS], 'readwrite')
  await Promise.all([tx.objectStore(ASSETS).delete(id), tx.objectStore(BLOBS).delete(id), tx.done])
}

export async function clearAllAssets() {
  const db = await getDB()
  const tx = db.transaction([ASSETS, BLOBS], 'readwrite')
  await Promise.all([tx.objectStore(ASSETS).clear(), tx.objectStore(BLOBS).clear(), tx.done])
}

export async function getStorageEstimate() {
  if (!navigator.storage?.estimate) return null
  try {
    const { usage, quota } = await navigator.storage.estimate()
    return { usage: usage ?? 0, quota: quota ?? 0 }
  } catch {
    return null
  }
}
