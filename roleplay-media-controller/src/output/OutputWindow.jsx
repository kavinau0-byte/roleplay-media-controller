import { useEffect, useState } from 'react'
import { MSG, send, subscribe } from '../engine/WindowCommunication.js'

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {})
  } else {
    enterFullscreen()
  }
}

function enterFullscreen() {
  if (document.fullscreenElement) return
  document.documentElement.requestFullscreen?.().catch(() => {})
}

export default function OutputWindow() {
  const [activated, setActivated] = useState(false)

  useEffect(() => {
    document.title = 'Output'

    const unsubscribe = subscribe((msg) => {
      if (msg?.type === MSG.PING) send(MSG.PONG)
    })
    send(MSG.HELLO)

    const onBeforeUnload = () => send(MSG.BYE)
    window.addEventListener('beforeunload', onBeforeUnload)

    const onKeyDown = (event) => {
      if (event.repeat) return
      setActivated(true)
      if (event.code === 'KeyF') {
        toggleFullscreen()
      } else {
        send(MSG.KEY, { code: event.code })
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      unsubscribe()
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  // A click only ever enters fullscreen; F toggles, Esc exits (browser default).
  const handleClick = () => {
    enterFullscreen()
    setActivated(true)
  }

  return (
    <div
      className="fixed inset-0 bg-black cursor-none select-none overflow-hidden"
      onClick={handleClick}
    >
      {!activated && (
        <div className="absolute inset-x-0 bottom-3 text-center text-xs text-neutral-800">
          Click once to go fullscreen and unlock audio
        </div>
      )}
    </div>
  )
}
