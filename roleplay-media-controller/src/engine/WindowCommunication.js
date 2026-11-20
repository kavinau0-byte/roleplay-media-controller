// Cross-window messaging between the controller and the output window.
// Carries small commands only (asset IDs etc.), never file blobs.

const CHANNEL_NAME = 'roleplay-media-controller'

export const MSG = Object.freeze({
  PING: 'PING',
  PONG: 'PONG',
  HELLO: 'HELLO',
  BYE: 'BYE',
  KEY: 'KEY',
})

let channel = null

function getChannel() {
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

export function send(type, payload = {}) {
  getChannel().postMessage({ type, payload, ts: Date.now() })
}

export function subscribe(handler) {
  const ch = getChannel()
  const listener = (event) => handler(event.data)
  ch.addEventListener('message', listener)
  return () => ch.removeEventListener('message', listener)
}
