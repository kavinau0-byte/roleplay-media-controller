import StatusIndicator from '../components/StatusIndicator.jsx'
import { usePlaybackState } from '../hooks/usePlayback.js'
import useOutputDevices, { deviceName } from '../hooks/useOutputDevices.js'

function NowPlaying({ connected }) {
  const { video, image, music, sfxCount } = usePlaybackState()
  const screen = !connected
    ? 'Output not connected'
    : video
      ? `Video: ${video.name}`
      : image
        ? `Image: ${image.name}`
        : 'Black'
  const rows = [
    { label: 'Screen', value: screen, muted: !connected },
    { label: 'Music', value: music ? `${music.name} (${music.paused ? 'Paused' : 'Playing'})` : 'None' },
    { label: 'Sound effects', value: sfxCount > 0 ? `${sfxCount} playing` : 'None' },
  ]
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
      <h2 className="text-sm font-semibold text-neutral-100">Now playing</h2>
      <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="contents">
            <dt className="text-neutral-500">{r.label}</dt>
            <dd className={`truncate ${r.muted ? 'text-red-400/70' : 'text-neutral-200'}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const STEPS = [
  'Click "Open Output Window".',
  'Drag that window onto the projector screen.',
  'Click once inside it (or press F) to go fullscreen and unlock audio.',
  'Click back on this controller window and start the show.',
]

function CheckRow({ ok, label }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`w-4 text-center font-semibold ${ok ? 'text-green-500' : 'text-red-500'}`}>{ok ? '✓' : '✗'}</span>
      <span className={ok ? 'text-neutral-200' : 'text-neutral-400'}>{label}</span>
    </li>
  )
}

function PreShowChecks({ connected, settings }) {
  const { output } = usePlaybackState()
  const { devices } = useOutputDevices()
  const checks = [
    { label: 'Output window connected', ok: connected },
    { label: 'Output is fullscreen', ok: connected && output.fullscreen },
    { label: 'Audio unlocked (clicked inside the output)', ok: connected && output.activated },
    { label: 'Output audio device OK', ok: connected && !output.sinkError },
  ]
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Pre-show checks</h3>
      <ul className="mt-2 flex flex-col gap-1.5 text-sm">
        {checks.map((c) => (
          <CheckRow key={c.label} ok={c.ok} label={c.label} />
        ))}
      </ul>
      <div className="mt-2 truncate text-xs text-neutral-600">
        Laptop: {deviceName(settings.controllerSinkId, devices)}, Output: {deviceName(settings.outputSinkId, devices)}
      </div>
    </div>
  )
}

export default function Dashboard({ connected, counts, shortcutCount, settings, onOpenOutput }) {
  const stats = [
    { label: 'Videos', value: counts.video },
    { label: 'Images', value: counts.image },
    { label: 'Audio files', value: counts.audio },
    { label: 'Shortcuts', value: shortcutCount },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-neutral-100">Dashboard</h1>
        <StatusIndicator connected={connected} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="text-xs uppercase tracking-wide text-neutral-500">{stat.label}</div>
            <div className="mt-1 text-2xl font-semibold text-neutral-100">{stat.value}</div>
          </div>
        ))}
      </div>

      <NowPlaying connected={connected} />

      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-neutral-100">Pre-show setup</h2>
          <button
            type="button"
            onClick={onOpenOutput}
            className="rounded-md border border-neutral-700 bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            Open Output Window
          </button>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <ol className="flex flex-col gap-2 text-sm text-neutral-300">
            {STEPS.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-700 text-xs text-neutral-400">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <PreShowChecks connected={connected} settings={settings} />
        </div>
      </div>
    </div>
  )
}
