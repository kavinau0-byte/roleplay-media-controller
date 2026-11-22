import { useEffect, useRef, useState } from 'react'
import { MSG, send, subscribe } from '../engine/WindowCommunication.js'
import { CMD, EVENT, sendEvent } from '../engine/commands.js'
import { createAudioEngine } from '../engine/AudioEngine.js'
import { effectiveVolume, loadAudioSettings, normalizeAudioSettings } from '../engine/audioSettings.js'
import { getAssetUrl } from '../engine/mediaUrls.js'

const BLOCKED = 'Click once inside the output window to enable sound.'
const VIDEO_FAILED = "This video can't be played in this browser. Re-export it as MP4 (H.264 + AAC)."
const IMAGE_FAILED = "This image can't be displayed in this browser."
const MISSING = 'Media file missing'

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

// Resolves true if the image decoded (it is then ready to show without a flash).
async function decodeImage(url) {
  const img = new Image()
  img.src = url
  try {
    await img.decode()
    return true
  } catch {
    return false
  }
}

// Module-level so StrictMode never creates a second engine.
let outputAudio = null
let statusSink = () => {} // set by the effect: sends EVENT.STATUS
function getOutputAudio() {
  if (!outputAudio) {
    outputAudio = createAudioEngine({
      role: 'output',
      settings: loadAudioSettings(),
      onError: (message) => sendEvent(EVENT.ERROR, { message }),
      onSinkStatus: () => statusSink(),
    })
  }
  return outputAudio
}

