// Friendly labels and reserved-key rules for KeyboardEvent.code values.

const SPECIAL_LABELS = {
  Escape: 'Esc',
  Space: 'Space',
  Enter: 'Enter',
  NumpadEnter: 'Num Enter',
  Backspace: 'Backspace',
  Delete: 'Del',
  Insert: 'Ins',
  Home: 'Home',
  End: 'End',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  IntlBackslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num -',
  NumpadMultiply: 'Num *',
  NumpadDivide: 'Num /',
  NumpadDecimal: 'Num .',
  NumpadEqual: 'Num =',
  PrintScreen: 'PrtSc',
  Pause: 'Pause',
}

export function keyLabel(code) {
  if (!code) return ''
  if (SPECIAL_LABELS[code]) return SPECIAL_LABELS[code]
  let m = /^Key([A-Z])$/.exec(code)
  if (m) return m[1]
  m = /^Digit(\d)$/.exec(code)
  if (m) return m[1]
  m = /^Numpad(\d)$/.exec(code)
  if (m) return `Num ${m[1]}`
  return code // F1..F12 and anything unknown
}

const MODIFIER_OR_LOCK = new Set([
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
  'MetaLeft', 'MetaRight', 'CapsLock', 'NumLock', 'ScrollLock', 'Fn',
])

// Returns a reason string if the key cannot be mapped, otherwise null.
export function isReservedCode(code) {
  if (code === 'KeyF') return 'F toggles fullscreen in the output window'
  if (code === 'F5' || code === 'F11' || code === 'F12') return 'Browser key'
  if (code === 'Tab') return 'Tab is used for keyboard navigation'
  if (code === 'ContextMenu') return 'Context menu key'
  if (MODIFIER_OR_LOCK.has(code)) return 'Modifier or lock key'
  return null
}
