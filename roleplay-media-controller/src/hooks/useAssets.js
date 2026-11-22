import { useCallback, useEffect, useState } from 'react'
import { addAsset, clearAllAssets, deleteAsset, listAssets, renameAsset } from '../storage/IndexedDB.js'
import {
  MAX_FILE_BYTES,
  detectType,
  formatBytes,
  isMpegFile,
  probeMedia,
  resolveMimeType,
  stripExtension,
} from '../utils/mediaHelpers.js'

const DECODE_ERROR = "Your browser can't decode this file. Re-export videos as MP4 (H.264 + AAC) and audio as MP3."
const MPEG_ERROR = "MPEG files can't be played in browsers. Convert to MP4 (H.264 + AAC) for video or MP3 for audio."

async function processFile(file) {
  if (isMpegFile(file)) throw new Error(MPEG_ERROR)
  let type = detectType(file)
  if (!type) throw new Error('Unsupported file type. Use a video, image or audio file.')
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`File is too large (${formatBytes(file.size)}). The limit is ${formatBytes(MAX_FILE_BYTES)}.`)
  }
  const probe = await probeMedia(file, type)
  if (!probe.ok) throw new Error(DECODE_ERROR)
  // A "video" with no picture (e.g. an audio-only container) is stored as audio.
  if (type === 'video' && !probe.hasVideoTrack) type = 'audio'
  return addAsset(file, {
    name: stripExtension(file.name),
    type,
    mimeType: resolveMimeType(file),
    duration: probe.duration,
  })
}

export default function useAssets() {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(
    () =>
      listAssets()
        .then((list) => {
          setAssets(list)
          setError(null)
        })
        .catch((err) => setError(err?.message || 'Could not read the media library.'))
        .finally(() => setLoading(false)),
    [],
  )

  const refresh = useCallback(() => {
    setLoading(true)
    return load()
  }, [load])

  useEffect(() => {
    load()
  }, [load])

  // Processes files one at a time. onProgress(index, total) is called before each file.
  const addFiles = useCallback(async (fileList, onProgress) => {
    const files = Array.from(fileList ?? [])
    const results = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      onProgress?.(i + 1, files.length)
      try {
        const record = await processFile(file)
        setAssets((prev) => [record, ...prev])
        results.push({ fileName: file.name, ok: true })
      } catch (err) {
        results.push({ fileName: file.name, ok: false, error: err?.message || 'Upload failed.' })
      }
    }
    return results
  }, [])

  const rename = useCallback(async (id, name) => {
    const updated = await renameAsset(id, name)
    setAssets((prev) => prev.map((a) => (a.id === id ? updated : a)))
  }, [])

  const remove = useCallback(async (id) => {
    await deleteAsset(id)
    setAssets((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const removeAll = useCallback(async () => {
    await clearAllAssets()
    setAssets([])
  }, [])

  return { assets, loading, error, refresh, addFiles, rename, remove, removeAll }
}
