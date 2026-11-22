// Audio playback for one window (pure JS, no React). Each window creates its own instance.
// Channels: one looping music element, and one reusable element per sound effect.
// Every async step checks a token so a newer command always wins.
// Every element is routed to this window's output device BEFORE its first play().
import { getAssetUrl } from './mediaUrls.js'
import { DEFAULT_AUDIO_SETTINGS, effectiveVolume, normalizeAudioSettings } from './audioSettings.js'
import { applySink, makeTestToneUrl } from './audioDevices.js'

const BLOCKED_OUTPUT = 'Click once inside the output window to enable sound.'
const BLOCKED_CONTROLLER = 'The browser blocked sound in the controller window. Click anywhere in it and try again.'
const MISSING = 'Media file missing'
const DEVICE_MISSING = 'Audio device not available. Using the system default instead.'

function disposeElement(el) {
  el.pause()
  el.removeAttribute('src')
  el.load()
}

// options: { role: 'controller' | 'output', settings?, onError?(message), getAssetName?(assetId),
//            onSinkStatus?(failed: boolean) (called when the device status flips) }
export function createAudioEngine(options = {}) {
  const role = options.role === 'output' ? 'output' : 'controller'
  let settings = normalizeAudioSettings(options.settings ?? DEFAULT_AUDIO_SETTINGS)

  let music = null // { assetId, el, paused, ready, sinkReady }
  let musicToken = 0
  const sfx = new Map() // assetId -> { el, token, playing, url, sinkReady }
  const listeners = new Set()
  let test = null // { el, sinkReady }
  let testToken = 0

  const enabled = () => (role === 'output' ? settings.outputAudio : settings.controllerAudio)
  const sinkId = () => (role === 'output' ? settings.outputSinkId : settings.controllerSinkId)

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

  // ---- output device ----

  let sinkFailed = false
  const reportedSinks = new Set() // failing sink ids already reported (one toast each)

  const setSinkFailed = (failed) => {
    if (sinkFailed === failed) return
    sinkFailed = failed
    try {
      options.onSinkStatus?.(failed)
    } catch {
      // ignore
    }
  }

  // Routes an element to this window's device. Resolves when it is safe to play(). Never rejects.
  const route = (el) => {
    const wanted = sinkId()
    return applySink(el, wanted)
      .then(async (res) => {
        const isCurrent = wanted === sinkId()
        if (res.ok) {
          reportedSinks.delete(wanted)
          if (isCurrent) setSinkFailed(false)
          return
        }
        if (isCurrent) setSinkFailed(true)
        if (!reportedSinks.has(wanted)) {
          reportedSinks.add(wanted)
          report(DEVICE_MISSING)
        }
        await applySink(el, 'default')
      })
      .catch(() => {})
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

  // position (seconds): where to start, e.g. when a reopened output joins a running song.
  const musicStart = (assetId, position = 0) => {
    musicStop()
    const token = musicToken
    const el = new Audio()
    el.loop = true
    el.preload = 'auto'
    configure(el, 'music')
    const entry = { assetId, el, paused: false, ready: false, sinkReady: route(el) }
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

    const seekTo = Number(position)
    Promise.all([getAssetUrl(assetId), entry.sinkReady]).then(([url]) => {
      if (token !== musicToken || music !== entry) return
      if (!url) {
        musicStop()
        report(MISSING)
        return
      }
      if (Number.isFinite(seekTo) && seekTo > 0) {
        const onMeta = () => {
          el.removeEventListener('error', onFail)
          if (token !== musicToken || music !== entry) return
          const d = el.duration
          el.currentTime = Number.isFinite(d) && d > 0 ? seekTo % d : seekTo
          entry.ready = true
          if (!entry.paused) playMusic(entry, token)
        }
        const onFail = () => {
          el.removeEventListener('loadedmetadata', onMeta)
          if (token !== musicToken || music !== entry) return
          musicStop()
          reportPlayError(null, assetId)
        }
        el.addEventListener('loadedmetadata', onMeta, { once: true })
        el.addEventListener('error', onFail, { once: true })
        el.src = url
        return
      }
      el.src = url
      entry.ready = true
      if (!entry.paused) playMusic(entry, token)
    })
  }

  const getMusicPosition = () => (music?.ready ? music.el.currentTime || 0 : 0)

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
    entry = { el, token: 0, playing: false, url: null, sinkReady: route(el) }
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
    Promise.all([getAssetUrl(assetId), entry.sinkReady]).then(([url]) => {
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
    const prevSink = sinkId()
    settings = normalizeAudioSettings(next)
    if (music) configure(music.el, 'music')
    for (const entry of sfx.values()) configure(entry.el, 'sfx')
    if (test) test.el.volume = settings.master
    if (sinkId() !== prevSink) {
      if (music) music.sinkReady = route(music.el)
      for (const entry of sfx.values()) entry.sinkReady = route(entry.el)
      if (test) test.sinkReady = route(test.el)
    }
  }

  // Device test: plays on this window's device even when its audio is switched off, at master volume.
  const playTestTone = () => {
    if (!test) {
      const el = new Audio()
      el.preload = 'auto'
      test = { el, sinkReady: route(el) }
    }
    const entry = test
    const token = ++testToken
    entry.el.pause()
    entry.sinkReady.then(() => {
      if (token !== testToken) return
      const url = makeTestToneUrl()
      if (entry.el.getAttribute('src') !== url) entry.el.src = url
      entry.el.muted = false
      entry.el.volume = settings.master
      entry.el.currentTime = 0
      entry.el.play().catch((err) => {
        if (token !== testToken || err?.name === 'AbortError') return
        if (err?.name === 'NotAllowedError') report(role === 'output' ? BLOCKED_OUTPUT : BLOCKED_CONTROLLER)
        else report('Could not play the test sound.')
      })
    })
  }

  // For elements the engine does not own (the output window's <video>).
  const routeElement = (el) => route(el)

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
    getMusicPosition,
    playTestTone,
    routeElement,
    getSinkError: () => sinkFailed,
    preload,
    getState,
    subscribe,
  }
}
