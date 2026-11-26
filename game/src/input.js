// Skyward Rally - keyboard input. One job: turn key events into a small axis snapshot.

const HELD = new Set();
const PRESSED = new Set();

const GAME_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE',
  'Space', 'Enter', 'KeyR',
]);

export function createInput(target = window) {
  target.addEventListener('keydown', (event) => {
    if (!GAME_KEYS.has(event.code)) return;
    event.preventDefault();
    if (!HELD.has(event.code)) PRESSED.add(event.code);
    HELD.add(event.code);
  });
  target.addEventListener('keyup', (event) => {
    if (!GAME_KEYS.has(event.code)) return;
    event.preventDefault();
    HELD.delete(event.code);
  });
  target.addEventListener('blur', () => HELD.clear());

  return {
    axis() {
      const down = (code) => HELD.has(code);
      const pitch = (down('ArrowUp') || down('KeyW') ? 1 : 0) - (down('ArrowDown') || down('KeyS') ? 1 : 0);
      const turn = (down('ArrowRight') || down('KeyD') ? 1 : 0) - (down('ArrowLeft') || down('KeyA') ? 1 : 0);
      const throttle = (down('KeyE') ? 1 : 0) - (down('KeyQ') ? 1 : 0);
      return { pitch, turn, throttle };
    },
    consume(action) {
      const codes = action === 'start' ? ['Enter', 'Space'] : ['KeyR', 'Enter', 'Space'];
      const hit = codes.find((code) => PRESSED.has(code));
      if (!hit) return false;
      PRESSED.delete(hit);
      return true;
    },
    clear() {
      HELD.clear();
      PRESSED.clear();
    },
  };
}
