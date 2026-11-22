import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import { PAGES } from './utils/pages.js'
import Dashboard from './pages/Dashboard.jsx'
import MediaLibrary from './pages/MediaLibrary.jsx'
import ToastProvider from './components/Toast.jsx'
import useAssets from './hooks/useAssets.js'
import useOutputStatus from './hooks/useOutputStatus.js'

function openOutput() {
  const win = window.open(
    `${location.origin}${location.pathname}#output`,
    'roleplay-output',
    'width=960,height=540',
  )
  if (!win) {
    alert('The output window was blocked by the browser. Please allow popups for this site and try again.')
  }
}

function Placeholder({ title }) {
  return <h1 className="text-xl font-semibold text-neutral-100">{title} (coming in a later phase)</h1>
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const connected = useOutputStatus()
  const library = useAssets()
  const current = PAGES.find((p) => p.id === page)

  const counts = { video: 0, image: 0, audio: 0 }
  for (const a of library.assets) counts[a.type] = (counts[a.type] ?? 0) + 1

  let content
  if (page === 'dashboard') {
    content = <Dashboard connected={connected} counts={counts} onOpenOutput={openOutput} />
  } else if (page === 'media') {
    content = <MediaLibrary {...library} />
  } else {
    content = <Placeholder title={current?.label ?? page} />
  }

  return (
    <ToastProvider>
      <div className="flex h-full">
        <Sidebar page={page} onNavigate={setPage} />
        <main className="flex-1 overflow-y-auto p-6">{content}</main>
      </div>
    </ToastProvider>
  )
}
