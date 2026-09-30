import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

// Load-once data hook: `{ data, error, loading, reload, setData }`.
// `refetchOnFocus` reloads (silently) whenever the screen regains focus, so a
// list is fresh after coming back from a create/edit screen.
export function useAsync(fn, deps = [], { refetchOnFocus = false } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const mounted = useRef(true);
  const first = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (mounted.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (mounted.current) setState((s) => ({ ...s, error, loading: false }));
      return undefined;
    }
  }, []);

  useEffect(() => {
    first.current = true;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(
    useCallback(() => {
      if (!refetchOnFocus) return;
      if (first.current) {
        first.current = false;
        return;
      }
      reload({ silent: true });
    }, [refetchOnFocus, reload]),
  );

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}
