import { useState } from 'react'
import KeyCap from './KeyCap.jsx'
import { defaultActionForAsset, getAction } from '../engine/actions.js'
import { describeAction } from '../engine/KeyboardEngine.js'
import { keyLabel } from '../utils/keyLabels.js'

const BUTTON = 'rounded px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-40'

const TYPE_BADGE = {
  video: 'border-sky-900 bg-sky-950/60 text-sky-300',
  image: 'border-amber-900 bg-amber-950/50 text-amber-300',
  audio: 'border-violet-900 bg-violet-950/60 text-violet-300',
}

const AUDIO_ROLES = [
  { id: 'play-music', label: 'Background music (loops, press again to stop)' },
  { id: 'play-sfx', label: 'Sound effect (one-shot)' },
]

// One mappable target (a global action, or an asset when `asset` is given).
// keyCapture is the shared page-wide controller from useKeyCapture.
export default function KeyboardMapper({ action, asset, mapping, assets, keyCapture, onAssign, onRemove }) {
  const isAudio = asset?.type === 'audio'
  const [audioRole, setAudioRole] = useState(() => (asset ? defaultActionForAsset(asset) : null))
  // A mapped audio asset shows its current role; otherwise the local choice.
  const role = isAudio ? (mapping?.action ?? audioRole) : null
  const targetAction = asset ? (isAudio ? role : defaultActionForAsset(asset)) : action

  const { capture } = keyCapture
  const capturingThis =
    capture !== null && (asset ? capture.assetId === asset.id : capture.assetId === null && capture.action === action)
  const busy = capture !== null

  const title = asset ? asset.name : getAction(action)?.label

  const changeRole = (next) => {
    setAudioRole(next)
    // Same key, same target, new action: updates the role in place.
    if (mapping) onAssign(mapping.code, next, asset.id)
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900/60 px-3 py-2">
      <div className="flex items-center gap-3">
        {asset && (
          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider ${TYPE_BADGE[asset.type] ?? ''}`}>
            {asset.type.toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-neutral-100" title={title}>
          {title}
        </span>
        {isAudio && (
          <select
            value={role}
            onChange={(e) => changeRole(e.target.value)}
            disabled={busy}
            className="rounded border border-neutral-700 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-300 outline-none focus:border-neutral-500"
          >
            {AUDIO_ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        )}
        <span className="w-16 text-right">
          {mapping ? <KeyCap code={mapping.code} /> : <span className="text-[10px] text-neutral-600">No key</span>}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            className={BUTTON}
            disabled={busy}
            onClick={() => keyCapture.start(targetAction, asset ? asset.id : null)}
          >
            {mapping ? 'Change' : 'Assign key'}
          </button>
          <button type="button" className={`${BUTTON} hover:text-red-300`} disabled={busy || !mapping} onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>

      {capturingThis && capture.conflict === null && (
        <div className="flex items-center justify-between gap-3 rounded border border-neutral-600 bg-neutral-950 px-3 py-2 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-neutral-100">Press the key you want to use...</span>
            {capture.error && <span className="text-amber-300">{capture.error}</span>}
          </div>
          <button type="button" className={BUTTON} onClick={keyCapture.cancel}>
            Cancel
          </button>
        </div>
      )}

      {capturingThis && capture.conflict && (
        <div className="flex items-center justify-between gap-3 rounded border border-amber-900/70 bg-[#1a160e] px-3 py-2 text-xs text-amber-200">
          <span>
            Key {keyLabel(capture.conflict.code)} is already assigned to {describeAction(capture.conflict.existing, assets)}
          </span>
          <div className="flex gap-1">
            <button type="button" className={`${BUTTON} text-amber-200`} onClick={keyCapture.confirmReplace}>
              Replace
            </button>
            <button type="button" className={BUTTON} onClick={keyCapture.cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
