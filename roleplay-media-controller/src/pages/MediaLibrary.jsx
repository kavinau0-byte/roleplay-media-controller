import { useCallback, useEffect, useState } from 'react'
import MediaUploader from '../components/MediaUploader.jsx'
import MediaCard from '../components/MediaCard.jsx'
import PreviewModal from '../components/PreviewModal.jsx'
import useToast from '../hooks/useToast.js'
import { getStorageEstimate } from '../storage/IndexedDB.js'
import { formatBytes } from '../utils/mediaHelpers.js'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'video', label: 'Videos' },
  { id: 'image', label: 'Images' },
  { id: 'audio', label: 'Audio' },
]

export default function MediaLibrary({ assets, loading, error, addFiles, rename, remove, removeAll, keyFor }) {
  const [filter, setFilter] = useState('all')
  const [previewAsset, setPreviewAsset] = useState(null)
  const [storage, setStorage] = useState(null)
  const toast = useToast()

  useEffect(() => {
    let cancelled = false
    getStorageEstimate().then((est) => {
      if (!cancelled) setStorage(est)
    })
    return () => {
      cancelled = true
    }
  }, [assets.length])

  const counts = { all: assets.length, video: 0, image: 0, audio: 0 }
  for (const a of assets) counts[a.type] = (counts[a.type] ?? 0) + 1
  const visible = filter === 'all' ? assets : assets.filter((a) => a.type === filter)

  const closePreview = useCallback(() => setPreviewAsset(null), [])

  const handleRename = async (id, name) => {
    try {
      await rename(id, name)
    } catch (err) {
      toast.error(err?.message || 'Rename failed.')
    }
  }

  const handleDelete = async (id) => {
    try {
      await remove(id)
      if (previewAsset?.id === id) setPreviewAsset(null)
      toast.success('Deleted.')
    } catch (err) {
      toast.error(err?.message || 'Delete failed.')
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm(`Delete all ${assets.length} media items? This cannot be undone.`)) return
    try {
      await removeAll()
      setPreviewAsset(null)
      toast.success('Media library cleared.')
    } catch (err) {
      toast.error(err?.message || 'Could not clear the library.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-neutral-100">Media Library</h1>
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          {storage && storage.quota > 0 && (
            <span>
              Storage: {formatBytes(storage.usage)} of {formatBytes(storage.quota)}
            </span>
          )}
          {assets.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              className="rounded border border-neutral-800 px-2 py-1 text-neutral-400 hover:border-red-900 hover:text-red-300"
            >
              Delete all
            </button>
          )}
        </div>
      </div>

      <MediaUploader onAddFiles={addFiles} />

      <div className="flex gap-1 border-b border-neutral-800">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              filter === f.id
                ? 'border-neutral-200 text-neutral-100'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {f.label} <span className="text-neutral-600">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {error && <div className="text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="text-sm text-neutral-500">Loading media...</div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-neutral-800 px-4 py-10 text-center text-sm text-neutral-500">
          {assets.length === 0
            ? 'No media yet. Upload videos, images or audio above.'
            : 'No items of this type.'}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {visible.map((asset) => (
            <MediaCard
              key={asset.id}
              asset={asset}
              mapping={keyFor(asset.id)}
              onPreview={setPreviewAsset}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {previewAsset && <PreviewModal key={previewAsset.id} asset={previewAsset} onClose={closePreview} />}
    </div>
  )
}
