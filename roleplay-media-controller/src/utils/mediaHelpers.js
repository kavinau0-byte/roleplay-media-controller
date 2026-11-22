export const MAX_FILE_BYTES = 1024 * 1024 * 1024 // 1 GB

const EXTENSION_TYPES = {
  mp4: 'video', webm: 'video', mov: 'video', m4v: 'video', ogv: 'video',
  png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image', avif: 'image', svg: 'image',
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', aac: 'audio', flac: 'audio',
}

// Used when the browser gives the file an empty MIME type.
const EXTENSION_MIME = {
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/x-m4v', ogv: 'video/ogg',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac',
}

const PROBE_TIMEOUT_MS = 8000

export function getExtension(fileName) {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : ''
}

export function stripExtension(fileName) {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(0, dot) : fileName
}

export function detectType(file) {
  const mime = file.type || ''
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime) return null
  return EXTENSION_TYPES[getExtension(file.name)] ?? null
}

export function resolveMimeType(file) {
  return file.type || EXTENSION_MIME[getExtension(file.name)] || ''
}

// MPEG-1/2 program streams (.mpeg/.mpg) are not playable in browsers.
export function isMpegFile(file) {
  const ext = getExtension(file.name)
  return ext === 'mpeg' || ext === 'mpg' || file.type === 'video/mpeg'
}

export function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) return ''
  if (n < 1024) return `${n} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = n / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return ''
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

// Checks the browser can decode a video/audio file and reads its duration.
// Uses its own detached element and object URL, so it never touches the preview.
// Resolves { ok, duration, hasVideoTrack }.
export function probeMedia(file, type) {
  if (type === 'image') return Promise.resolve({ ok: true, duration: null, hasVideoTrack: false })
  if (type !== 'video' && type !== 'audio') return Promise.resolve({ ok: false, duration: null, hasVideoTrack: false })

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const el = document.createElement(type)
    let timer = null
    let done = false

    const finish = (result) => {
      if (done) return
      done = true
      clearTimeout(timer)
      el.onloadedmetadata = null
      el.onerror = null
      el.removeAttribute('src')
      el.load()
      URL.revokeObjectURL(url)
      resolve(result)
    }

    const fail = () => finish({ ok: false, duration: null, hasVideoTrack: false })

    el.preload = 'metadata'
    el.muted = true
    el.onloadedmetadata = () => {
      const d = el.duration
      // 0, NaN or Infinity means the browser could not really decode the file.
      if (!Number.isFinite(d) || d <= 0) return fail()
      finish({ ok: true, duration: d, hasVideoTrack: type === 'video' && el.videoWidth > 0 })
    }
    el.onerror = fail
    timer = setTimeout(fail, PROBE_TIMEOUT_MS)
    el.src = url
  })
}
