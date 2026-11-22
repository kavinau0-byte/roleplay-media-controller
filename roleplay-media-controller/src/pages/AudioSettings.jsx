const SLIDERS = [
  { key: 'master', label: 'Master' },
  { key: 'music', label: 'Music' },
  { key: 'sfx', label: 'Sound effects' },
  { key: 'video', label: 'Video' },
]

const FLAGS = [
  { key: 'controllerAudio', label: 'Play audio on this laptop (controller window)' },
  { key: 'outputAudio', label: 'Play audio on the output window' },
]

// Drop focus after mouse use so show keys work right away (inputs swallow show keys).
const blurAfterPointer = (e) => e.currentTarget.blur()

export default function AudioSettings({ settings, onChange }) {
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <h1 className="text-xl font-semibold text-neutral-100">Audio Settings</h1>

      <div className="flex flex-col gap-4 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="text-sm font-semibold text-neutral-100">Volume</div>
        {SLIDERS.map((s) => {
          const pct = Math.round(settings[s.key] * 100)
          return (
            <label key={s.key} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm text-neutral-300">
              <span>{s.label}</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={pct}
                onChange={(e) => onChange({ [s.key]: Number(e.target.value) / 100 })}
                onPointerUp={blurAfterPointer}
                className="accent-neutral-200"
              />
              <span className="text-right font-mono text-xs text-neutral-500">{pct}%</span>
            </label>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="text-sm font-semibold text-neutral-100">Where audio plays</div>
        {FLAGS.map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={settings[f.key]}
              onChange={(e) => onChange({ [f.key]: e.target.checked })}
              onPointerUp={blurAfterPointer}
              className="accent-neutral-200"
            />
            {f.label}
          </label>
        ))}
        <div className="text-xs text-neutral-600">
          Choosing a separate output device for each window comes in Phase 5. Until then, untick one of the two boxes if
          both windows use the same speakers and the sound doubles up.
        </div>
      </div>
    </div>
  )
}
