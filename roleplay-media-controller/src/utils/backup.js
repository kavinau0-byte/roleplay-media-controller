// Backup to / restore from a folder (File System Access API, Chrome desktop). No React.
import { addAssetWithId, getAssetBlob } from '../storage/IndexedDB.js'
import { getExtension } from './mediaHelpers.js'

export const MANIFEST_NAME = 'manifest.json'
const VERSION = 1
const ASSET_TYPES = new Set(['video', 'image', 'audio'])
const SAFE_FILE_NAME = /^[\w.-]+$/

const MIME_EXT = {
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'video/x-m4v': 'm4v', 'video/ogg': 'ogv',
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav',
  'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/flac': 'flac',
  'audio/x-flac': 'flac', 'audio/webm': 'weba',
}
const KNOWN_EXT = new Set(Object.values(MIME_EXT))

export function supportsFolderAccess() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

// True if the user closed the folder picker (not an error worth showing).
export function isPickerCancel(err) {
  return err?.name === 'AbortError'
}

// Extension from the MIME type, else from the name if it carries a known one, else "bin".
export function fileNameFor(asset) {
  const mime = (asset.mimeType || '').split(';')[0].trim().toLowerCase()
  const fromName = getExtension(asset.name || '')
  const ext = MIME_EXT[mime] || (KNOWN_EXT.has(fromName) ? fromName : 'bin')
  return `${asset.id}.${ext}`
}

async function writeFile(dir, name, data) {
  const handle = await dir.getFileHandle(name, { create: true })
  const writable = await handle.createWritable()
  try {
    await writable.write(data) // a Blob is streamed to disk, not copied into memory
    await writable.close()
  } catch (err) {
    await writable.abort().catch(() => {})
    throw err
  }
}

// Writes one file per asset, then manifest.json (last, so an interrupted backup has no manifest).
// onProgress(current, total). Resolves { saved, skipped: [{ name, reason }] }.
export async function backupToFolder(dir, { assets, mappings, audioSettings, onProgress }) {
  const entries = []
  const skipped = []
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i]
    onProgress?.(i + 1, assets.length)
    let blob
    try {
      blob = await getAssetBlob(asset.id)
    } catch {
      blob = null
    }
    if (!blob) {
      skipped.push({ name: asset.name, reason: 'file missing from local storage' })
      continue
    }
    const file = fileNameFor(asset)
    try {
      await writeFile(dir, file, blob)
    } catch (err) {
      skipped.push({ name: asset.name, reason: err?.message || 'could not write the file' })
      continue
    }
    const { id, name, type, mimeType, size, description, duration, createdAt } = asset
    entries.push({ id, name, type, mimeType, size, description, duration, createdAt, file })
  }
  const manifest = {
    version: VERSION,
    exportedAt: new Date().toISOString(),
    origin: location.origin,
    assets: entries,
    mappings,
    audioSettings,
  }
  await writeFile(dir, MANIFEST_NAME, new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }))
  return { saved: entries.length, skipped }
}

// Reads and validates manifest.json. Throws an Error with a clear message if it is not a v1 backup.
// Resolves { manifest, assets (valid entries), invalid (count of unusable asset entries) }.
export async function readManifest(dir) {
  let text
  try {
    const handle = await dir.getFileHandle(MANIFEST_NAME)
    text = await (await handle.getFile()).text()
  } catch {
    throw new Error('No manifest.json in this folder. Pick the folder you backed up to.')
  }
  let manifest
  try {
    manifest = JSON.parse(text)
  } catch {
    throw new Error('manifest.json is damaged (not valid JSON). Nothing was changed.')
  }
  if (!manifest || typeof manifest !== 'object' || manifest.version !== VERSION) {
    throw new Error('manifest.json is not a version 1 backup from this app. Nothing was changed.')
  }
  if (!Array.isArray(manifest.assets) || !Array.isArray(manifest.mappings)) {
    throw new Error('manifest.json is incomplete (assets or mappings missing). Nothing was changed.')
  }
  if (!manifest.audioSettings || typeof manifest.audioSettings !== 'object') {
    throw new Error('manifest.json is incomplete (audio settings missing). Nothing was changed.')
  }
  const seen = new Set()
  const assets = []
  for (const a of manifest.assets) {
    const ok =
      a &&
      typeof a.id === 'string' &&
      a.id &&
      !seen.has(a.id) &&
      ASSET_TYPES.has(a.type) &&
      typeof a.file === 'string' &&
      SAFE_FILE_NAME.test(a.file)
    if (!ok) continue
    seen.add(a.id)
    assets.push(a)
  }
  return { manifest, assets, invalid: manifest.assets.length - assets.length }
}

function toRecord(entry, blob) {
  return {
    id: entry.id,
    name: typeof entry.name === 'string' && entry.name.trim() ? entry.name : 'Untitled',
    type: entry.type,
    mimeType: typeof entry.mimeType === 'string' ? entry.mimeType : '',
    size: blob.size,
    description: typeof entry.description === 'string' ? entry.description : '',
    duration: Number.isFinite(entry.duration) ? entry.duration : null,
    createdAt: Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now(),
  }
}

// Inserts every entry (all must be NEW ids) one by one; failures are collected, never fatal.
// Resolves { restored, failed: [{ name, reason }] }.
export async function restoreAssets(dir, entries, onProgress) {
  let restored = 0
  const failed = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    onProgress?.(i + 1, entries.length)
    try {
      let file
      try {
        file = await (await dir.getFileHandle(entry.file)).getFile()
      } catch {
        throw new Error('file not found in the backup folder')
      }
      const blob = new Blob([file], { type: typeof entry.mimeType === 'string' ? entry.mimeType : '' })
      await addAssetWithId(toRecord(entry, blob), blob)
      restored++
    } catch (err) {
      failed.push({ name: entry.name || entry.file, reason: err?.message || 'could not be added' })
    }
  }
  return { restored, failed }
}
