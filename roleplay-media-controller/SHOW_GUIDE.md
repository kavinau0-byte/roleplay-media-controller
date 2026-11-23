# Show Guide: Roleplay Media Controller

This app plays your prepared videos, pictures and sounds on the projector when you press a key.
Everything is stored inside Chrome on this laptop. Nothing goes to the internet.

Use **Google Chrome on the laptop** for everything below.

---

## 1. Start the app for the show

1. Open a terminal in the `roleplay-media-controller` folder.
2. Type `npm run show` and press Enter. Wait until it shows `Local: http://localhost:4173/`.
3. In Chrome, open **http://localhost:4173** (exactly this address).
4. Leave the terminal open during the whole show. Closing it stops the app.

> **The address matters.** Your media, keys and settings are saved for one exact address.
> `http://localhost:4173` (the show) and `http://localhost:5173` (used while preparing with `npm run dev`)
> are **two different places** with separate storage. If you prepared everything on 5173, make a
> backup there and restore it on 4173 (see section 3). Always use the same address on show day.

## 2. Set up the screens and sound

1. On the **Dashboard**, click **Open Output Window**. A black window opens.
   - If nothing opens, Chrome blocked the pop-up: click the pop-up icon at the right end of the
     address bar, choose "Always allow", and click the button again.
2. **Drag the black window onto the projector screen.**
   (The projector must be set to *Extend*, not *Duplicate*: Windows key + P → Extend.)
3. **Click once inside the black window.** It goes fullscreen and sound is unlocked.
   You can also press **F** inside it to switch fullscreen on and off.
4. Go to **Audio Settings → Output devices**:
   - Click **Detect devices**. Chrome may ask for the microphone: allow it. This is only to read the
     speaker names. Nothing is recorded.
   - Choose the laptop speakers for **Laptop speakers (this window)** and the projector/hall speakers
     for **Output window**.
   - Press **Test laptop sound** and **Test output sound** to hear each one.
   - If you hear the sound twice from the same speakers, untick one of the two boxes under
     "Where audio plays".
5. Click back on the main (controller) window.

## 3. Back up before the show

Do this after everything is prepared, and again whenever you change things.

1. Go to **Backup & Storage** and click **Back up to a folder**.
2. Choose an **empty folder** (a USB stick is ideal) and allow Chrome to save there.
3. Wait for "Backed up … media files". The folder now holds `manifest.json` and your media files.

**If the library looks empty:**

1. Check the address bar. It must be exactly the address you prepared on (for the show:
   `http://localhost:4173`). A different number after the colon is a different, empty place.
2. If the address is right and it is still empty: **Backup & Storage → Restore from a backup folder**,
   pick your backup folder, and confirm. Media, keys and audio settings come back.
   (When restoring on a different address, pick the audio devices again afterwards.)

Tip: on Backup & Storage, click **Request persistent storage** once, so Chrome does not delete the
library when the disk gets full.

## 4. Run the pre-show checks and start

1. Click **Presentation Mode** in the left menu. The screen becomes a big, calm show view.
2. Look at the **Pre-show checklist** at the top. Every automatic line should be green:
   output connected, fullscreen, audio unlocked, output audio device OK, keys mapped, files load OK.
3. Tick the manual items as you do them (charger, projector, volume, Do Not Disturb, other apps
   closed, test video and music played once).
4. Keep this window in front during the show. The key list shows every key and what it does.
   **Clear display** and **Stop all** are big buttons in case you need them.

## 5. Key rules

- **F** switches fullscreen on and off in the output window.
- **Esc** clears the projector screen (music keeps playing).
- **`** (backtick, the key left of 1) stops everything.
- Keys work when either the controller window or the output window is focused; just click the one you want.
- Do **not** open the app in two tabs at once.
- Do not close the output window during the show. If it happens, click **Open Output Window** again; the picture and music come back by themselves.

---

## Show-day checklist (one page)

| ✓ | Step |
|---|------|
| ☐ | Laptop charger plugged in |
| ☐ | Projector connected, Windows set to **Extend** (Windows key + P) |
| ☐ | Notifications off / Do Not Disturb on; other apps and Chrome tabs closed |
| ☐ | Terminal: `npm run show`, Chrome open at **http://localhost:4173** |
| ☐ | Library and keys are there (if not: restore from the backup folder) |
| ☐ | **Open Output Window**, drag it to the projector, click once inside it |
| ☐ | Audio Settings: right speakers chosen, both test sounds heard |
| ☐ | Laptop volume and projector / hall volume set |
| ☐ | One test video and one music track played and stopped |
| ☐ | Presentation Mode open, all automatic checks green |
| ☐ | Backup folder (USB stick) with you |

---

## Troubleshooting

| Problem | What to do |
|---|---|
| **No sound** | Click once inside the output window (it unlocks sound). Check the volume sliders on Audio Settings, the two "Where audio plays" boxes, and the laptop/projector volume. Press the test buttons. |
| **No picture on the projector** | Is the black window on the projector screen? Windows key + P → Extend. Is the output connected (green on the Dashboard)? A red toast means the file could not be played; check it in the Media Library. |
| **Keys do nothing** | Click on the controller or the output window first (a click in a text box or a dropdown can hold the keys). Check the key is in Keyboard Mappings. Keys never work while you are typing in a box. |
| **Sound comes out of the wrong speakers** | Audio Settings → Detect devices → choose the right device for each window → test again. |
| **Sound plays twice / echoes** | Both windows play on the same speakers. Choose different devices, or untick one of the "Where audio plays" boxes. If two devices are slightly out of step, use the Sync sliders and "Test both together". |
| **Output window was closed** | Click **Open Output Window** again, drag it to the projector and click once inside it. Picture and music restore themselves. |
| **Library is empty** | Check the address (must be the same as when you prepared). Then Backup & Storage → Restore from a backup folder. |
