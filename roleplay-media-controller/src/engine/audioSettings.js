// Audio settings shared by both windows (same origin, same localStorage).
const STORAGE_KEY = 'rmc.audio.v1'

export const DEFAULT_AUDIO_SETTINGS = Object.freeze({
  master: 1,
  music: 0.8,
  sfx: 1,
  video: 1,
  controllerAudio: true,
  outputAudio: true,
  controllerSinkId: 'default', // audio output device for this (controller) window
  outputSinkId: 'default', // audio output device for the output window (music, sfx and video sound)
  controllerDelayMs: 0, // sync delay before music/sfx/test tone start in the controller window
  outputDelayMs: 0, // same for the output window (never applied to video)
})

const VOLUME_KEYS = ['master', 'music', 'sfx', 'video']
const FLAG_KEYS = ['controllerAudio', 'outputAudio']
const SINK_KEYS = ['controllerSinkId', 'outputSinkId']
const DELAY_KEYS = ['controllerDelayMs', 'outputDelayMs']
const MAX_DELAY_MS = 1000

function clamp01(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback
}

// Returns a complete, valid settings object from anything.
export function normalizeAudioSettings(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = { ...DEFAULT_AUDIO_SETTINGS }
  for (const k of VOLUME_KEYS) out[k] = clamp01(src[k], DEFAULT_AUDIO_SETTINGS[k])
  for (const k of FLAG_KEYS) out[k] = typeof src[k] === 'boolean' ? src[k] : DEFAULT_AUDIO_SETTINGS[k]
  for (const k of SINK_KEYS) out[k] = typeof src[k] === 'string' && src[k].trim() ? src[k] : 'default'
  for (const k of DELAY_KEYS) {
    const n = Number(src[k])
    out[k] = Number.isFinite(n) ? Math.round(Math.min(MAX_DELAY_MS, Math.max(0, n))) : 0
  }
  return out
}

export function loadAudioSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return normalizeAudioSettings(raw === null ? null : JSON.parse(raw))
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS }
  }
}

export function saveAudioSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeAudioSettings(settings)))
  } catch {
    // storage blocked or full: settings still apply for this session
  }
}

// channel: 'music' | 'sfx' | 'video'
export function effectiveVolume(settings, channel) {
  return clamp01(settings.master * settings[channel], 1)
}
