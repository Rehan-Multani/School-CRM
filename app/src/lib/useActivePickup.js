import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

// Live Safe Pickup session — or a list of them — (the ones that may carry the OTP) for a screen that
// is on top. Fetches on focus and when the app returns to the foreground, then
// polls every `intervalMs` while focused and the app is active. One request in
// flight at a time. The result lives in component state ONLY (never cached or
// persisted) and is dropped when the app goes to the background.
export function useActivePickup(fetchActive, deps = [], intervalMs = 8000) {
  const [active, setActive] = useState(null);
  const fetchRef = useRef(fetchActive);
  useEffect(() => {
    fetchRef.current = fetchActive;
  });
  const key = JSON.stringify(deps);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let busy = false;
      setActive(null);
      const run = async () => {
        if (busy || AppState.currentState !== 'active') return;
        busy = true;
        try {
          const a = await fetchRef.current();
          const now = Date.now();
          if (alive) setActive(Array.isArray(a) ? a.map((x) => ({ ...x, receivedAt: now })) : a ? { ...a, receivedAt: now } : null);
        } catch {
          // keep the last value; the next tick retries
        } finally {
          busy = false;
        }
      };
      run();
      const timer = setInterval(run, intervalMs);
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'active') run();
        else if (alive) setActive(null);
      });
      return () => {
        alive = false;
        clearInterval(timer);
        sub.remove();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, intervalMs]),
  );

  return active;
}
