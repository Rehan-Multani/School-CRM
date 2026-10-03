import { AppState } from 'react-native';

// Android reports "active" again after every permission dialog, image /
// document picker, share sheet and payment screen — not only when the user
// really comes back to the app. Re-checking the server on each of those is a
// burst of requests for nothing, so a foreground check runs at most once per gap.
export const FOREGROUND_MIN_GAP_MS = 30000;

/**
 * Calls `fn` when the app returns to the foreground, unless it last ran (or the
 * listener was added) less than `minGapMs` ago. Returns the unsubscribe function.
 */
export function onAppForeground(fn, minGapMs = FOREGROUND_MIN_GAP_MS) {
  let last = Date.now();
  const sub = AppState.addEventListener('change', (state) => {
    if (state !== 'active' || Date.now() - last < minGapMs) return;
    last = Date.now();
    fn();
  });
  return () => sub.remove();
}

/**
 * Runs `fn` every `ms` only while the app is on screen. A backgrounded app must
 * not keep waking the radio for a badge nobody is looking at; the foreground
 * hook above refreshes it again when the user comes back.
 */
export function pollWhileActive(fn, ms) {
  let timer = null;
  const start = () => {
    if (!timer) timer = setInterval(fn, ms);
  };
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  if (AppState.currentState !== 'background') start();
  const sub = AppState.addEventListener('change', (state) => (state === 'active' ? start() : stop()));
  return () => {
    stop();
    sub.remove();
  };
}
