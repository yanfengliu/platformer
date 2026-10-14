const KEY_ACTIONS = {
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'jump', KeyW: 'jump', ArrowUp: 'jump', KeyS: 'down', ArrowDown: 'down',
  KeyJ: 'attack', KeyK: 'roll', ShiftLeft: 'roll', ShiftRight: 'roll',
  KeyF: 'heal', KeyE: 'interact',
};

const EDGE_NAMES = {
  jump: 'jumpPressed', attack: 'attackPressed', roll: 'rollPressed',
  heal: 'healPressed', interact: 'interactPressed',
};

function isEditable(target) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/** Buffers edges until the next simulation step; holds use physical key codes. */
export function createInput(canvas, { onActivity = () => {}, onPause = () => {}, onHelp = () => {}, onMute = () => {}, onClear = () => {} } = {}) {
  const keys = new Set();
  const edges = new Set();
  const mouse = new Set();
  let enabled = false;
  let pointer = { x: 0, y: 0 };
  const listeners = [];

  const listen = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  };

  const clear = () => {
    keys.clear();
    edges.clear();
    mouse.clear();
    onClear();
  };

  const held = (action) => [...keys].some((code) => KEY_ACTIONS[code] === action);

  listen(window, 'keydown', (event) => {
    if (isEditable(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
    const hotkey = { Escape: onPause, KeyH: onHelp, KeyM: onMute }[event.code];
    if (hotkey) {
      event.preventDefault();
      if (!event.repeat) {
        onActivity();
        hotkey();
      }
      return;
    }
    const action = KEY_ACTIONS[event.code];
    if (!enabled || !action) return;
    event.preventDefault();
    if (!keys.has(event.code) && !event.repeat) {
      onActivity();
      if (EDGE_NAMES[action]) edges.add(EDGE_NAMES[action]);
    }
    keys.add(event.code);
  });

  listen(window, 'keyup', (event) => {
    keys.delete(event.code);
    if (enabled && KEY_ACTIONS[event.code]) event.preventDefault();
  });

  listen(canvas, 'pointermove', (event) => {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    // object-fit: contain can letterbox the native view at narrow viewport sizes.
    const scale = Math.min(bounds.width / canvas.width, bounds.height / canvas.height);
    const left = bounds.left + (bounds.width - canvas.width * scale) / 2;
    const top = bounds.top + (bounds.height - canvas.height * scale) / 2;
    pointer = {
      x: Math.max(0, Math.min(canvas.width, (event.clientX - left) / scale)),
      y: Math.max(0, Math.min(canvas.height, (event.clientY - top) / scale)),
    };
  });

  listen(canvas, 'pointerdown', (event) => {
    if (!enabled || (event.button !== 0 && event.button !== 2)) return;
    event.preventDefault();
    onActivity();
    canvas.focus({ preventScroll: true });
    mouse.add(event.button);
    edges.add(event.button === 0 ? 'attackPressed' : 'rollPressed');
  });
  listen(window, 'pointerup', (event) => mouse.delete(event.button));
  listen(window, 'pointercancel', () => mouse.clear());
  listen(canvas, 'contextmenu', (event) => event.preventDefault());
  listen(window, 'blur', clear);
  listen(document, 'visibilitychange', () => { if (document.hidden) clear(); });

  return {
    sample() {
      const sample = {
        left: held('left'), right: held('right'), jumpHeld: held('jump'), downHeld: held('down'),
        attackHeld: held('attack') || mouse.has(0), pointer: { ...pointer },
        jumpPressed: false, attackPressed: false, rollPressed: false, healPressed: false, interactPressed: false,
      };
      for (const edge of edges) sample[edge] = true;
      edges.clear();
      return sample;
    },
    setEnabled(value) { enabled = Boolean(value); clear(); },
    clear,
    destroy() { clear(); listeners.forEach((remove) => remove()); },
  };
}
