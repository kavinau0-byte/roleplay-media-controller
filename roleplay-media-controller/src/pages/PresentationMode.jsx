import { useEffect } from 'react'
import CheatSheet from '../components/CheatSheet.jsx'
import PreShowChecklist from '../components/PreShowChecklist.jsx'
import { runAction } from '../engine/dispatch.js'
import { isDefaultMapping } from '../hooks/useMappings.js'
import { usePlaybackState } from '../hooks/usePlayback.js'
import useToast from '../hooks/useToast.js'
import useWakeLock from '../hooks/useWakeLock.js'

const PANIC = [
  { action: 'clear-display', label: 'Clear display' },
  { action: 'stop-all', label: 'Stop all' },
]

function Chip({ ok, label }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
        ok ? 'border-green-900 bg-green-950/40 text-green-300' : 'border-red-900 bg-red-950/40 text-red-300'
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
      {label}
    </span>
  )
}

function NowPlaying({ playback, connected }) {
  const { video, image, music, sfxCount } = playback
  const screen = !connected
    ? 'Output not connected'
    : video
      ? `Video: ${video.name}`
      : image
        ? `Image: ${image.name}`
        : 'Black'
  const rows = [
    { label: 'Screen', value: screen, warn: !connected },
    { label: 'Music', value: music ? `${music.name} (${music.paused ? 'Paused' : 'Playing'})` : 'None' },
    { label: 'Sound effects', value: sfxCount > 0 ? `${sfxCount} playing` : 'None' },
  ]
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Now playing</h2>
      <dl className="mt-3 grid grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-2xl">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-neutral-500">{r.label}</dt>
            <dd className={`truncate ${r.warn ? 'text-red-400/80' : 'text-neutral-100'}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// Asks for confirmation before the tab closes or reloads while this page is open.
function useConfirmLeave() {
  useEffect(() => {
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])
}

// props: mappings, assets, connected, lastTriggered, ctx ({ outputConnected, audio }), onOpenOutput, onNavigate
export default function PresentationMode({ mappings, assets, connected, lastTriggered, ctx, onOpenOutput, onNavigate }) {
  const playback = usePlaybackState()
  const { output } = playback
  const toast = useToast()
  const wakeLock = useWakeLock()
  useConfirmLeave()

  const hasCustomMappings = mappings.some((m) => !isDefaultMapping(m))

  // Same path as the show keys: a synthetic global mapping through runAction.
  const panic = (e, action) => {
    e.currentTarget.blur()
    const result = runAction({ code: null, action, assetId: null }, null, { ...ctx, assets })
    if (!result.ok) toast.error(result.summary)
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="mr-auto text-3xl font-semibold text-neutral-100">Presentation</h1>
        <div className="flex flex-wrap gap-2">
          <Chip ok={connected} label="Output connected" />
          <Chip ok={connected && output.fullscreen} label="Fullscreen" />
          <Chip ok={connected && output.activated} label="Audio unlocked" />
          <Chip ok={connected && !output.sinkError} label="Output device OK" />
        </div>
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
        >
          Exit presentation
        </button>
      </header>

      {(wakeLock === 'unsupported' || wakeLock === 'denied') && (
        <div className="-mt-4 text-xs text-neutral-600">Screen may sleep</div>
      )}

      {!connected && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-red-900 bg-red-950/40 px-5 py-4">
          <span className="text-xl text-red-200">The output window is not connected.</span>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur()
              onOpenOutput()
            }}
            className="rounded-md bg-neutral-100 px-4 py-2 text-base font-medium text-neutral-900 hover:bg-white"
          >
            Open Output Window
          </button>
        </div>
      )}

      <PreShowChecklist
        connected={connected}
        output={output}
        mappings={mappings}
        assets={assets}
        hasCustomMappings={hasCustomMappings}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <NowPlaying playback={playback} connected={connected} />
        <div className="flex gap-4 lg:flex-col">
          {PANIC.map((p) => (
            <button
              key={p.action}
              type="button"
              onClick={(e) => panic(e, p.action)}
              className={`flex-1 rounded-lg border px-8 py-5 text-2xl font-semibold ${
                p.action === 'stop-all'
                  ? 'border-red-800 bg-red-950/60 text-red-100 hover:bg-red-900/60'
                  : 'border-neutral-700 bg-neutral-800 text-neutral-100 hover:bg-neutral-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {!hasCustomMappings && (
        <div className="rounded-lg border border-neutral-800 px-5 py-4 text-base text-neutral-400">
          No show keys yet besides the defaults.{' '}
          <button
            type="button"
            onClick={() => onNavigate('mappings')}
            className="text-neutral-100 underline underline-offset-4 hover:text-white"
          >
            Go to Keyboard Mappings
          </button>
        </div>
      )}

      <CheatSheet mappings={mappings} assets={assets} playback={playback} lastTriggered={lastTriggered} />
    </div>
  )
}
