import { useCallback, useEffect, useState } from 'react'
import { loadAudioSettings, normalizeAudioSettings, saveAudioSettings } from '../engine/audioSettings.js'
import { CMD, sendCommand } from '../engine/commands.js'

// Call once in App: persists, applies to the controller engine, and syncs the output window.
export default function useAudioSettings(audio) {
  const [settings, setSettings] = useState(loadAudioSettings)

  useEffect(() => {
    saveAudioSettings(settings)
    audio.applySettings(settings)
    sendCommand(CMD.SETTINGS, { settings })
  }, [settings, audio])

  const update = useCallback((patch) => setSettings((prev) => normalizeAudioSettings({ ...prev, ...patch })), [])

  return { settings, update }
}
