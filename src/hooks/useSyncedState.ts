"use client";

import { useState, type Dispatch, type SetStateAction } from "react";

/**
 * State that resets when `syncKey` changes — replaces setState-in-effect for prop sync.
 */
export function useSyncedState<T>(
  syncKey: string | number,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState(initialValue);
  const [prevKey, setPrevKey] = useState(syncKey);

  if (syncKey !== prevKey) {
    setPrevKey(syncKey);
    setState(initialValue);
  }

  return [state, setState];
}
