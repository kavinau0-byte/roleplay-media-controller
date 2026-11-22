import { useCallback, useEffect, useRef, useState } from 'react'
import { suspendKeyboard } from '../engine/KeyboardEngine.js'
import { isReservedCode, keyLabel } from '../utils/keyLabels.js'

const CAPTURE_TIMEOUT_MS = 10000

// Single page-wide key capture. The show keyboard is suspended from the moment
// start() is called (synchronously, in the click handler) until finish/cancel/unmount.
// capture: null | { action, assetId, attempt, error, conflict: { code, existing } | null }
export default function useKeyCapture({ assign, replace, onAssigned, onTimeout }) {
  const [capture, setCapture] = useState(null)
  const releaseRef = useRef(null)

  const release = useCallback(() => {
    releaseRef.current?.()
    releaseRef.current = null
  }, [])

  const cancel = useCallback(() => {
    release()
    setCapture(null)
  }, [release])

  const start = useCallback(
    (action, assetId = null) => {
      release()
      releaseRef.current = suspendKeyboard()
      // The clicked button keeps focus; a captured Space/Enter must not re-click it.
      document.activeElement?.blur?.()
      setCapture({ action, assetId, attempt: 0, error: null, conflict: null })
    },
    [release],
  )

  // Release on unmount (e.g. navigating away mid-capture).
  useEffect(() => release, [release])

  const listening = capture !== null && capture.conflict === null
  const attempt = capture?.attempt ?? 0

  // Keep callbacks fresh without re-registering the listener on every render.
  const cbRef = useRef({ assign, onAssigned, onTimeout })
  useEffect(() => {
    cbRef.current = { assign, onAssigned, onTimeout }
  }, [assign, onAssigned, onTimeout])

  const action = capture?.action
  const assetId = capture?.assetId

  useEffect(() => {
    if (!listening) return
    const onKeyDown = (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.repeat) return
      const code = event.code
      if (!code) return
      const reason = isReservedCode(code)
      if (reason) {
        setCapture((c) => c && { ...c, attempt: c.attempt + 1, error: `${keyLabel(code)}: ${reason}` })
        return
      }
      const result = cbRef.current.assign(code, action, assetId)
      if (result.ok) {
        release()
        setCapture(null)
        cbRef.current.onAssigned?.(code, action, assetId)
      } else {
        setCapture((c) => c && { ...c, error: null, conflict: { code, existing: result.conflict } })
      }
    }
    const timer = setTimeout(() => {
      release()
      setCapture(null)
      cbRef.current.onTimeout?.()
    }, CAPTURE_TIMEOUT_MS)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [listening, attempt, action, assetId, release])

  const confirmReplace = useCallback(() => {
    if (!capture?.conflict) return
    const { code } = capture.conflict
    replace(code, capture.action, capture.assetId)
    release()
    setCapture(null)
    onAssigned?.(code, capture.action, capture.assetId)
  }, [capture, replace, release, onAssigned])

  return { capture, start, cancel, confirmReplace }
}
