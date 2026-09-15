import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

// One place for the "load on focus, show skeleton first time, silent refetch
// afterwards, drop stale responses, expose pull-to-refresh" pattern that was
// copy-pasted (with slightly different bugs) into a dozen screens.
//
//   const { data, status, error, refreshing, refresh, reload, setData } =
//     useFocusedFetch(() => api.get('/x').then((r) => r.data), [dep]);
//
// status: 'loading' (no data yet) | 'ready' | 'error'
export default function useFocusedFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const reqId = useRef(0);
  const hasData = useRef(false);

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++reqId.current;
    if (!silent && !hasData.current) setStatus('loading');
    try {
      const result = await fetcher();
      if (id !== reqId.current) return;
      hasData.current = true;
      setData(result);
      setError(null);
      setStatus('ready');
    } catch (err) {
      if (id !== reqId.current) return;
      setError(err?.message || 'Something went wrong');
      if (!hasData.current) setStatus('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useFocusEffect(useCallback(() => { run({ silent: true }); }, [run]));

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await run({ silent: true });
    setRefreshing(false);
  }, [run]);

  const reload = useCallback(() => {
    hasData.current = false;
    return run();
  }, [run]);

  return { data, status, error, refreshing, refresh, reload, setData };
}
