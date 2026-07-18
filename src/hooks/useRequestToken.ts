import { useCallback, useRef } from 'react';

/**
 * Guards against out-of-order async responses ("last response wins" races).
 *
 * Call the returned `begin()` when a new request or batch of requests starts.
 * It bumps an internal counter and returns an `isCurrent()` predicate that stays
 * true only until the next `begin()`. Check `isCurrent()` after every `await`,
 * immediately before calling `setState`, and bail out when it returns false so a
 * slow earlier request can't overwrite the state of a newer one.
 *
 * Works in both effects and event handlers, and composes across a chain of
 * fetches (pass the same `isCurrent` into each step).
 *
 *   const begin = useRequestToken();
 *   const load = useCallback(async () => {
 *     const isCurrent = begin();
 *     const data = await fetchThing();
 *     if (!isCurrent()) return;      // a newer load() started; drop this result
 *     setThing(data);
 *   }, [begin]);
 */
export function useRequestToken(): () => (() => boolean) {
  const ref = useRef(0);
  return useCallback(() => {
    const token = ++ref.current;
    return () => token === ref.current;
  }, []);
}
