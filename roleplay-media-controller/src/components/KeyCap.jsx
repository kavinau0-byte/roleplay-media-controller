import { keyLabel } from '../utils/keyLabels.js'

const SIZES = {
  sm: 'min-w-6 px-1.5 py-0.5 text-[11px]',
  lg: 'min-w-12 px-3 py-2 text-2xl',
}

// Keycap badge for a KeyboardEvent.code. Optional muted label after it. size: 'sm' (default) | 'lg'.
export default function KeyCap({ code, label, size = 'sm' }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd
        className={`rounded border border-neutral-600 border-b-2 bg-neutral-800 text-center font-mono leading-none text-neutral-100 ${SIZES[size] ?? SIZES.sm}`}
      >
        {keyLabel(code)}
      </kbd>
      {label && <span className="text-[10px] text-neutral-500">{label}</span>}
    </span>
  )
}
