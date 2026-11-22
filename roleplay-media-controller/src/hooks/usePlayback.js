import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createAudioEngine } from '../engine/AudioEngine.js'
import { loadAudioSettings } from '../engine/audioSettings.js'
import { CMD, EVENT, sendCommand } from '../engine/commands.js'
import { OUTPUT_UNKNOWN, playbackState } from '../engine/playbackState.js'
import { MSG, subscribe } from '../engine/WindowCommunication.js'
import useToast from './useToast.js'

// Module-level so StrictMode (double render/effects) never creates a second engine.
let controllerAudio = null
let errorSink = () => {}
let knownAssets = []

const DISCONNECTED = 'Output window disconnected. Reopen it from the Dashboard; the screen and music will be restored.'
// A reload of the output (F5) disconnects for a moment; only warn if it stays away this long.
const DISCONNECT_GRACE_MS = 1500

const assetName = (id) => knownAssets.find((a) => a.id === id)?.name ?? null

function getControllerAudio() {
  if (!controllerAudio) {
    controllerAudio = createAudioEngine({
      role: 'controller',
      settings: loadAudioSettings(),
      onError: (message) => errorSink(message),
      getAssetName: assetName,
    })
  }
  return controllerAudio
}

function mappedAssets(mappings, assets) {
  const ids = new Set(mappings.filter((m) => m.assetId).map((m) => m.assetId))
  return assets.filter((a) => ids.has(a.id)).map((a) => ({ id: a.id, type: a.type }))
}

// Asset ids mapped to play-sfx (and still in the library): their elements are pre-warmed.
function sfxAssetIds(mappings, assets) {
  const existing = new Set(assets.map((a) => a.id))
  return mappings.filter((m) => m.action === 'play-sfx' && existing.has(m.assetId)).map((m) => m.assetId)
}

export function usePlaybackState() {
  return useSyncExternalStore(playbackState.subscribe, playbackState.getSnapshot)
}

// Output opened or reloaded: its screen is black and its audio is silent. Restore it.
function restoreOutput(audio, preload) {
  sendCommand(CMD.SETTINGS, { settings: loadAudioSettings() })
  sendCommand(CMD.PRELOAD, preload)
  playbackState.set({ video: null })
  const { image } = playbackState.getSnapshot()
  if (image) sendCommand(CMD.SHOW_IMAGE, { assetId: image.assetId })
  const music = audio.getState().music
  if (music && !music.paused) {
    sendCommand(CMD.MUSIC_START, { assetId: music.assetId, position: audio.getMusicPosition() })
  }
  sendCommand(CMD.STATUS_REQUEST)
}

// Call once in App. Owns the controller audio engine and the output event wiring.
export default function usePlayback(assets, mappings, connected) {
  const audio = getControllerAudio()
  const toast = useToast()
  const preloadRef = useRef({ assets: [], sfx: [] }) // last CMD.PRELOAD payload
  const wasConnectedRef = useRef(false)

  useEffect(() => {
    errorSink = (message) => toast.error(message)
  }, [toast])

  useEffect(() => {
    knownAssets = assets
  }, [assets])

  // Mirror the engine's music/sfx state into the playback store.
  useEffect(() => {
    const mirror = (s) =>
      playbackState.set({
        music: s.music ? { assetId: s.music.assetId, name: assetName(s.music.assetId) ?? 'Unknown', paused: s.music.paused } : null,
        sfxCount: s.sfxCount,
      })
    mirror(audio.getState())
    return audio.subscribe(mirror)
  }, [audio])

  useEffect(
    () =>
      subscribe((msg) => {
        if (msg?.type === MSG.EVENT) {
          const { name, message, seq } = msg.payload ?? {}
          if (name === EVENT.ERROR) errorSink(message || 'Playback error in the output window.')
          else if (name === EVENT.STATUS) {
            const p = msg.payload
            playbackState.set({
              output: { fullscreen: p.fullscreen === true, activated: p.activated === true, sinkError: p.sinkError === true },
            })
          }
          else if (name === EVENT.VIDEO_ENDED) {
            // Only clear if no newer video was started meanwhile.
            playbackState.set((s) => (s.video && s.video.seq === seq ? { video: null } : null))
          }
        } else if (msg?.type === MSG.HELLO) {
          restoreOutput(getControllerAudio(), preloadRef.current)
        }
      }),
    [],
  )

  // Ask an already-open output for its status when the controller starts (e.g. after F5 here).
  useEffect(() => {
    sendCommand(CMD.STATUS_REQUEST)
  }, [])

  // Connection flips: re-query on connect; reset status and warn (once) on disconnect.
  useEffect(() => {
    const was = wasConnectedRef.current
    wasConnectedRef.current = connected
    if (connected && !was) {
      sendCommand(CMD.STATUS_REQUEST)
      return
    }
    if (!connected && was) {
      playbackState.set({ output: OUTPUT_UNKNOWN })
      const timer = setTimeout(() => errorSink(DISCONNECTED), DISCONNECT_GRACE_MS)
      return () => clearTimeout(timer)
    }
  }, [connected])

  useEffect(() => {
    const list = mappedAssets(mappings, assets)
    const sfx = sfxAssetIds(mappings, assets)
    preloadRef.current = { assets: list, sfx }
    try {
      audio.preload(list.filter((a) => a.type === 'audio').map((a) => a.id))
      for (const id of sfx) audio.warmSfx(id)
      sendCommand(CMD.PRELOAD, { assets: list, sfx })
    } catch {
      // best effort
    }
  }, [mappings, assets, audio])

  return { audio }
}
