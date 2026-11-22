// Controller-side "now playing" store, usable with useSyncExternalStore.
// { video: null | { assetId, name, seq }, image: null | { assetId, name },
//   music: null | { assetId, name, paused }, sfxCount }
const INITIAL = Object.freeze({ video: null, image: null, music: null, sfxCount: 0 })

let state = INITIAL
const listeners = new Set()

export const playbackState = {
  getSnapshot: () => state,
  subscribe: (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  // patch: object, or (state) => object. Merged shallowly.
  set: (patch) => {
    const changes = typeof patch === 'function' ? patch(state) : patch
    if (!changes || Object.keys(changes).length === 0) return
    state = { ...state, ...changes }
    listeners.forEach((l) => l())
  },
}
