import { useEffect, useState } from 'react'

const supported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator

// Keeps the screen awake while the calling component is mounted.
// Returns 'active' | 'pending' | 'unsupported' | 'denied'. The browser drops the lock when the
// tab is hidden; it is requested again when the tab becomes visible.
export default function useWakeLock() {
  const [status, setStatus] = useState(() => (supported() ? 'pending' : 'unsupported'))

  useEffect(() => {
    if (!supported()) return
    let lock = null
    let requesting = false
    let disposed = false

    const request = async () => {
      if (disposed || lock || requesting || document.visibilityState !== 'visible') return
      requesting = true
      try {
        const l = await navigator.wakeLock.request('screen')
        if (disposed) {
          l.release().catch(() => {})
          return
        }
        lock = l
        setStatus('active')
        l.addEventListener('release', () => {
          if (lock === l) lock = null
          if (!disposed) setStatus('pending')
        })
      } catch {
        if (!disposed) setStatus('denied')
      } finally {
        requesting = false
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') request()
    }

    request()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibility)
      if (lock) {
        const l = lock
        lock = null
        l.release().catch(() => {})
      }
    }
  }, [])

  return status
}
