import { Component } from 'react'

const RELOAD_KEY = 'rmc.output.reloads'
const MAX_RELOADS_PER_MINUTE = 3
const OUTPUT_RELOAD_DELAY_MS = 2000

// Returns true (and records it) if the output may auto-reload now: at most 3 times per minute.
function claimOutputReload() {
  try {
    const now = Date.now()
    const raw = JSON.parse(sessionStorage.getItem(RELOAD_KEY) || '[]')
    const recent = (Array.isArray(raw) ? raw : []).filter((t) => typeof t === 'number' && now - t < 60_000)
    if (recent.length >= MAX_RELOADS_PER_MINUTE) return false
    recent.push(now)
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify(recent))
    return true
  } catch {
    return false
  }
}

// variant 'controller' (default): dark fallback with a Reload button.
// variant 'output': stays plain black (the audience sees nothing) and reloads itself after 2 s,
// at most 3 times per minute; after that it stays black.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
    this.reloadTimer = null
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Roleplay Media Controller crashed:', error, info?.componentStack)
    if (this.props.variant === 'output' && this.reloadTimer === null && claimOutputReload()) {
      this.reloadTimer = setTimeout(() => window.location.reload(), OUTPUT_RELOAD_DELAY_MS)
    }
  }

  componentWillUnmount() {
    if (this.reloadTimer !== null) clearTimeout(this.reloadTimer)
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.variant === 'output') {
      return <div className="fixed inset-0 cursor-none bg-black" />
    }
    return (
      <div className="flex h-full items-center justify-center bg-[#0f0f10] p-6">
        <div className="flex max-w-sm flex-col items-center gap-4 rounded-lg border border-neutral-800 bg-neutral-900/60 p-6 text-center">
          <div className="text-lg font-semibold text-neutral-100">Something went wrong</div>
          <div className="text-sm text-neutral-500">Your media and key mappings are saved. Reload to continue.</div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border border-neutral-700 bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
