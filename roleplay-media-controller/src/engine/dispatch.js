// Executes a mapped action. The controller is the brain: it updates its own audio
// engine and sends explicit commands to the output window.
import { getAction } from './actions.js'
import { CMD, sendCommand } from './commands.js'
import { playbackState } from './playbackState.js'

const NOT_CONNECTED = Object.freeze({ ok: false, summary: 'Output window is not connected' })
let videoSeq = 0

const ok = (summary) => ({ ok: true, summary })

// ctx: { outputConnected, audio (controller AudioEngine), assets }
export function runAction(mapping, asset, ctx) {
  const action = getAction(mapping?.action)
  if (!action) return { ok: false, summary: 'Unknown action' }
  if (action.assetType !== null && !asset) return { ok: false, summary: 'Missing asset' }
  const { outputConnected, audio } = ctx
  const label = asset ? `${action.label}: ${asset.name}` : action.label

  switch (action.id) {
    case 'play-video': {
      if (!outputConnected) return NOT_CONNECTED
      const seq = ++videoSeq // repeat press restarts; seq tells VIDEO_ENDED events apart
      sendCommand(CMD.SHOW_VIDEO, { assetId: asset.id, seq })
      playbackState.set({ video: { assetId: asset.id, name: asset.name, seq } })
      return ok(label)
    }
    case 'show-image':
      if (!outputConnected) return NOT_CONNECTED
      sendCommand(CMD.SHOW_IMAGE, { assetId: asset.id })
      playbackState.set({ image: { assetId: asset.id, name: asset.name }, video: null })
      return ok(label)
    case 'clear-display':
      if (!outputConnected) return NOT_CONNECTED
      sendCommand(CMD.CLEAR_DISPLAY)
      playbackState.set({ video: null, image: null })
      return ok(label)

    // Audio works even without the output window (local audio only).
    case 'play-music':
      if (audio.getState().music?.assetId === asset.id) {
        audio.musicStop()
        sendCommand(CMD.MUSIC_STOP)
        return ok(`Stop music: ${asset.name}`)
      }
      audio.musicStart(asset.id)
      sendCommand(CMD.MUSIC_START, { assetId: asset.id })
      return ok(label)
    case 'play-sfx':
      audio.sfxPlay(asset.id)
      sendCommand(CMD.SFX_PLAY, { assetId: asset.id })
      return ok(label)
    case 'stop-music':
      audio.musicStop()
      sendCommand(CMD.MUSIC_STOP)
      return ok(label)
    case 'pause-music':
      audio.musicPause()
      sendCommand(CMD.MUSIC_PAUSE)
      return ok(label)
    case 'resume-music':
      audio.musicResume()
      sendCommand(CMD.MUSIC_RESUME)
      return ok(label)
    case 'stop-sfx':
      audio.sfxStop()
      sendCommand(CMD.SFX_STOP)
      return ok(label)
    case 'stop-all':
      audio.stopAll()
      sendCommand(CMD.STOP_ALL)
      playbackState.set({ video: null, image: null })
      return ok(label)
    default:
      return { ok: false, summary: 'Unknown action' }
  }
}
