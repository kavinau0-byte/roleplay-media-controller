// Object URL cache for stored media (one URL per asset, per window).
import { getAssetBlob } from '../storage/IndexedDB.js'

const urls = new Map() // assetId -> object URL
const inflight = new Map() // assetId -> Promise<string | null>

// Resolves to a cached object URL, or null if the blob is missing or unreadable. Never rejects.
export function getAssetUrl(assetId) {
  if (urls.has(assetId)) return Promise.resolve(urls.get(assetId))
  if (inflight.has(assetId)) return inflight.get(assetId)
  const promise = getAssetBlob(assetId)
    .then((blob) => {
      if (!blob) return null
      const url = URL.createObjectURL(blob)
      urls.set(assetId, url)
      return url
    })
    .catch(() => null)
    .finally(() => inflight.delete(assetId))
  inflight.set(assetId, promise)
  return promise
}

export function revokeAll() {
  for (const url of urls.values()) URL.revokeObjectURL(url)
  urls.clear()
}
