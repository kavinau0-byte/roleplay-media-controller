// Action definitions shared by the UI and the engine.
// assetType: which asset type the action plays, or null for global actions.

export const ACTIONS = [
  { id: 'play-video', label: 'Play video', assetType: 'video' },
  { id: 'show-image', label: 'Show image', assetType: 'image' },
  { id: 'play-music', label: 'Play music', assetType: 'audio' }, // loops; press again to stop
  { id: 'play-sfx', label: 'Play sound effect', assetType: 'audio' }, // one-shot; restarts on repeat press
  { id: 'clear-display', label: 'Clear display', assetType: null },
  { id: 'stop-all', label: 'Stop all', assetType: null },
  { id: 'stop-music', label: 'Stop music', assetType: null },
  { id: 'pause-music', label: 'Pause music', assetType: null },
  { id: 'resume-music', label: 'Resume music', assetType: null },
  { id: 'stop-sfx', label: 'Stop sound effects', assetType: null },
]

const BY_ID = new Map(ACTIONS.map((a) => [a.id, a]))

export const ASSET_ACTIONS = ACTIONS.filter((a) => a.assetType !== null)
export const GLOBAL_ACTIONS = ACTIONS.filter((a) => a.assetType === null)

export function getAction(id) {
  return BY_ID.get(id) ?? null
}

export function isKnownAction(id) {
  return BY_ID.has(id)
}

export function isGlobalAction(id) {
  return BY_ID.get(id)?.assetType === null
}

// The action used when assigning a key to a video or image asset.
export function defaultActionForAsset(asset) {
  if (asset.type === 'video') return 'play-video'
  if (asset.type === 'image') return 'show-image'
  return Number.isFinite(asset.duration) && asset.duration >= 30 ? 'play-music' : 'play-sfx'
}
