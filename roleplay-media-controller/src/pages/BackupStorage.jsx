import { useCallback, useEffect, useState } from 'react'
import { normalizeAudioSettings } from '../engine/audioSettings.js'
import useToast from '../hooks/useToast.js'
import { listAssets } from '../storage/IndexedDB.js'
import {
  backupToFolder,
  isPickerCancel,
  readManifest,
  restoreAssets,
  supportsFolderAccess,
} from '../utils/backup.js'
import { formatBytes } from '../utils/mediaHelpers.js'

const BUTTON =
  'rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50'
const CARD = 'flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4'
const NO_FOLDER_ACCESS = 'Use Chrome on desktop for backups.'

const blurAfterPointer = (e) => e.currentTarget.blur()
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
const listReasons = (items) => items.map((x) => `${x.name} (${x.reason})`).join(', ')

async function readStorageInfo() {
  const s = navigator.storage
  const info = { usage: null, quota: null, persisted: null, supported: Boolean(s?.persist) }
  try {
    if (s?.estimate) Object.assign(info, await s.estimate())
  } catch {
    // unknown
  }
  try {
    if (s?.persisted) info.persisted = await s.persisted()
  } catch {
    // unknown
  }
  return info
}

function StorageCard({ info, onChanged }) {
  const [outcome, setOutcome] = useState(null)

  const requestPersist = async () => {
    if (!navigator.storage?.persist) {
      setOutcome('This browser does not support persistent storage.')
      return
    }
    try {
      const granted = await navigator.storage.persist()
      setOutcome(
        granted
          ? 'Storage is persistent. Chrome will not delete the library to free up space.'
          : 'Chrome declined for now. It usually allows it after the site has been used for a while or bookmarked. Keep a backup either way.',
      )
    } catch {
      setOutcome('Could not ask the browser. Keep a backup to be safe.')
    }
    onChanged()
  }

  let persistedText = 'Unknown'
  if (info?.persisted === true) persistedText = 'Yes'
  if (info?.persisted === false) persistedText = 'No'

  return (
    <div className={CARD}>
      <div className="text-sm font-semibold text-neutral-100">Storage</div>
      <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
        <dt className="text-neutral-500">Used</dt>
        <dd className="text-neutral-200">
          {info?.usage != null && info?.quota ? `${formatBytes(info.usage)} of ${formatBytes(info.quota)}` : 'Unknown'}
        </dd>
        <dt className="text-neutral-500">Persistent</dt>
        <dd className={info?.persisted ? 'text-green-400' : 'text-neutral-200'}>{persistedText}</dd>
      </dl>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={BUTTON} onClick={requestPersist} onPointerUp={blurAfterPointer}>
          Request persistent storage
        </button>
        {outcome && <span className="text-sm text-neutral-300">{outcome}</span>}
      </div>
      <div className="text-xs text-neutral-600">
        Persistent storage asks Chrome not to delete the library when disk space is low.
      </div>
    </div>
  )
}

