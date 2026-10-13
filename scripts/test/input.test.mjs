import test from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../../src/input.js';

// Bound: DOM-event adapter buffering and reset behavior, without a browser or game.
function setup(t, callbacks = {}) {
  const names = ['window', 'document', 'HTMLElement'];
  const old = names.map((name) => Object.getOwnPropertyDescriptor(globalThis, name));
  class HtmlElement extends EventTarget {}
  class Canvas extends HtmlElement {
    width = 640;
    height = 360;
    getBoundingClientRect() { return { left: 20, top: 10, width: 1280, height: 720 }; }
    focus() {}
  }
  Object.defineProperty(globalThis, 'window', { value: new EventTarget(), configurable: true });
  Object.defineProperty(globalThis, 'document', { value: new EventTarget(), configurable: true });
  Object.defineProperty(globalThis, 'HTMLElement', { value: HtmlElement, configurable: true });
  const canvas = new Canvas();
  const input = createInput(canvas, callbacks);
  input.setEnabled(true);
  const event = (target, type, properties = {}) => {
    const event = new Event(type, { cancelable: true });
    for (const [name, value] of Object.entries(properties)) Object.defineProperty(event, name, { value });
    target.dispatchEvent(event);
    return event;
  };
  t.after(() => {
    input.destroy();
    names.forEach((name, index) => { if (old[index]) Object.defineProperty(globalThis, name, old[index]); else delete globalThis[name]; });
  });
  return { input, canvas, event, window: globalThis.window, document: globalThis.document };
}

test('a quick press and release survives frames without a simulation step, then is consumed once', (t) => {
  const { input, event, window } = setup(t);
  event(window, 'keydown', { code: 'Space', repeat: false });
  event(window, 'keyup', { code: 'Space' });
  const first = input.sample();
  assert.equal(first.jumpPressed, true);
  assert.equal(first.jumpHeld, false);
  assert.equal(input.sample().jumpPressed, false);
});

test('multiple physical bindings preserve a hold until all are released', (t) => {
  const { input, event, window } = setup(t);
  event(window, 'keydown', { code: 'KeyD', repeat: false });
  event(window, 'keydown', { code: 'ArrowRight', repeat: false });
  event(window, 'keyup', { code: 'KeyD' });
  assert.equal(input.sample().right, true);
  event(window, 'keyup', { code: 'ArrowRight' });
  assert.equal(input.sample().right, false);
});

test('attack hold persists but auto-repeat does not repeat its edge', (t) => {
  const { input, event, window } = setup(t);
  event(window, 'keydown', { code: 'KeyJ', repeat: false });
  assert.equal(input.sample().attackPressed, true);
  event(window, 'keydown', { code: 'KeyJ', repeat: true });
  const held = input.sample();
  assert.equal(held.attackHeld, true);
  assert.equal(held.attackPressed, false);
});

test('disabling, blur, and hidden-document transitions discard held keys and pending actions', (t) => {
  const { input, event, window, document } = setup(t);
  for (const reset of [() => input.setEnabled(false), () => event(window, 'blur'), () => { document.hidden = true; event(document, 'visibilitychange'); }]) {
    input.setEnabled(true);
    event(window, 'keydown', { code: 'KeyA', repeat: false });
    event(window, 'keydown', { code: 'KeyK', repeat: false });
    reset();
    const value = input.sample();
    assert.equal(value.left, false);
    assert.equal(value.rollPressed, false);
  }
});

test('disabled menus do not buffer gameplay presses; pause hotkey still works', (t) => {
  let pauses = 0;
  const { input, event, window } = setup(t, { onPause: () => pauses++ });
  input.setEnabled(false);
  event(window, 'keydown', { code: 'KeyJ', repeat: false });
  event(window, 'keydown', { code: 'Escape', repeat: false });
  event(window, 'keydown', { code: 'Escape', repeat: true });
  input.setEnabled(true);
  assert.equal(input.sample().attackPressed, false);
  assert.equal(pauses, 1);
});

test('scaled mouse position, attack, roll, and context-menu suppression use the canvas path', (t) => {
  const { input, canvas, event, window } = setup(t);
  event(canvas, 'pointermove', { clientX: 660, clientY: 370 });
  event(canvas, 'pointerdown', { button: 0 });
  const first = input.sample();
  assert.deepEqual(first.pointer, { x: 320, y: 180 });
  assert.equal(first.attackPressed, true);
  assert.equal(first.attackHeld, true);
  event(window, 'pointerup', { button: 0 });
  assert.equal(input.sample().attackHeld, false);
  event(canvas, 'pointerdown', { button: 2 });
  assert.equal(input.sample().rollPressed, true);
  assert.equal(event(canvas, 'contextmenu').defaultPrevented, true);
});

test('destroy removes handlers and clears input', (t) => {
  const { input, event, window } = setup(t);
  event(window, 'keydown', { code: 'KeyA', repeat: false });
  input.destroy();
  event(window, 'keydown', { code: 'Space', repeat: false });
  const sample = input.sample();
  assert.equal(sample.left, false);
  assert.equal(sample.jumpPressed, false);
});
