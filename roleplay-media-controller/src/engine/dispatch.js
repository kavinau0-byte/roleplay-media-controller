// Executes a mapped action.
import { getAction } from './actions.js'
import { describeAction } from './KeyboardEngine.js'

// PHASE 3: this only reports what WOULD happen. Phase 4 implements real playback
// here (sending commands to the output window and driving the audio engine).
export function runAction(mapping, asset) {
  const action = getAction(mapping?.action)
  if (!action) return { ok: false, summary: 'Unknown action' }
  if (action.assetType !== null && !asset) return { ok: false, summary: 'Missing asset' }
  return { ok: true, summary: describeAction(mapping, asset ? [asset] : []) }
}
