// Audio playback for one window (pure JS, no React). Each window creates its own instance.
// Channels: one looping music element, and one reusable element per sound effect.
// Every async step checks a token so a newer command always wins.
import { getAssetUrl } from './mediaUrls.js'
import { DEFAULT_AUDIO_SETTINGS, effectiveVolume, normalizeAudioSettings } from './audioSettings.js'

const BLOCKED_OUTPUT = 'Click once inside the output window to enable sound.'
const BLOCKED_CONTROLLER = 'The browser blocked sound in the controller window. Click anywhere in it and try again.'
const MISSING = 'Media file missing'

function disposeElement(el) {
  el.pause()
  el.removeAttribute('src')
  el.load()
}

// options: { role: 'controller' | 'output', settings?, onError?(message), getAssetName?(assetId) }
export function createAudioEngine(options = {}) {
  const role = options.role === 'output' ? 'output' : 'controller'
  let settings = normalizeAudioSettings(options.settings ?? DEFAULT_AUDIO_SETTINGS)

  let music = null // { assetId, el, paused, ready }
  let musicToken = 0
  const sfx = new Map() // assetId -> { el, token, playing, url }
  const listeners = new Set()

  const enabled = () => (role === 'output' ? settings.outputAudio : settings.controllerAudio)

  // Muted elements still play, so state and timing stay consistent if the flag changes mid-show.
  const configure = (el, channel) => {
    el.volume = effectiveVolume(settings, channel)
    el.muted = !enabled()
  }

  const report = (message) => {
    try {
      options.onError?.(message)
    } catch {
      // never throw to the caller
    }
  }

  const reportPlayError = (err, assetId) => {
    if (err?.name === 'NotAllowedError') {
      report(role === 'output' ? BLOCKED_OUTPUT : BLOCKED_CONTROLLER)
      return
    }
    let name
    try {
      name = options.getAssetName?.(assetId) ?? null
    } catch {
      name = null
    }
    report(name ? `Could not play "${name}".` : 'Could not play this audio file.')
  }

  const getState = () => {
    let sfxCount = 0
    for (const e of sfx.values()) if (e.playing) sfxCount++
    return { music: music ? { assetId: music.assetId, paused: music.paused } : null, sfxCount }
  }

  const emit = () => {
    const s = getState()
    for (const l of listeners) {
      try {
        l(s)
      } catch {
        // a broken listener must not break playback
      }
    }
  }

  // ---- music ----

  const playMusic = (entry, token) => {
    entry.el.play().catch((err) => {
      // AbortError = interrupted by our own pause/stop/src change.
      if (token !== musicToken || music !== entry || err?.name === 'AbortError') return
      musicToken++
      music = null
      disposeElement(entry.el)
      emit()
      reportPlayError(err, entry.assetId)
    })
  }

  const musicStop = () => {
    musicToken++
    if (!music) return
    const entry = music
    music = null
    disposeElement(entry.el)
    emit()
  }

  const musicStart = (assetId) => {
    musicStop()
    const token = musicToken
    const el = new Audio()
    el.loop = true
    el.preload = 'auto'
    configure(el, 'music')
    const entry = { assetId, el, paused: false, ready: false }
    music = entry
    el.addEventListener('play', () => {
      if (music === entry && entry.paused) {
        entry.paused = false
        emit()
      }
    })
    el.addEventListener('pause', () => {
      if (music === entry && entry.ready && !entry.paused) {
        entry.paused = true
        emit()
      }
    })
    emit()

    getAssetUrl(assetId).then((url) => {
      if (token !== musicToken || music !== entry) return
      if (!url) {
        musicStop()
        report(MISSING)
        return
      }
      el.src = url
      entry.ready = true
      if (!entry.paused) playMusic(entry, token)
    })
  }

  const musicPause = () => {
    if (!music || music.paused) return
    music.paused = true
    if (music.ready) music.el.pause()
    emit()
  }

  const musicResume = () => {
    if (!music || !music.paused) return
    music.paused = false
    if (music.ready) playMusic(music, musicToken)
    emit()
  }

  // ---- sound effects ----

  const sfxEntry = (assetId) => {
    let entry = sfx.get(assetId)
    if (entry) return entry
    const el = new Audio()
    el.preload = 'auto'
    configure(el, 'sfx')
    entry = { el, token: 0, playing: false, url: null }
    const set = (playing) => {
      if (entry.playing === playing) return
      entry.playing = playing
      emit()
    }
    el.addEventListener('play', () => set(true))
    el.addEventListener('pause', () => set(false))
    el.addEventListener('ended', () => set(false))
    sfx.set(assetId, entry)
    return entry
  }

  const sfxPlay = (assetId) => {
    const entry = sfxEntry(assetId)
    const token = ++entry.token
    if (!entry.playing) {
      entry.playing = true
      emit()
    }
    getAssetUrl(assetId).then((url) => {
      if (token !== entry.token) return
      if (!url) {
        entry.playing = false
        emit()
        report(MISSING)
        return
      }
      if (entry.url !== url) {
        entry.el.src = url
        entry.url = url
      }
      entry.el.currentTime = 0
      entry.el.play().catch((err) => {
        if (token !== entry.token || err?.name === 'AbortError') return
        entry.playing = false
        emit()
        reportPlayError(err, assetId)
      })
    })
  }

  const sfxStop = () => {
    let changed = false
    for (const entry of sfx.values()) {
      entry.token++
      entry.el.pause()
      if (entry.playing) {
        entry.playing = false
        changed = true
      }
    }
    if (changed) emit()
  }

  // ---- shared ----

  const stopAll = () => {
    musicStop()
    sfxStop()
  }

  const applySettings = (next) => {
    settings = normalizeAudioSettings(next)
    if (music) configure(music.el, 'music')
    for (const entry of sfx.values()) configure(entry.el, 'sfx')
  }

  // Best effort: warms the object URL cache so the first press starts quickly.
  const preload = (assetIds) => {
    for (const id of assetIds ?? []) getAssetUrl(id)
  }

  const subscribe = (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return {
    musicStart,
    musicStop,
    musicPause,
    musicResume,
    sfxPlay,
    sfxStop,
    stopAll,
    applySettings,
    preload,
    getState,
    subscribe,
  }
}
