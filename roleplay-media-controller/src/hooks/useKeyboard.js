import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { MSG, subscribe } from '../engine/WindowCommunication.js'
import { isKeyboardSuspended, resolveMapping, shouldIgnoreEvent } from '../engine/KeyboardEngine.js'
import { runAction } from '../engine/dispatch.js'
import { keyLabel } from '../utils/keyLabels.js'
import useToast from './useToast.js'

// Show-time key handling for the controller window. Call once (in App).
// Keys come from this window's keydown and from the output window (MSG.KEY).
export default function useKeyboard(mappings, assets) {
  const [lastTriggered, setLastTriggered] = useState(null)
  const toast = useToast()

  const mappingsRef = useRef(mappings)
  const assetsRef = useRef(assets)
  const toastRef = useRef(toast)
  useLayoutEffect(() => {
    mappingsRef.current = mappings
    assetsRef.current = assets
    toastRef.current = toast
  }, [mappings, assets, toast])

  useEffect(() => {
    // Returns true if the code was mapped (and handled).
    const handleCode = (code) => {
      if (isKeyboardSuspended()) return false
      const mapping = resolveMapping(code, mappingsRef.current)
      if (!mapping) return false

      // A focused button/link must not also react to a mapped Space/Enter.
      const active = document.activeElement
      if (active && (active.tagName === 'BUTTON' || active.tagName === 'A')) active.blur()

      const asset = mapping.assetId ? assetsRef.current.find((a) => a.id === mapping.assetId) : null
      const result = runAction(mapping, asset)
      setLastTriggered({ code, summary: result.summary, ok: result.ok, at: Date.now() })
      const text = `${keyLabel(code)}: ${result.summary}`
      if (result.ok) toastRef.current.success(text)
      else toastRef.current.error(text)
      return true
    }

    const onKeyDown = (event) => {
      if (shouldIgnoreEvent(event)) return
      if (isKeyboardSuspended()) return
      if (!resolveMapping(event.code, mappingsRef.current)) return
      event.preventDefault()
      handleCode(event.code)
    }

    // Forwarded from the output window: non-repeat, no modifiers, nothing to preventDefault.
    const unsubscribe = subscribe((msg) => {
      if (msg?.type !== MSG.KEY) return
      const code = msg.payload?.code
      if (typeof code === 'string' && code) handleCode(code)
    })

    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      unsubscribe()
    }
  }, [])

  return { lastTriggered }
}
