import { keyLabel } from '../utils/keyLabels.js'

// Small keycap badge for a KeyboardEvent.code. Optional muted label after it.
export default function KeyCap({ code, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd className="min-w-6 rounded border border-neutral-600 border-b-2 bg-neutral-800 px-1.5 py-0.5 text-center font-mono text-[11px] leading-none text-neutral-100">
        {keyLabel(code)}
      </kbd>
      {label && <span className="text-[10px] text-neutral-500">{label}</span>}
    </span>
  )
}