export default function OutputWindow() {
  const [activated, setActivated] = useState(false)
  const [imageUrl, setImageUrl] = useState(null) // base image
  const [videoVisible, setVideoVisible] = useState(false)
  const videoRef = useRef(null)
  const activatedRef = useRef(false)

  useEffect(() => {
    document.title = 'Output'
    const audio = getOutputAudio()
    const video = videoRef.current

    let settings = loadAudioSettings()
    let token = 0 // bumped by every display command; stale async work checks it and aborts
    let current = null // { token, assetId, seq } of the video being shown
    let videoSinkReady = Promise.resolve()

    const sendStatus = () =>
      sendEvent(EVENT.STATUS, {
        fullscreen: Boolean(document.fullscreenElement),
        activated: navigator.userActivation?.hasBeenActive ?? activatedRef.current,
        sinkError: audio.getSinkError(),
      })
    statusSink = sendStatus

    const applySettings = (next) => {
      settings = normalizeAudioSettings(next)
      audio.applySettings(settings)
      video.volume = effectiveVolume(settings, 'video')
      // Video sound follows the output device too (no-op if it is already on it).
      videoSinkReady = audio.routeElement(video)
    }
    applySettings(settings)

    const fail = (message) => sendEvent(EVENT.ERROR, { message })

    const hideVideo = () => {
      current = null
      video.pause()
      video.removeAttribute('src')
      video.load()
      setVideoVisible(false)
    }

    const showVideo = async ({ assetId, seq }) => {
      const my = ++token
      const [url] = await Promise.all([getAssetUrl(assetId), videoSinkReady])
      if (my !== token) return
      if (!url) {
        hideVideo()
        fail(MISSING)
        return
      }
      current = { token: my, assetId, seq }
      if (video.getAttribute('src') !== url) {
        // Different video: keep the layer hidden (base image shows) until it is playing.
        setVideoVisible(false)
        video.src = url
      }
      video.currentTime = 0
      try {
        await video.play()
      } catch (err) {
        if (my !== token || current?.token !== my || err?.name === 'AbortError') return
        hideVideo()
        fail(err?.name === 'NotAllowedError' ? BLOCKED : VIDEO_FAILED)
      }
    }

    const showImage = async ({ assetId }) => {
      const my = ++token
      hideVideo()
      const url = await getAssetUrl(assetId)
      if (my !== token) return
      if (!url) {
        fail(MISSING)
        return
      }
      const decoded = await decodeImage(url)
      if (my !== token) return
      if (!decoded) {
        fail(IMAGE_FAILED)
        return
      }
      setImageUrl(url)
    }

    const clearDisplay = () => {
      token++
      hideVideo()
      setImageUrl(null)
    }

    const preload = (assets) => {
      if (!Array.isArray(assets)) return
      for (const a of assets) {
        if (!a || typeof a.id !== 'string') continue
        if (a.type === 'audio') audio.preload([a.id])
        else
          getAssetUrl(a.id).then((url) => {
            if (url && a.type === 'image') decodeImage(url)
          })
      }
    }

    const onPlaying = () => {
      if (current && current.token === token) setVideoVisible(true)
    }
    const onEnded = () => {
      if (!current) return
      const { assetId, seq } = current
      hideVideo() // the base image (or black) shows again
      sendEvent(EVENT.VIDEO_ENDED, { assetId, seq })
    }
    const onVideoError = () => {
      if (!current) return
      hideVideo()
      fail(VIDEO_FAILED)
    }
    video.addEventListener('playing', onPlaying)
    video.addEventListener('ended', onEnded)
    video.addEventListener('error', onVideoError)

    const handleCommand = (cmd) => {
      switch (cmd?.name) {
        case CMD.SHOW_VIDEO:
          showVideo(cmd)
          break
        case CMD.SHOW_IMAGE:
          showImage(cmd)
          break
        case CMD.CLEAR_DISPLAY:
          clearDisplay()
          break
        case CMD.STOP_ALL:
          clearDisplay()
          audio.stopAll()
          break
        case CMD.MUSIC_START:
          audio.musicStart(cmd.assetId, cmd.position)
          break
        case CMD.MUSIC_STOP:
          audio.musicStop()
          break
        case CMD.MUSIC_PAUSE:
          audio.musicPause()
          break
        case CMD.MUSIC_RESUME:
          audio.musicResume()
          break
        case CMD.SFX_PLAY:
          audio.sfxPlay(cmd.assetId)
          break
        case CMD.SFX_STOP:
          audio.sfxStop()
          break
        case CMD.SETTINGS:
          applySettings(cmd.settings)
          break
        case CMD.PRELOAD:
          preload(cmd.assets)
          break
        case CMD.TEST_TONE:
          audio.playTestTone()
          break
        case CMD.STATUS_REQUEST:
          sendStatus()
          break
        default:
          break
      }
    }

    const unsubscribe = subscribe((msg) => {
      if (msg?.type === MSG.PING) send(MSG.PONG)
      else if (msg?.type === MSG.CMD) handleCommand(msg.payload)
    })
    send(MSG.HELLO)
    sendStatus()

    const onBeforeUnload = () => send(MSG.BYE)
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('fullscreenchange', sendStatus)

    const markActivated = () => {
      if (activatedRef.current) return
      activatedRef.current = true
      setActivated(true)
      sendStatus()
    }

    // A click only ever enters fullscreen; F toggles, Esc exits (browser default).
    const onClick = () => {
      enterFullscreen()
      markActivated()
    }
    window.addEventListener('click', onClick)

    const onKeyDown = (event) => {
      if (event.repeat) return
      markActivated()
      if (event.code === 'KeyF') {
        toggleFullscreen()
      } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        // Browser shortcuts like Ctrl+R must not fire the mapping on R.
        send(MSG.KEY, { code: event.code })
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      token++ // drop any in-flight loads from this effect run
      unsubscribe()
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('error', onVideoError)
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('fullscreenchange', sendStatus)
      window.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKeyDown)
      if (statusSink === sendStatus) statusSink = () => {}
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black cursor-none select-none overflow-hidden">
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        className={`absolute inset-0 h-full w-full bg-black object-contain ${videoVisible ? '' : 'invisible'}`}
      />
      {!activated && (
        <div className="absolute inset-x-0 bottom-3 text-center text-xs text-neutral-800">
          Click once to go fullscreen and unlock audio
        </div>
      )}
    </div>
  )
}
