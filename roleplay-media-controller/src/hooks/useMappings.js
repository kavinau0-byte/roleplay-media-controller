import { useCallback, useEffect, useRef, useState } from 'react'
import { isGlobalAction, isKnownAction } from '../engine/actions.js'

const STORAGE_KEY = 'rmc.mappings.v1'

const DEFAULT_MAPPINGS = [
  { code: 'Escape', action: 'clear-display', assetId: null },
  { code: 'Backquote', action: 'stop-all', assetId: null },
]

// A "target" is what a key points at: an asset, or a global action.
function targetOf(m) {
  return m.assetId === null ? `action:${m.action}` : `asset:${m.assetId}`
}

function validate(list) {
  if (!Array.isArray(list)) return null
  const codes = new Set()
  const targets = new Set()
  const out = []
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const { code, action } = item
    const assetId = item.assetId ?? null
    if (typeof code !== 'string' || !code) continue
    if (!isKnownAction(action)) continue
    if (isGlobalAction(action) ? assetId !== null : typeof assetId !== 'string' || !assetId) continue
    const m = { code, action, assetId }
    const target = targetOf(m)
    if (codes.has(code) || targets.has(target)) continue
    codes.add(code)
    targets.add(target)
    out.push(m)
  }
  return out
}

function loadMappings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return DEFAULT_MAPPINGS
    return validate(JSON.parse(raw)) ?? DEFAULT_MAPPINGS
  } catch {
    return DEFAULT_MAPPINGS
  }
}

function makeMapping(code, action, assetId) {
  return { code, action, assetId: isGlobalAction(action) ? null : assetId }
}

// Key used by a different target, or null.
function findConflict(list, m) {
  const existing = list.find((x) => x.code === m.code)
  return existing && targetOf(existing) !== targetOf(m) ? existing : null
}

// Puts m in the list: frees its key from anyone else and moves the target's old key.
function put(list, m) {
  const target = targetOf(m)
  return [...list.filter((x) => x.code !== m.code && targetOf(x) !== target), m]
}

export default function useMappings() {
  const [mappings, setMappings] = useState(loadMappings)
  // Mirrors the latest (including not-yet-rendered) state so assign() can report
  // conflicts synchronously. Only written in callbacks, never during render.
  const latest = useRef(mappings)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
    } catch {
      // storage full or blocked: mappings still work for this session
    }
  }, [mappings])

  const update = useCallback((fn) => {
    latest.current = fn(latest.current)
    setMappings((prev) => fn(prev))
  }, [])

  const assign = useCallback(
    (code, action, assetId = null) => {
      const m = makeMapping(code, action, assetId)
      const conflict = findConflict(latest.current, m)
      if (conflict) return { ok: false, conflict }
      update((prev) => (findConflict(prev, m) ? prev : put(prev, m)))
      return { ok: true }
    },
    [update],
  )

  const replace = useCallback(
    (code, action, assetId = null) => {
      const m = makeMapping(code, action, assetId)
      update((prev) => put(prev, m))
      return { ok: true }
    },
    [update],
  )

  const removeByCode = useCallback((code) => update((prev) => prev.filter((m) => m.code !== code)), [update])

  const removeForAsset = useCallback(
    (assetId) => update((prev) => prev.filter((m) => m.assetId !== assetId)),
    [update],
  )

  const restoreDefaults = useCallback(() => update(() => DEFAULT_MAPPINGS), [update])

  // Removes mappings whose asset no longer exists. Returns the same array if nothing changed.
  const prune = useCallback(
    (validAssetIds) => {
      const valid = new Set(validAssetIds)
      update((prev) => {
        const next = prev.filter((m) => m.assetId === null || valid.has(m.assetId))
        return next.length === prev.length ? prev : next
      })
    },
    [update],
  )

  // Both return the full mapping ({ code, action, assetId }) or null.
  const keyFor = useCallback((assetId) => mappings.find((m) => m.assetId === assetId) ?? null, [mappings])
  const keyForAction = useCallback(
    (action) => mappings.find((m) => m.assetId === null && m.action === action) ?? null,
    [mappings],
  )

  return {
    mappings,
    assign,
    replace,
    removeByCode,
    removeForAsset,
    restoreDefaults,
    prune,
    keyFor,
    keyForAction,
    count: mappings.length,
  }
}
