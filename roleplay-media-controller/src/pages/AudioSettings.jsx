import { supportsSinkId } from '../engine/audioDevices.js'
import { CMD, sendCommand } from '../engine/commands.js'
import useOutputDevices, { detectDevices } from '../hooks/useOutputDevices.js'
import useToast from '../hooks/useToast.js'

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

const BUTTON =
  'rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50'

const DEVICE_SELECTS = [
  { key: 'controllerSinkId', label: 'Laptop speakers (this window)' },
  { key: 'outputSinkId', label: 'Output window' },
]

function DeviceSelect({ label, value, devices, onSelect }) {
  const known = value === 'default' || devices.some((d) => d.id === value)
  return (
    <label className="grid grid-cols-[12rem_1fr] items-center gap-3 text-sm text-neutral-300">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => {
          onSelect(e.target.value)
          e.currentTarget.blur() // a focused select swallows show keys
        }}
        className="min-w-0 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500"
      >
        <option value="default">System default</option>
        {!known && <option value={value}>Saved device (not currently found)</option>}
        {devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function OutputDevices({ settings, onChange, audio, outputConnected }) {
  const { devices, labelsHidden, loaded, detecting } = useOutputDevices()
  const toast = useToast()
  const supported = supportsSinkId()

  const testOutput = () => {
    if (!outputConnected) {
      toast.error('Output window is not connected')
      return
    }
    sendCommand(CMD.TEST_TONE)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="text-sm font-semibold text-neutral-100">Output devices</div>
      {!supported ? (
        <div className="text-xs text-neutral-500">This browser cannot choose audio devices. Use Chrome.</div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={BUTTON} disabled={detecting} onClick={detectDevices} onPointerUp={blurAfterPointer}>
              {detecting ? 'Detecting...' : 'Detect devices'}
            </button>
            <span className="flex-1 text-xs text-neutral-600">
              Chrome may ask for microphone permission. This is only to read the device names. Nothing is recorded.
            </span>
          </div>
          {loaded && labelsHidden && devices.length === 0 && (
            <div className="text-xs text-neutral-500">
              No devices listed yet. Press "Detect devices" and allow the permission prompt.
            </div>
          )}
          {DEVICE_SELECTS.map((d) => (
            <DeviceSelect
              key={d.key}
              label={d.label}
              value={settings[d.key]}
              devices={devices}
              onSelect={(id) => onChange({ [d.key]: id })}
            />
          ))}
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BUTTON} onClick={() => audio.playTestTone()} onPointerUp={blurAfterPointer}>
          Test laptop sound
        </button>
        <button type="button" className={BUTTON} onClick={testOutput} onPointerUp={blurAfterPointer}>
          Test output sound
        </button>
      </div>
    </div>
  )
}

const DELAY_SLIDERS = [
  { key: 'controllerDelayMs', label: 'Delay laptop audio' },
  { key: 'outputDelayMs', label: 'Delay output audio' },
]

function SyncCard({ settings, onChange, audio, outputConnected }) {
  const toast = useToast()

  const testBoth = () => {
    audio.playTestTone()
    if (outputConnected) sendCommand(CMD.TEST_TONE)
    else toast.error('Output window is not connected')
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="text-sm font-semibold text-neutral-100">Sync</div>
      {DELAY_SLIDERS.map((d) => (
        <label key={d.key} className="grid grid-cols-[9rem_1fr_4rem] items-center gap-3 text-sm text-neutral-300">
          <span>{d.label}</span>
          <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={Math.min(500, settings[d.key])}
            onChange={(e) => onChange({ [d.key]: Number(e.target.value) })}
            onPointerUp={blurAfterPointer}
            className="accent-neutral-200"
          />
          <span className="text-right font-mono text-xs text-neutral-500">{settings[d.key]} ms</span>
        </label>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={BUTTON} onClick={testBoth} onPointerUp={blurAfterPointer}>
          Test both together
        </button>
        <span className="flex-1 text-xs text-neutral-600">
          If the output device (Bluetooth, TV over HDMI) is slower, delay the laptop audio until the two beeps line up.
        </span>
      </div>
    </div>
  )
}

export default function AudioSettings({ settings, onChange, audio, outputConnected }) {
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
          Pick a different device for each window so the sound does not double up. If both use the same speakers, untick
          one box above.
        </div>
      </div>

      <OutputDevices settings={settings} onChange={onChange} audio={audio} outputConnected={outputConnected} />

      <SyncCard settings={settings} onChange={onChange} audio={audio} outputConnected={outputConnected} />
    </div>
  )
}
