// Pure keyboard logic (no React).
import { getAction } from './actions.js'

export function resolveMapping(code, mappings) {
  return mappings.find((m) => m.code === code) ?? null
}

function isTypingTarget(target) {
  if (!target || typeof target !== 'object') return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true
}

export function shouldIgnoreEvent(event) {
  if (event.repeat) return true
  if (event.ctrlKey || event.metaKey || event.altKey) return true
  return isTypingTarget(event.target)
}

// Suspension is a counter so independent callers (preview modal, key capture)
// can overlap safely. Each release() decrements at most once.
let suspendCount = 0

export function suspendKeyboard() {
  suspendCount += 1
  let released = false
  return function release() {
    if (released) return
    released = true
    suspendCount = Math.max(0, suspendCount - 1)
  }
}

export function isKeyboardSuspended() {
  return suspendCount > 0
}

// Readable description, e.g. "Play video: Jake intro" or "Clear display".
export function describeAction(mapping, assets) {
  const action = getAction(mapping?.action)
  if (!action) return 'Unknown action'
  if (action.assetType === null) return action.label
  const asset = assets.find((a) => a.id === mapping.assetId)
  if (!asset) return 'Missing asset'
  return `${action.label}: ${asset.name}`
}
