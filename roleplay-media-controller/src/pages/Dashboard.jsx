import StatusIndicator from '../components/StatusIndicator.jsx'

const STEPS = [
  'Click "Open Output Window".',
  'Drag that window onto the projector screen.',
  'Click once inside it (or press F) to go fullscreen and unlock audio.',
  'Click back on this controller window and start the show.',
]

export default function Dashboard({ connected, counts, shortcutCount, onOpenOutput }) {
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
        <ol className="mt-4 flex flex-col gap-2 text-sm text-neutral-300">
          {STEPS.map((step, i) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neutral-700 text-xs text-neutral-400">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
