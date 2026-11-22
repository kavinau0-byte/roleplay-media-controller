import { useState } from 'react'
import KeyCap from './KeyCap.jsx'
import { getAction } from '../engine/actions.js'
import { formatBytes, formatDuration } from '../utils/mediaHelpers.js'

const BADGE_STYLES = {
  video: 'border-sky-900 bg-sky-950/60 text-sky-300',
  image: 'border-amber-900 bg-amber-950/50 text-amber-300',
  audio: 'border-violet-900 bg-violet-950/60 text-violet-300',
}

const ACTION = 'rounded px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100'

export default function MediaCard({ asset, mapping, onPreview, onRename, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(asset.name)

  const startEdit = () => {
    setDraft(asset.name)
    setEditing(true)
  }

  const save = async () => {
    const name = draft.trim()
    setEditing(false)
    if (name && name !== asset.name) await onRename(asset.id, name)
  }

  const duration = formatDuration(asset.duration)

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider ${BADGE_STYLES[asset.type] ?? ''}`}
        >
          {asset.type.toUpperCase()}
        </span>
        {mapping ? (
          <KeyCap code={mapping.code} label={getAction(mapping.action)?.label} />
        ) : (
          <span className="rounded border border-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-600">No key</span>
        )}
      </div>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save()
            else if (e.key === 'Escape') setEditing(false)
          }}
          onBlur={() => setEditing(false)}
          className="rounded border border-neutral-600 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-neutral-400"
        />
      ) : (
        <div className="truncate text-sm font-medium text-neutral-100" title={asset.name}>
          {asset.name}
        </div>
      )}

      <div className="flex gap-3 text-xs text-neutral-500">
        <span>{formatBytes(asset.size)}</span>
        {duration && <span>{duration}</span>}
      </div>

      {asset.description && <div className="truncate text-xs text-neutral-400">{asset.description}</div>}

      <div className="-mx-1 mt-auto flex gap-1 border-t border-neutral-800 pt-2">
        <button type="button" className={ACTION} onClick={() => onPreview(asset)}>
          Preview
        </button>
        <button type="button" className={ACTION} onClick={startEdit} disabled={editing}>
          Rename
        </button>
        <button
          type="button"
          className={`${ACTION} hover:text-red-300`}
          onClick={() => {
            if (window.confirm(`Delete "${asset.name}"? This cannot be undone.`)) onDelete(asset.id)
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
