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
