import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import { PAGES } from './utils/pages.js'
import Dashboard from './pages/Dashboard.jsx'
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
  const current = PAGES.find((p) => p.id === page)

  return (
    <div className="flex h-full">
      <Sidebar page={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto p-6">
        {page === 'dashboard' ? (
          <Dashboard connected={connected} onOpenOutput={openOutput} />
        ) : (
          <Placeholder title={current?.label ?? page} />
        )}
      </main>
    </div>
  )
}
