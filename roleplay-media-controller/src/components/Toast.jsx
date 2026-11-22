import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ToastContext } from '../hooks/useToast.js'

const DISMISS_MS = 4000

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (kind, message) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, kind, message }])
      timers.current.set(id, setTimeout(() => dismiss(id), DISMISS_MS))
    },
    [dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => map.forEach(clearTimeout)
  }, [])

  const api = useMemo(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m) }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto cursor-pointer rounded-md border px-3 py-2 text-sm shadow-lg ${
              t.kind === 'error'
                ? 'border-red-900 bg-[#1f1213] text-red-200'
                : 'border-green-900 bg-[#111a14] text-green-200'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