// props: assets, mappings, audioSettings, replaceMappings(list), updateAudioSettings(patch), refreshLibrary()
export default function BackupStorage({
  assets,
  mappings,
  audioSettings,
  replaceMappings,
  updateAudioSettings,
  refreshLibrary,
}) {
  const toast = useToast()
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null) // text while working
  const [result, setResult] = useState(null) // { ok, text }
  const folderAccess = supportsFolderAccess()

  const loadInfo = useCallback(() => {
    readStorageInfo().then(setInfo)
  }, [])

  useEffect(() => {
    loadInfo()
  }, [loadInfo])

  const finish = (ok, text) => {
    setResult({ ok, text })
    if (ok) toast.success(text)
    else toast.error(text)
  }

  const backup = async (e) => {
    e.currentTarget.blur()
    if (!folderAccess) {
      finish(false, NO_FOLDER_ACCESS)
      return
    }
    let dir
    try {
      dir = await window.showDirectoryPicker({ mode: 'readwrite' })
    } catch (err) {
      if (!isPickerCancel(err)) finish(false, err?.message || 'Could not open the folder.')
      return
    }
    setBusy(true)
    setResult(null)
    try {
      const { saved, skipped } = await backupToFolder(dir, {
        assets,
        mappings,
        audioSettings,
        onProgress: (i, n) => setProgress(`Saving ${i} of ${n} files…`),
      })
      let text = `Backed up ${plural(saved, 'media file')}, ${plural(mappings.length, 'key mapping')} and the audio settings.`
      if (skipped.length > 0) text += ` Skipped ${skipped.length}: ${listReasons(skipped)}.`
      finish(skipped.length === 0, text)
    } catch (err) {
      finish(false, `Backup failed: ${err?.message || 'could not write to the folder'}. Try another folder.`)
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const restore = async (e) => {
    e.currentTarget.blur()
    if (!folderAccess) {
      finish(false, NO_FOLDER_ACCESS)
      return
    }
    let dir
    try {
      dir = await window.showDirectoryPicker({ mode: 'read' })
    } catch (err) {
      if (!isPickerCancel(err)) finish(false, err?.message || 'Could not open the folder.')
      return
    }
    setBusy(true)
    setResult(null)
    try {
      setProgress('Reading manifest.json…')
      const { manifest, assets: entries, invalid } = await readManifest(dir)
      const existing = new Set((await listAssets()).map((a) => a.id))
      const fresh = entries.filter((a) => !existing.has(a.id))
      const present = entries.length - fresh.length

      const lines = [
        `Restore this backup${manifest.exportedAt ? ` from ${new Date(manifest.exportedAt).toLocaleString()}` : ''}?`,
        '',
        `${plural(entries.length, 'media file')}: ${fresh.length} new, ${present} already present with the same id (left untouched).`,
        `${plural(manifest.mappings.length, 'key mapping')} will REPLACE your current ${plural(mappings.length, 'mapping')}.`,
        'The audio settings will REPLACE your current audio settings.',
      ]
      if (invalid > 0) lines.push(`${invalid} unusable media entries in the manifest will be skipped.`)
      if (!window.confirm(lines.join('\n'))) return

      const { restored, failed } = await restoreAssets(dir, fresh, (i, n) => setProgress(`Restoring ${i} of ${n} files…`))

      // Library first (the prune effect waits while it is loading), then mappings and settings.
      setProgress('Applying keys and settings…')
      await refreshLibrary()
      const libraryIds = new Set((await listAssets()).map((a) => a.id))
      const usable = manifest.mappings.filter((m) => !m?.assetId || libraryIds.has(m.assetId))
      const kept = replaceMappings(usable)

      // Device ids are per address: a backup from another address cannot reuse them.
      const settings = normalizeAudioSettings(manifest.audioSettings)
      const otherOrigin = typeof manifest.origin === 'string' && manifest.origin !== location.origin
      if (otherOrigin) {
        settings.controllerSinkId = 'default'
        settings.outputSinkId = 'default'
      }
      updateAudioSettings(settings)

      const reasons = []
      if (present > 0) reasons.push(`${present} already present`)
      if (invalid > 0) reasons.push(`${invalid} unusable in the manifest`)
      if (failed.length > 0) reasons.push(`${failed.length} failed: ${listReasons(failed)}`)
      const droppedMappings = manifest.mappings.length - kept
      if (droppedMappings > 0) reasons.push(`${plural(droppedMappings, 'mapping')} dropped (invalid or file missing)`)
      let text = `Restored ${restored} media, ${plural(kept, 'mapping')}`
      text += reasons.length > 0 ? `; skipped ${reasons.join('; ')}.` : '.'
      if (otherOrigin) text += ' Audio devices were reset to System default (this is a different address); pick them again.'
      finish(failed.length === 0, text)
    } catch (err) {
      finish(false, err?.message || 'Restore failed.')
    } finally {
      setBusy(false)
      setProgress(null)
      loadInfo()
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <h1 className="text-xl font-semibold text-neutral-100">Backup &amp; Storage</h1>

      <StorageCard info={info} onChanged={loadInfo} />

      <div className={CARD}>
        <div className="text-sm font-semibold text-neutral-100">Address</div>
        <div className="font-mono text-sm text-neutral-200">{location.origin}</div>
        <div className="text-xs text-neutral-500">
          Your media, keys and settings live in the browser at this address. Always open the show from exactly this
          address (same host and port). A different port counts as a different place and will look empty.
        </div>
      </div>

      <div className={CARD}>
        <div className="text-sm font-semibold text-neutral-100">Backup</div>
        <div className="text-xs text-neutral-500">
          Saves every media file, the key mappings and the audio settings into a folder you choose (use an empty folder,
          ideally on a USB stick).
        </div>
        <div>
          <button type="button" className={BUTTON} onClick={backup} disabled={busy} onPointerUp={blurAfterPointer}>
            Back up to a folder
          </button>
        </div>
      </div>

      <div className={CARD}>
        <div className="text-sm font-semibold text-neutral-100">Restore</div>
        <div className="text-xs text-neutral-500">
          Adds the backed-up media that is not in the library yet, and replaces the key mappings and audio settings.
        </div>
        <div>
          <button type="button" className={BUTTON} onClick={restore} disabled={busy} onPointerUp={blurAfterPointer}>
            Restore from a backup folder
          </button>
        </div>
      </div>

      {!folderAccess && <div className="text-sm text-neutral-400">{NO_FOLDER_ACCESS}</div>}
      {progress && <div className="text-sm text-neutral-300">{progress}</div>}
      {result && (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            result.ok ? 'border-green-900 bg-[#111a14] text-green-200' : 'border-red-900 bg-[#1f1213] text-red-200'
          }`}
        >
          {result.text}
        </div>
      )}
    </div>
  )
}
