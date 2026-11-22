import { useEffect, useSyncExternalStore } from 'react'
import { listOutputDevices } from '../engine/audioDevices.js'

// Shared (module-level) list of audio output devices for the controller window.
// { devices: [{ id, label }], labelsHidden, loaded, detected, detecting }
let state = { devices: [], labelsHidden: true, loaded: false, detected: false, detecting: false }
const listeners = new Set()
let silentLoadStarted = false

function setState(patch) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

const store = {
  subscribe: (l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  getSnapshot: () => state,
}

async function load(askPermission) {
  const { devices, labelsHidden } = await listOutputDevices({ askPermission })
  setState({ devices, labelsHidden, loaded: true })
}

// Must be called from a user gesture (it may show Chrome's microphone prompt).
export async function detectDevices() {
  if (state.detecting) return
  setState({ detecting: true })
  try {
    await load(true)
  } finally {
    setState({ detecting: false, detected: true })
  }
}

// Readable name for a saved sink id, using the device list if it was loaded.
export function deviceName(id, devices) {
  if (!id || id === 'default') return 'System default'
  const found = devices.find((d) => d.id === id)
  if (found) return found.label
  return id.length > 12 ? `${id.slice(0, 12)}…` : id
}

export default function useOutputDevices() {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)

  // Silent first read (no permission prompt): shows names if Chrome already allows it.
  useEffect(() => {
    if (silentLoadStarted) return
    silentLoadStarted = true
    load(false)
  }, [])

  // Keep the list fresh when devices are plugged in or removed, but only after Detect.
  useEffect(() => {
    const md = navigator.mediaDevices
    if (!snapshot.detected || !md?.addEventListener) return
    const onChange = () => load(false)
    md.addEventListener('devicechange', onChange)
    return () => md.removeEventListener('devicechange', onChange)
  }, [snapshot.detected])

  return snapshot
}
