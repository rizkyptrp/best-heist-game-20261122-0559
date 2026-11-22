// input.js — keyboard and mouse, the two ways the thief is driven.
// Keys are read from a held set so diagonal movement just works; the mouse
// gives the canvas position of a click for throwing a noisemaker.

export function makeInput() {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    mouseX: 0,
    mouseY: 0,
    clicked: null, // { x, y } in canvas pixels, consumed once by the game
    pressedKeys: new Set(),
  };
}

const KEY_MAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export function attachInput(input, canvas) {
  window.addEventListener('keydown', (event) => {
    const mapped = KEY_MAP[event.code];
    if (mapped) {
      input[mapped] = true;
      event.preventDefault();
    }
    // A tap is a press even if the key is already up again before the next
    // frame: keyup must never erase it, or quick taps get lost between
    // frames. The game clears the set itself at the end of each frame.
    if (!event.repeat) input.pressedKeys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    const mapped = KEY_MAP[event.code];
    if (mapped) input[mapped] = false;
  });
  window.addEventListener('blur', () => {
    input.up = input.down = input.left = input.right = false;
    input.pressedKeys.clear();
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.clicked = {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  });
}

// A key pressed since the last frame; the game consumes it once.
export function wasPressed(input, code) {
  if (input.pressedKeys.has(code)) {
    input.pressedKeys.delete(code);
    return true;
  }
  return false;
}

// Called at the end of every frame, after the game has read the presses:
// anything still unclaimed was a press nobody acted on.
export function clearPressed(input) {
  input.pressedKeys.clear();
}

export function consumeClick(input) {
  const click = input.clicked;
  input.clicked = null;
  return click;
}
