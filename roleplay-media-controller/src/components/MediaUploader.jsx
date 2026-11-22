import { useRef, useState } from 'react'
import useToast from '../hooks/useToast.js'

const ACCEPT = 'video/*,image/*,audio/*,.mov,.m4a,.flac'

export default function MediaUploader({ onAddFiles }) {
  const inputRef = useRef(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(null) // { current, total } while uploading
  const [failures, setFailures] = useState([])
  const toast = useToast()
  const busy = progress !== null

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList ?? [])
    if (busy || files.length === 0) return
    setFailures([])
    setProgress({ current: 0, total: files.length })
    let results
    try {
      results = await onAddFiles(files, (current, total) => setProgress({ current, total }))
    } finally {
      setProgress(null)
    }
    results = results ?? []
    const ok = results.filter((r) => r.ok).length
    const failed = results.filter((r) => !r.ok)
    if (ok > 0) toast.success(`Added ${ok} file${ok === 1 ? '' : 's'}.`)
    if (failed.length > 0) {
      toast.error(`${failed.length} file${failed.length === 1 ? '' : 's'} could not be added.`)
      setFailures(failed)
    }
  }

  const onDragEnter = (e) => {
    e.preventDefault()
    if (busy) return
    dragDepth.current += 1
    setDragging(true)
  }
  const onDragLeave = (e) => {
    e.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }
  const onDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = busy ? 'none' : 'copy'
  }
  const onDrop = (e) => {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-8 text-center transition-colors ${
          dragging ? 'border-neutral-400 bg-neutral-900' : 'border-neutral-700 bg-neutral-900/40'
        } ${busy ? 'opacity-60' : ''}`}
      >
        <div className="text-sm text-neutral-300">
          {busy
            ? `Uploading ${Math.max(progress.current, 1)} of ${progress.total}...`
            : 'Drag and drop videos, images or audio here'}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-neutral-700 bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {failures.length > 0 && (
        <div className="rounded-md border border-red-900/60 bg-[#1a1011] p-3 text-xs text-red-200">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold">Not added</span>
            <button type="button" onClick={() => setFailures([])} className="text-red-300/70 hover:text-red-200">
              Dismiss
            </button>
          </div>
          <ul className="flex flex-col gap-1">
            {failures.map((f, i) => (
              <li key={`${f.fileName}-${i}`}>
                <span className="font-medium">{f.fileName}</span>: {f.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
