import { useCallback, useState } from 'react'
import KeyboardMapper from '../components/KeyboardMapper.jsx'
import KeyCap from '../components/KeyCap.jsx'
import { GLOBAL_ACTIONS, getAction } from '../engine/actions.js'
import { describeAction } from '../engine/KeyboardEngine.js'
import useKeyCapture from '../hooks/useKeyCapture.js'
import useToast from '../hooks/useToast.js'
import { keyLabel } from '../utils/keyLabels.js'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'video', label: 'Videos' },
  { id: 'image', label: 'Images' },
  { id: 'audio', label: 'Audio' },
]

const SECTION = 'flex flex-col gap-3'
const HEADING = 'text-sm font-semibold text-neutral-100'
const SMALL_BUTTON =
  'rounded border border-neutral-800 px-2 py-1 text-xs text-neutral-400 hover:border-neutral-600 hover:text-neutral-100'

function TestPad({ lastTriggered }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
      <div className={HEADING}>Last key pressed</div>
      <div className="mt-3 flex min-h-8 items-center gap-3 text-sm">
        {lastTriggered ? (
          <>
            <KeyCap code={lastTriggered.code} />
            <span className={lastTriggered.ok ? 'text-green-300' : 'text-red-300'}>{lastTriggered.summary}</span>
            <span className="text-xs text-neutral-500">{new Date(lastTriggered.at).toLocaleTimeString()}</span>
          </>
        ) : (
          <span className="text-neutral-500">Press a mapped key.</span>
        )}
      </div>
      <div className="mt-2 text-xs text-neutral-600">
        Shows the last mapped key and what it did.
      </div>
    </div>
  )
}

export default function KeyboardMappings({ assets, loading, keyboard, lastTriggered }) {
  const { mappings, assign, replace, removeByCode, restoreDefaults, keyFor, keyForAction } = keyboard
  const [filter, setFilter] = useState('all')
  const toast = useToast()

  const onAssigned = useCallback(
    (code, action, assetId) => {
      toast.success(`${keyLabel(code)} assigned to ${describeAction({ code, action, assetId }, assets)}.`)
    },
    [toast, assets],
  )
  const onTimeout = useCallback(() => toast.error('No key pressed. Assignment cancelled.'), [toast])
  const keyCapture = useKeyCapture({ assign, replace, onAssigned, onTimeout })

  const counts = { all: assets.length, video: 0, image: 0, audio: 0 }
  for (const a of assets) counts[a.type] = (counts[a.type] ?? 0) + 1
  const visible = filter === 'all' ? assets : assets.filter((a) => a.type === filter)

  const rows = mappings
    .map((m) => {
      const asset = m.assetId ? assets.find((a) => a.id === m.assetId) : null
      return {
        mapping: m,
        label: keyLabel(m.code),
        action: getAction(m.action)?.label ?? m.action,
        target: m.assetId === null ? '—' : (asset?.name ?? 'Missing asset'),
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))

  const handleRestore = () => {
    if (!window.confirm('Restore default mappings? All current key assignments will be replaced.')) return
    keyCapture.cancel()
    restoreDefaults()
    toast.success('Default mappings restored.')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-neutral-100">Keyboard Mappings</h1>
        <button type="button" onClick={handleRestore} className={SMALL_BUTTON}>
          Restore default mappings
        </button>
      </div>

      <TestPad lastTriggered={lastTriggered} />

      <section className={SECTION}>
        <h2 className={HEADING}>Global controls</h2>
        <div className="flex flex-col gap-1.5">
          {GLOBAL_ACTIONS.map((a) => {
            const mapping = keyForAction(a.id)
            return (
              <KeyboardMapper
                key={a.id}
                action={a.id}
                mapping={mapping}
                assets={assets}
                keyCapture={keyCapture}
                onAssign={assign}
                onRemove={() => mapping && removeByCode(mapping.code)}
              />
            )
          })}
        </div>
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>Assets</h2>
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
        {loading ? (
          <div className="text-sm text-neutral-500">Loading media...</div>
        ) : visible.length === 0 ? (
          <div className="rounded-lg border border-neutral-800 px-4 py-6 text-center text-sm text-neutral-500">
            {assets.length === 0 ? 'No media yet. Upload files in the Media Library.' : 'No items of this type.'}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {visible.map((asset) => {
              const mapping = keyFor(asset.id)
              return (
                <KeyboardMapper
                  key={asset.id}
                  asset={asset}
                  mapping={mapping}
                  assets={assets}
                  keyCapture={keyCapture}
                  onAssign={assign}
                  onRemove={() => mapping && removeByCode(mapping.code)}
                />
              )
            })}
          </div>
        )}
      </section>

      <section className={SECTION}>
        <h2 className={HEADING}>All shortcuts</h2>
        {rows.length === 0 ? (
          <div className="text-sm text-neutral-500">No shortcuts assigned.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-900 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Key</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Target</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.mapping.code} className="border-t border-neutral-800">
                    <td className="px-3 py-2">
                      <KeyCap code={r.mapping.code} />
                    </td>
                    <td className="px-3 py-2 text-neutral-300">{r.action}</td>
                    <td className="px-3 py-2 text-neutral-300">{r.target}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        disabled={keyCapture.capture !== null}
                        onClick={() => removeByCode(r.mapping.code)}
                        className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-red-300 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
