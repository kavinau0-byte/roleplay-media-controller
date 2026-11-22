# Roleplay Media Controller

Local-first, keyboard-controlled media playback website for a live college roleplay ("Creativity vs Deadlines"). It is NOT a presentation or video editor. Users upload prepared videos, images and audio, assign a keyboard key to each, and press the key to play it on a separate fullscreen output window (projector).

## Stack
React + Vite, JavaScript (no TypeScript), Tailwind CSS v4 (via @tailwindcss/vite), `idb` for IndexedDB. No backend, no cloud, no auth, no router library. Avoid adding dependencies; if one seems necessary, ask first.

## Architecture
- One app, two windows. Controller = `/`. Output = `/#output` (decided in src/main.jsx by window.location.hash).
- Controller opens the output with window.open (name "roleplay-output"). Single computer, dual window.
- BroadcastChannel ("roleplay-media-controller") carries small commands only (asset IDs, never file blobs). Both windows read media from the same IndexedDB.
- Keyboard handling lives in the controller. The output window forwards its own key presses to the controller (message type KEY, payload {code}) so keys work even when the output has focus. Exception: the F key toggles fullscreen in the output window and is not forwarded.
- Use KeyboardEvent.code, ignore event.repeat, never intercept keys while the user is typing in an input/textarea/select.
- Audio plays in BOTH windows (laptop and output). Each window will later get its own audio output device chosen via setSinkId (Chrome). Video sound plays only in the output window.
- Audio channels are independent: background music (loop, toggle), sound effects (one-shot, restart on repeat press), video audio. Separate volume controls for each plus master.
- Output window: black background, no UI, cursor hidden, media fitted with object-fit: contain, never cropped or stretched.
- Do NOT hardcode roleplay characters, scenes or mappings anywhere in the engine.

## Folder structure
src/components, src/pages, src/engine (WindowCommunication.js, later KeyboardEngine.js, MediaEngine.js, AudioEngine.js), src/storage (IndexedDB.js), src/output (OutputWindow.jsx), src/hooks, src/utils.

## UI direction
Dark, minimal, professional control panel. Near-black background, subtle borders, compact cards, no gradients, no decorative illustrations.

## Rules for working
- Work one phase at a time and stay strictly inside the requested phase.
- After changes, run `npm run lint` and `npm run build` and fix errors.
- Never commit or push to git. The user does that.
- Do not claim something works unless you ran it. If something can only be tested manually in a browser, say so.
- End every task with a report in the exact format: (1) Summary in 3 to 5 lines, (2) Files created or changed, (3) Output of lint and build, (4) Anything that deviated from the request, (5) Manual tests the user must do.

## Storage
IndexedDB database "roleplay-media" (version 1), accessed only through src/storage/IndexedDB.js (uses `idb`). Two object stores, both keyPath "id" (id = crypto.randomUUID()):
- "assets": metadata only, safe to list. { id, name, type ('video'|'image'|'audio'), mimeType, size (bytes), description, duration (seconds or null), createdAt (ms timestamp) }.
- "blobs": { id, blob }. The file data, read only when a specific asset is needed (preview/playback). Never load blobs for listing.
Adding and deleting an asset touch both stores in a single transaction. Keyboard mappings will be stored separately in Phase 3 (not inside asset records).

