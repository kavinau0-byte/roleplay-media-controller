import { PAGES } from '../utils/pages.js'

export default function Sidebar({ page, onNavigate }) {
  return (
    <aside className="w-56 shrink-0 border-r border-neutral-800 bg-[#0b0b0c] flex flex-col">
      <div className="px-4 py-4 border-b border-neutral-800">
        <div className="text-sm font-semibold tracking-wide text-neutral-100">Media Controller</div>
        <div className="text-xs text-neutral-500">Roleplay playback</div>
      </div>
      <nav className="flex flex-col gap-0.5 p-2">
        {PAGES.map((item) => {
          const active = item.id === page
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`text-left text-sm px-3 py-2 rounded-md transition-colors ${
                active
                  ? 'bg-neutral-800 text-neutral-100'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
