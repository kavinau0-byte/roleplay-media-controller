// Audio output device helpers (Chrome setSinkId). Pure JS, never throws.

const DEFAULT_IDS = new Set(['', 'default'])
const currentSink = new WeakMap() // element -> sink id it is on ('' = system default)
const pending = new WeakMap() // element -> last queued applySink promise (keeps calls in order)

export function supportsSinkId() {
  return typeof HTMLMediaElement !== 'undefined' && typeof HTMLMediaElement.prototype.setSinkId === 'function'
}

const toSinkArg = (sinkId) => (DEFAULT_IDS.has(sinkId ?? '') ? '' : sinkId)

// Routes a media element to a device. 'default' and '' mean the system default.
// Resolves { ok: true } or { ok: false, error }. Calls on the same element run in order.
export function applySink(el, sinkId) {
  const target = toSinkArg(sinkId)
  if (!el) return Promise.resolve({ ok: false, error: 'No media element' })
  // Without setSinkId everything plays on the system default; nothing else can be done.
  if (!supportsSinkId()) return Promise.resolve({ ok: true })

  const run = async () => {
    if ((currentSink.get(el) ?? '') === target) return { ok: true }
    try {
      await el.setSinkId(target)
      currentSink.set(el, target)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err?.message || err?.name || 'setSinkId failed' }
    }
  }
  const next = (pending.get(el) ?? Promise.resolve()).then(run, run)
  pending.set(el, next)
  return next
}

// Lists audio output devices. With askPermission, briefly opens the microphone only so
// Chrome reveals device names; the stream is stopped immediately and nothing is recorded.
// Resolves { devices: [{ id, label }], labelsHidden }.
export async function listOutputDevices({ askPermission = false } = {}) {
  const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : null
  if (!md?.enumerateDevices) return { devices: [], labelsHidden: true }

  if (askPermission && md.getUserMedia) {
    try {
      const stream = await md.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch {
      // permission denied or no microphone: labels may stay hidden
    }
  }

  try {
    const all = await md.enumerateDevices()
    const outputs = all.filter((d) => d.kind === 'audiooutput')
    const labelsHidden = outputs.length === 0 || outputs.some((d) => !d.label || !d.deviceId)
    const seen = new Set()
    const devices = []
    for (const d of outputs) {
      // '' = no permission yet (unusable id); 'default' is covered by our "System default" option.
      if (!d.deviceId || d.deviceId === 'default' || seen.has(d.deviceId)) continue
      seen.add(d.deviceId)
      devices.push({ id: d.deviceId, label: d.label || `Audio output ${devices.length + 1}` })
    }
    return { devices, labelsHidden }
  } catch {
    return { devices: [], labelsHidden: true }
  }
}

// ---- test tone ----

let toneUrl = null

// 0.7 s, 440 Hz sine, amplitude 0.3, 30 ms fade in/out, 16-bit mono WAV. Cached object URL.
export function makeTestToneUrl() {
  if (toneUrl) return toneUrl
  const rate = 44100
  const samples = Math.round(rate * 0.7)
  const fade = Math.round(rate * 0.03)
  const buffer = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(buffer)
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true) // fmt chunk size
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeStr(36, 'data')
  view.setUint32(40, samples * 2, true)
  for (let i = 0; i < samples; i++) {
    const env = Math.min(1, i / fade, (samples - 1 - i) / fade)
    const v = Math.sin((2 * Math.PI * 440 * i) / rate) * 0.3 * env
    view.setInt16(44 + i * 2, Math.round(v * 32767), true)
  }
  toneUrl = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
  return toneUrl
}
