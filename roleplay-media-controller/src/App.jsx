import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import { PAGES } from './utils/pages.js'
import Dashboard from './pages/Dashboard.jsx'
import MediaLibrary from './pages/MediaLibrary.jsx'
import KeyboardMappings from './pages/KeyboardMappings.jsx'
import AudioSettings from './pages/AudioSettings.jsx'
import useAssets from './hooks/useAssets.js'
import useAudioSettings from './hooks/useAudioSettings.js'
import useKeyboard from './hooks/useKeyboard.js'
import useMappings from './hooks/useMappings.js'
import useOutputStatus from './hooks/useOutputStatus.js'
import usePlayback from './hooks/usePlayback.js'
import useToast from './hooks/useToast.js'

const POPUP_BLOCKED = 'The browser blocked the output window. Allow pop-ups for localhost in the address bar, then try again.'

function Placeholder({ title }) {
  return <h1 className="text-xl font-semibold text-neutral-100">{title} (coming in a later phase)</h1>
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const connected = useOutputStatus()
  const library = useAssets()
  const keyboard = useMappings()
  const toast = useToast()
  const { audio } = usePlayback(library.assets, keyboard.mappings, connected)
  const audioSettings = useAudioSettings(audio)
  const { lastTriggered } = useKeyboard(keyboard.mappings, library.assets, { outputConnected: connected, audio })
  const current = PAGES.find((p) => p.id === page)

  // Drop mappings for deleted assets. Only when the library loaded successfully:
  // an empty list from a failed load must never wipe the mappings.
  const { prune } = keyboard
  useEffect(() => {
    if (library.loading || library.error) return
    prune(library.assets.map((a) => a.id))
  }, [library.loading, library.error, library.assets, prune])

  // Same window name every time, so an already-open output is reused and brought to the front.
  const openOutput = () => {
    const win = window.open(`${location.origin}${location.pathname}#output`, 'roleplay-output', 'width=960,height=540')
    if (!win) {
      toast.error(POPUP_BLOCKED)
      return
    }
    win.focus()
  }

  const counts = { video: 0, image: 0, audio: 0 }
  for (const a of library.assets) counts[a.type] = (counts[a.type] ?? 0) + 1

  let content
  if (page === 'dashboard') {
    content = (
      <Dashboard
        connected={connected}
        counts={counts}
        shortcutCount={keyboard.count}
        settings={audioSettings.settings}
        onOpenOutput={openOutput}
      />
    )
  } else if (page === 'media') {
    content = <MediaLibrary {...library} keyFor={keyboard.keyFor} />
  } else if (page === 'mappings') {
    content = (
      <KeyboardMappings
        assets={library.assets}
        loading={library.loading}
        keyboard={keyboard}
        lastTriggered={lastTriggered}
      />
    )
  } else if (page === 'audio') {
    content = (
      <AudioSettings
        settings={audioSettings.settings}
        onChange={audioSettings.update}
        audio={audio}
        outputConnected={connected}
      />
    )
  } else {
    content = <Placeholder title={current?.label ?? page} />
  }

  return (
    <div className="flex h-full">
      <Sidebar page={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto p-6">{content}</main>
    </div>
  )
}
