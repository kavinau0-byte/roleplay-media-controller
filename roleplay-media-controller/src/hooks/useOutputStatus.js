import { useEffect, useRef, useState } from 'react'
import { MSG, send, subscribe } from '../engine/WindowCommunication.js'

const PING_INTERVAL_MS = 2000
const TIMEOUT_MS = 5000
const CHECK_INTERVAL_MS = 1000

export default function useOutputStatus() {
  const [connected, setConnected] = useState(false)
  const lastHeardRef = useRef(0)

  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      if (!msg) return
      if (msg.type === MSG.PONG || msg.type === MSG.HELLO) {
        lastHeardRef.current = Date.now()
        setConnected(true)
      } else if (msg.type === MSG.BYE) {
        lastHeardRef.current = 0
        setConnected(false)
      }
    })

    send(MSG.PING)
    const pingTimer = setInterval(() => send(MSG.PING), PING_INTERVAL_MS)
    const checkTimer = setInterval(() => {
      if (Date.now() - lastHeardRef.current > TIMEOUT_MS) setConnected(false)
    }, CHECK_INTERVAL_MS)

    return () => {
      clearInterval(pingTimer)
      clearInterval(checkTimer)
      unsubscribe()
    }
  }, [])

  return connected
}
