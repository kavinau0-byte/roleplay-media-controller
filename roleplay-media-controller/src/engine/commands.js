// Playback protocol. The controller decides; the output executes explicit commands
// (never "toggle"). Payloads carry asset IDs only, never blobs.
import { MSG, send } from './WindowCommunication.js'

// Controller -> output (sent as MSG.CMD, payload { name, ...args }).
export const CMD = Object.freeze({
  SHOW_VIDEO: 'SHOW_VIDEO', // { assetId, seq }  (seq is echoed back in VIDEO_ENDED)
  SHOW_IMAGE: 'SHOW_IMAGE', // { assetId }
  CLEAR_DISPLAY: 'CLEAR_DISPLAY',
  MUSIC_START: 'MUSIC_START', // { assetId }
  MUSIC_STOP: 'MUSIC_STOP',
  MUSIC_PAUSE: 'MUSIC_PAUSE',
  MUSIC_RESUME: 'MUSIC_RESUME',
  SFX_PLAY: 'SFX_PLAY', // { assetId }
  SFX_STOP: 'SFX_STOP',
  STOP_ALL: 'STOP_ALL',
  SETTINGS: 'SETTINGS', // { settings }
  PRELOAD: 'PRELOAD', // { assets: [{ id, type }] }
})

// Output -> controller (sent as MSG.EVENT, payload { name, ...args }).
export const EVENT = Object.freeze({
  VIDEO_ENDED: 'VIDEO_ENDED', // { assetId, seq }
  ERROR: 'ERROR', // { message }
})

export function sendCommand(name, args = {}) {
  send(MSG.CMD, { ...args, name })
}

export function sendEvent(name, args = {}) {
  send(MSG.EVENT, { ...args, name })
}