## Keyboard mappings
- Stored in localStorage key "rmc.mappings.v1" as a JSON array of { code, action, assetId } (code = KeyboardEvent.code; assetId null for global actions). Owned by src/hooks/useMappings.js; invalid entries are dropped on load, and missing/invalid JSON falls back to defaults (Escape -> clear-display, Backquote -> stop-all).
- Actions (src/engine/actions.js): asset actions play-video (video), show-image (image), play-music (audio, loops, toggles on repeat press), play-sfx (audio, one-shot, restarts on repeat press); global actions clear-display, stop-all, stop-music, pause-music, resume-music, stop-sfx.
- Reserved keys (src/utils/keyLabels.js isReservedCode): KeyF (output fullscreen), F5, F11, F12, Tab, ContextMenu, and modifier/lock keys (Shift, Control, Alt, Meta, CapsLock, NumLock, ScrollLock, Fn).
- Rules: one mapping per key; each asset and each global action has at most one key. Assigning a new key to a target that already has one moves it. Assigning a key used by a different target returns a conflict; replace() overwrites it.
- Show keys are handled by src/hooks/useKeyboard.js (one capture-phase window keydown listener plus MSG.KEY from the output window, called once in App). Ignored: repeats, Ctrl/Meta/Alt combos, typing in input/textarea/select/contentEditable. Unmapped keys are never preventDefault-ed. The output window does not forward Ctrl/Meta/Alt combos.
- Suspension is a counter in src/engine/KeyboardEngine.js: suspendKeyboard() returns an idempotent release(). The preview modal and key capture (src/hooks/useKeyCapture.js) each hold one while active.
- Pruning: App removes mappings whose asset no longer exists, but ONLY when the library finished loading without error (a failed load must never wipe mappings).
- ToastProvider wraps <App /> in src/main.jsx (controller only), so useToast works inside App.
- src/engine/dispatch.js runAction(mapping, asset, ctx) performs the action (see Playback). Errors show a toast; successes only update "Last key pressed".

## Playback (Phase 4)
- The controller is the brain. src/engine/dispatch.js decides and sends EXPLICIT commands (never "toggle") to the output over BroadcastChannel; payloads carry asset IDs only.
- Protocol (src/engine/commands.js): MSG.CMD (controller -> output, payload { name, ...args }): SHOW_VIDEO {assetId, seq}, SHOW_IMAGE {assetId}, CLEAR_DISPLAY, MUSIC_START {assetId}, MUSIC_STOP, MUSIC_PAUSE, MUSIC_RESUME, SFX_PLAY {assetId}, SFX_STOP, STOP_ALL, SETTINGS {settings}, PRELOAD {assets:[{id,type}]}. MSG.EVENT (output -> controller): VIDEO_ENDED {assetId, seq}, ERROR {message}. On MSG.HELLO the controller resends SETTINGS and PRELOAD and resets its screen state (the output starts black).
- Engine modules:
  - mediaUrls.js: per-window cache of object URLs (getAssetUrl dedupes in-flight loads, null if the blob is missing; revokeAll).
  - audioSettings.js: localStorage "rmc.audio.v1" { master, music, sfx, video (0..1), controllerAudio, outputAudio }; effectiveVolume = master * channel.
  - AudioEngine.js: createAudioEngine({ role, settings, onError, getAssetName }); one looping music element, one reusable element per sfx. Each window has its own instance (module-level singleton, StrictMode safe).
  - playbackState.js: controller-only external store (video, image, music, sfxCount) for the Dashboard "Now playing" card.
  - Hooks: usePlayback (controller engine, EVENT handling, preload), useAudioSettings (persist + apply + send SETTINGS).
- Behaviour rules:
  - Video and images show only in the output. Video sound plays only in the output.
  - A video ending returns to the base image (last shown image) or black. Showing an image stops a playing video.
  - clear-display clears the screen only (music/sfx keep playing). stop-all stops video, music and sfx and clears the screen.
  - Display actions fail with "Output window is not connected" when the output is closed. Audio actions and stop-all still work locally.
  - play-music toggles: if that track is the controller's current music it sends MUSIC_STOP, otherwise MUSIC_START (which replaces any current track). sfx restart from 0 on repeat press; different sfx overlap.
  - Audio plays in BOTH windows through the same engine. controllerAudio / outputAudio mute that window's music/sfx (elements keep playing muted so state stays consistent). Video volume = master * video and is not affected by the two flags.
  - Races: every async step (blob load, image decode, play()) checks a monotonically increasing token and aborts if superseded. VIDEO_ENDED carries the seq of the video so a stale end event never clears a newer video.
- Known limitation: an output window opened (or reloaded) mid-song does not join the running music; the next music command syncs it.
