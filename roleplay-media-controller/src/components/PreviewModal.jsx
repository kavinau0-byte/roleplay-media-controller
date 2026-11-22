import { useEffect, useState } from 'react'
import { getAssetBlob } from '../storage/IndexedDB.js'

const MEDIA_ERROR_MESSAGE = "This file can't be played in this browser. Re-export videos as MP4 (H.264 + AAC) and audio as MP3."
const IMAGE_ERROR_MESSAGE = "This image can't be displayed in this browser."

// Ref callback: when the media element is really removed, make sure playback fully stops.
// React 19 StrictMode (dev) detaches and re-attaches refs once on mount while the element
// stays in the DOM. Stripping src at that point would leave the player empty at 0:00,
// so the check is deferred and only runs if the element has actually left the document.
function stopOnUnmount(el) {
  if (!el) return
  return () => {
    queueMicrotask(() => {
      if (el.isConnected) return
      el.pause()
      el.removeAttribute('src')
      el.load()
    })
  }
}

function formatSeconds(d) {
  if (Number.isNaN(d)) return 'NaN'
  if (d === Infinity) return 'Infinity'
  return `${d.toFixed(3)} s`
}

// Render with key={asset.id} so state resets when the asset changes.
export default function PreviewModal({ asset, onClose }) {
  const [loaded, setLoaded] = useState(null) // { url, blobType, blobSize, canPlay }
  const [loadError, setLoadError] = useState(null)
  const [mediaError, setMediaError] = useState(null) // { message, detail }
  const [metadata, setMetadata] = useState(null) // { duration, readyState }

  const isMedia = asset.type === 'video' || asset.type === 'audio'

  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    getAssetBlob(asset.id)
      .then((blob) => {
        if (cancelled) return
        if (!blob) {
          setLoadError('The file for this item is missing from local storage. Delete it and upload it again.')
          return
        }
        objectUrl = URL.createObjectURL(blob)
        const canPlay =
          asset.type === 'video' || asset.type === 'audio'
            ? document.createElement(asset.type).canPlayType(asset.mimeType || '')
            : null
        setLoaded({ url: objectUrl, blobType: blob.type, blobSize: blob.size, canPlay })
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load this file from local storage.')
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [asset.id, asset.type, asset.mimeType])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onMediaError = (e) => {
    const el = e.currentTarget
    const err = el.error
    setMediaError({
      message: MEDIA_ERROR_MESSAGE,
      detail: `MediaError code ${err?.code ?? 'n/a'}${err?.message ? ` (${err.message})` : ''}, networkState ${el.networkState}, readyState ${el.readyState}`,
    })
  }

  const onLoadedMetadata = (e) => {
    const el = e.currentTarget
    setMetadata({ duration: el.duration, readyState: el.readyState })
  }

  const url = loaded?.url
  let body = <div className="text-sm text-neutral-500">Loading...</div>
  if (loadError) body = <div className="text-sm text-red-300">{loadError}</div>
  else if (url && asset.type === 'video')
    body = (
      <video
        key={asset.id}
        ref={stopOnUnmount}
        src={url}
        controls
        autoPlay
        preload="metadata"
        playsInline
        onError={onMediaError}
        onLoadedMetadata={onLoadedMetadata}
        className="max-h-[70vh] w-full bg-black object-contain"
      />
    )
  else if (url && asset.type === 'image')
    body = (
      <img
        key={asset.id}
        src={url}
        alt={asset.name}
        onError={() => setMediaError({ message: IMAGE_ERROR_MESSAGE, detail: null })}
        className="max-h-[70vh] w-full object-contain"
      />
    )
  else if (url && asset.type === 'audio')
    body = (
      <audio
        key={asset.id}
        ref={stopOnUnmount}
        src={url}
        controls
        autoPlay
        preload="metadata"
        onError={onMediaError}
        onLoadedMetadata={onLoadedMetadata}
        className="w-full"
      />
    )

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="flex w-full max-w-4xl flex-col gap-3 rounded-lg border border-neutral-800 bg-[#141416] p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="truncate text-sm font-medium text-neutral-100">{asset.name}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            Close
          </button>
        </div>
        <div className="flex min-h-40 items-center justify-center">{body}</div>

        {mediaError && (
          <div className="rounded-md border border-red-900/60 bg-[#1a1011] p-2 text-xs text-red-200">
            <div>{mediaError.message}</div>
            {mediaError.detail && <div className="mt-1 font-mono text-red-300/70">{mediaError.detail}</div>}
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-neutral-500">
          <span>type: {asset.type}</span>
          <span>mimeType: {asset.mimeType || '(empty)'}</span>
          <span>blob.type: {loaded ? loaded.blobType || '(empty)' : '...'}</span>
          <span>blob.size: {loaded ? `${loaded.blobSize} bytes` : '...'}</span>
          {isMedia && <span>canPlayType: {loaded ? `"${loaded.canPlay}"` : '...'}</span>}
          {isMedia && (
            <span>
              metadata:{' '}
              {metadata
                ? `duration ${formatSeconds(metadata.duration)}, readyState ${metadata.readyState}`
                : 'not loaded'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
