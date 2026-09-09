import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../data/http';

export function useApiResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  useEffect(() => {
    if (!path) { setData(null); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);
    apiRequest<T>(path, { signal: controller.signal }).then(result => { if (!controller.signal.aborted) setData(result); }).catch(reason => {
      if (!controller.signal.aborted) setError(reason.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, version]);
  return { data, loading, error, reload };
}
