import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { getAssetUrl } from '../engine/mediaUrls.js'

const MANUAL_ITEMS = [
  'Charger plugged in',
  'Projector / second screen connected and set to Extend',
  'Laptop volume and projector volume set',
  'Notifications / Do Not Disturb on',
  'Other tabs and apps closed',
  'Test video and music played once',
]

const blurAfterPointer = (e) => e.currentTarget.blur()

function Row({ ok, label, reason }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`w-5 shrink-0 text-center text-lg leading-6 font-semibold ${ok ? 'text-green-500' : 'text-red-500'}`}>
        {ok ? '✓' : '✗'}
      </span>
      <div className="min-w-0">
        <div className={ok ? 'text-neutral-100' : 'text-neutral-300'}>{label}</div>
        {reason && <div className="text-sm text-neutral-500">{reason}</div>}
      </div>
    </li>
  )
}

// props: connected, output ({ fullscreen, activated, sinkError }), mappings, assets, hasCustomMappings
export default function PreShowChecklist({ connected, output, mappings, assets, hasCustomMappings }) {
  const [open, setOpen] = useState(true)
  const [ticked, setTicked] = useState(() => new Set())
  const [files, setFiles] = useState({ running: true, ok: 0, total: 0, failed: [] })
  const runRef = useRef(0)

  // Loads every mapped file from local storage (also warms the playback URL cache).
  const checkFiles = async () => {
    const run = ++runRef.current
    const ids = [...new Set(mappings.filter((m) => m.assetId).map((m) => m.assetId))]
    const results = await Promise.all(ids.map((id) => getAssetUrl(id).then((url) => ({ id, ok: Boolean(url) }))))
    if (run !== runRef.current) return
    const failed = results
      .filter((r) => !r.ok)
      .map((r) => assets.find((a) => a.id === r.id)?.name ?? 'Unknown file')
    setFiles({ running: false, ok: results.length - failed.length, total: results.length, failed })
  }

  const autoCheck = useEffectEvent(() => {
    checkFiles()
  })
  useEffect(() => {
    autoCheck() // once, when the page opens
  }, [])

  const runCheck = (e) => {
    e.currentTarget.blur()
    setFiles((f) => ({ ...f, running: true }))
    checkFiles()
  }

  const filesOk = !files.running && files.failed.length === 0 && files.total > 0
  let filesReason = files.running ? 'Checking...' : `${files.ok} of ${files.total} OK`
  if (!files.running && files.total === 0) filesReason = 'No mapped files to check'
  if (files.failed.length > 0) filesReason += `. Failed: ${files.failed.join(', ')}`

  const checks = [
    { label: 'Output window connected', ok: connected, reason: connected ? null : 'Open the output window' },
    {
      label: 'Output is fullscreen',
      ok: connected && output.fullscreen,
      reason: connected && output.fullscreen ? null : 'Click inside the output window or press F there',
    },
    {
      label: 'Audio unlocked',
      ok: connected && output.activated,
      reason: connected && output.activated ? null : 'Click once inside the output window',
    },
    {
      label: 'Output audio device OK',
      ok: connected && !output.sinkError,
      reason: !connected ? 'Output not connected' : output.sinkError ? 'Device missing; using system default' : null,
    },
    {
      label: 'Show keys mapped',
      ok: hasCustomMappings,
      reason: hasCustomMappings ? null : 'Only the default keys exist',
    },
    { label: 'All mapped files load OK', ok: filesOk, reason: filesReason },
  ]
  const green = checks.filter((c) => c.ok).length
  const allGreen = green === checks.length

  const toggle = (item) =>
    setTicked((prev) => {
      const next = new Set(prev)
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onPointerUp={blurAfterPointer}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-lg font-semibold text-neutral-100">Pre-show checklist</span>
        <span className="flex items-center gap-4">
          <span className={`text-base ${allGreen ? 'text-green-400' : 'text-neutral-400'}`}>
            {green} of {checks.length} checks green · {ticked.size} of {MANUAL_ITEMS.length} ticked
          </span>
          <span className="text-neutral-500">{open ? '▴' : '▾'}</span>
        </span>
      </button>

      {open && (
        <div className="grid gap-6 border-t border-neutral-800 px-5 py-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2 text-base">
              {checks.map((c) => (
                <Row key={c.label} ok={c.ok} label={c.label} reason={c.reason} />
              ))}
            </ul>
            <div>
              <button
                type="button"
                onClick={runCheck}
                disabled={files.running}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700 disabled:opacity-50"
              >
                Run file check
              </button>
            </div>
          </div>
          <ul className="flex flex-col gap-2 text-base">
            {MANUAL_ITEMS.map((item) => (
              <li key={item}>
                <label className="flex cursor-pointer items-center gap-3 text-neutral-200">
                  <input
                    type="checkbox"
                    checked={ticked.has(item)}
                    onChange={(e) => {
                      toggle(item)
                      e.currentTarget.blur() // a focused checkbox swallows show keys
                    }}
                    className="h-4 w-4 accent-neutral-200"
                  />
                  {item}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
