import { useEffect, useState } from 'react'
import { getAction } from '../engine/actions.js'
import { keyLabel } from '../utils/keyLabels.js'
import KeyCap from './KeyCap.jsx'

const FLASH_MS = 600

const GROUPS = [
  { id: 'display', title: 'Display', actions: ['play-video', 'show-image'] },
  { id: 'music', title: 'Music', actions: ['play-music'] },
  { id: 'sfx', title: 'Sound effects', actions: ['play-sfx'] },
  { id: 'controls', title: 'Controls', actions: null }, // every global action
]

const BADGES = {
  'play-video': { text: 'VIDEO', cls: 'border-sky-900 text-sky-300' },
  'show-image': { text: 'IMAGE', cls: 'border-amber-900 text-amber-300' },
  'play-music': { text: 'MUSIC', cls: 'border-violet-900 text-violet-300' },
  'play-sfx': { text: 'SFX', cls: 'border-fuchsia-900 text-fuchsia-300' },
}
const CONTROL_BADGE = { text: 'CONTROL', cls: 'border-neutral-700 text-neutral-400' }

const byKeyLabel = (a, b) => keyLabel(a.code).localeCompare(keyLabel(b.code), undefined, { numeric: true })

function groupOf(action) {
  if (!action) return null
  if (action.assetType === null) return 'controls'
  return GROUPS.find((g) => g.actions?.includes(action.id))?.id ?? null
}

function isActive(m, playback) {
  const { video, image, music } = playback
  if (m.action === 'play-video') return video?.assetId === m.assetId
  if (m.action === 'show-image') return image?.assetId === m.assetId
  if (m.action === 'play-music') return music?.assetId === m.assetId
  return false
}

function Tile({ mapping, assets, active, flash }) {
  const action = getAction(mapping.action)
  const asset = mapping.assetId ? assets.find((a) => a.id === mapping.assetId) : null
  const name = action?.assetType === null ? action.label : (asset?.name ?? 'Missing file')
  const badge = BADGES[mapping.action] ?? CONTROL_BADGE

  // Fixed border width and ring (box-shadow) only, so highlighting never shifts the layout.
  let tone = 'border-neutral-800 bg-neutral-900/60'
  if (active) tone = 'border-emerald-700 bg-emerald-950/40'
  if (flash === 'ok') tone = 'border-green-500 bg-green-900/50 ring-2 ring-green-500/60'
  if (flash === 'error') tone = 'border-red-500 bg-red-900/50 ring-2 ring-red-500/60'

  return (
    <div className={`flex items-center gap-4 rounded-lg border p-3 transition-colors duration-300 ${tone}`}>
      <KeyCap code={mapping.code} size="lg" />
      <div className="min-w-0 flex-1">
        <div className={`truncate text-lg font-medium ${asset || !mapping.assetId ? 'text-neutral-100' : 'text-red-300'}`} title={name}>
          {name}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider ${badge.cls}`}>{badge.text}</span>
          {active && <span className="text-xs text-emerald-400">Active</span>}
        </div>
      </div>
    </div>
  )
}

// Read-only key cheat sheet. Tiles are deliberately not clickable.
export default function CheatSheet({ mappings, assets, playback, lastTriggered }) {
  // The trigger that existed before this page opened must not flash on mount.
  const [mountedAt] = useState(() => lastTriggered?.at ?? null)
  const [expiredAt, setExpiredAt] = useState(null)

  useEffect(() => {
    if (!lastTriggered) return
    const at = lastTriggered.at
    const timer = setTimeout(() => setExpiredAt(at), FLASH_MS)
    return () => clearTimeout(timer)
  }, [lastTriggered])

  const flashing =
    lastTriggered && lastTriggered.at !== mountedAt && lastTriggered.at !== expiredAt ? lastTriggered : null

  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((g) => {
        const items = mappings.filter((m) => groupOf(getAction(m.action)) === g.id).sort(byKeyLabel)
        if (items.length === 0) return null
        return (
          <section key={g.id}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">{g.title}</h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
              {items.map((m) => (
                <Tile
                  key={m.code}
                  mapping={m}
                  assets={assets}
                  active={isActive(m, playback)}
                  flash={flashing?.code === m.code ? (flashing.ok ? 'ok' : 'error') : null}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
