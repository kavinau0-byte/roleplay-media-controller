export default function StatusIndicator({ connected }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs">
      <span
        className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
      />
      <span className={connected ? 'text-neutral-200' : 'text-neutral-400'}>
        {connected ? 'Output connected' : 'Output not connected'}
      </span>
    </div>
  )
}
