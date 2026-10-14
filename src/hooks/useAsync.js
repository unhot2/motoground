import { useCallback, useEffect, useState } from 'react';

// 비동기 데이터를 불러오는 간단한 훅
// const { data, loading, error, reload } = useAsync(() => fetchSomething(a, b), [a, b]);
export default function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0); // reload() 로 다시 불러오기

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => {
        console.error(error);
        if (alive) setState({ data: null, loading: false, error });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload };
}
