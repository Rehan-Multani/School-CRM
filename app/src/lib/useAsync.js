import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getLastWriteAt, withSignal } from '../api/client';
import { peekCache, readCache, writeCache } from './cache';

// A screen regaining focus reloads only if its data could be out of date:
// something was saved since it loaded (coming back from a create/edit screen),
// or it is older than this. Plain back-and-forth navigation costs no request.
const FOCUS_STALE_MS = 30000;
export function staleOnFocus(loadedAt) {
  return getLastWriteAt() >= loadedAt || Date.now() - loadedAt > FOCUS_STALE_MS;
}

const EMPTY = { data: null, error: null, loading: true, stale: false, cachedAt: null, dataKey: null };
const fromCache = (hit, key) => ({ data: hit.data, error: null, loading: true, stale: false, cachedAt: hit.at, dataKey: key });

// Load-once data hook: `{ data, error, loading, stale, cachedAt, reload, setData }`.
// `refetchOnFocus` reloads (silently) when the screen regains focus with stale
// data (see staleOnFocus), so a list is fresh after a create/edit screen.
// `cacheKey` (read-only screens): the last result is shown at once — from
// memory, or from disk after a restart — while the fresh copy loads, and stays
// on screen when the network fails (`stale` is then true). Never set it on a
// screen whose data seeds an edit form.
export function useAsync(fn, deps = [], { refetchOnFocus = false, cacheKey } = {}) {
  const key = cacheKey ? `${cacheKey}:${JSON.stringify(deps)}` : null;
  const [state, setState] = useState(() => {
    const hit = key ? peekCache(key) : null;
    return hit ? fromCache(hit, key) : EMPTY;
  });
  // Filters changed (another day / child): show that key's saved copy right away.
  const [prevKey, setPrevKey] = useState(key);
  if (prevKey !== key) {
    setPrevKey(key);
    const hit = key ? peekCache(key) : null;
    if (hit) setState(fromCache(hit, key));
  }

  const fnRef = useRef(fn);
  fnRef.current = fn;
  const keyRef = useRef(key);
  keyRef.current = key;
  const mounted = useRef(true);
  const first = useRef(true);
  const loadedAt = useRef(0);
  const aborter = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      aborter.current?.abort();
    };
  }, []);

  // Only the newest request may write state: when deps change quickly (stepping
  // through days) an older response can land last and would show the wrong day.
  // The older request is also cancelled, so it stops using the connection.
  const latest = useRef(0);

  const reload = useCallback(async ({ silent = false } = {}) => {
    const id = ++latest.current;
    const forKey = keyRef.current;
    const current = () => mounted.current && id === latest.current;
    aborter.current?.abort();
    const controller = new AbortController();
    aborter.current = controller;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    const startedAt = Date.now();
    try {
      const data = await withSignal(controller.signal, () => fnRef.current());
      if (forKey) writeCache(forKey, data);
      if (current()) {
        loadedAt.current = startedAt;
        setState({ data, error: null, loading: false, stale: false, cachedAt: null, dataKey: forKey });
      }
      return data;
    } catch (error) {
      // Saved data stays on screen; `stale` tells the screen it could not be refreshed.
      if (current()) setState((s) => ({ ...s, error, loading: false, stale: s.data != null }));
      return undefined;
    }
  }, []);

  useEffect(() => {
    first.current = true;
    reload();
    if (!key) return;
    // After a restart the memory cache is empty: fall back to the disk copy,
    // unless the network already answered.
    const id = latest.current;
    readCache(key).then((hit) => {
      if (!hit || !mounted.current || id !== latest.current) return;
      setState((s) => (s.loading && s.dataKey !== key ? fromCache(hit, key) : s));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      if (!refetchOnFocus) return;
      if (first.current) {
        first.current = false;
        return;
      }
      if (staleOnFocus(loadedAt.current)) reload({ silent: true });
    }, [refetchOnFocus, reload]),
  );

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}
