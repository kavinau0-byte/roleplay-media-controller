import { useEffect, useRef, useSyncExternalStore } from 'react'
import { createAudioEngine } from '../engine/AudioEngine.js'
import { loadAudioSettings } from '../engine/audioSettings.js'
import { CMD, EVENT, sendCommand } from '../engine/commands.js'
import { playbackState } from '../engine/playbackState.js'
import { MSG, subscribe } from '../engine/WindowCommunication.js'
import useToast from './useToast.js'

// Module-level so StrictMode (double render/effects) never creates a second engine.
let controllerAudio = null
let errorSink = () => {}
let knownAssets = []

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

export function usePlaybackState() {
  return useSyncExternalStore(playbackState.subscribe, playbackState.getSnapshot)
}

// Call once in App. Owns the controller audio engine and the output event wiring.
export default function usePlayback(assets, mappings) {
  const audio = getControllerAudio()
  const toast = useToast()
  const preloadRef = useRef([])

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
          else if (name === EVENT.VIDEO_ENDED) {
            // Only clear if no newer video was started meanwhile.
            playbackState.set((s) => (s.video && s.video.seq === seq ? { video: null } : null))
          }
        } else if (msg?.type === MSG.HELLO) {
          // Output opened or reloaded: its screen is black and it needs settings + preload.
          playbackState.set({ video: null, image: null })
          sendCommand(CMD.SETTINGS, { settings: loadAudioSettings() })
          sendCommand(CMD.PRELOAD, { assets: preloadRef.current })
        }
      }),
    [],
  )

  useEffect(() => {
    const list = mappedAssets(mappings, assets)
    preloadRef.current = list
    try {
      audio.preload(list.filter((a) => a.type === 'audio').map((a) => a.id))
      sendCommand(CMD.PRELOAD, { assets: list })
    } catch {
      // best effort
    }
  }, [mappings, assets, audio])

  return { audio }
}
