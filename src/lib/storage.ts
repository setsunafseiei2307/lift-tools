/**
 * 入力値の保存。プライベートブラウジング等で localStorage が使えない環境でも
 * 例外で画面が落ちないように、メモリ上のフォールバックを持つ。
 */

import { useCallback, useEffect, useState } from 'react';

const memoryStore = new Map<string, string>();
const PREFIX = 'lift-tools:';

function available(): boolean {
  try {
    const key = `${PREFIX}__test`;
    window.localStorage.setItem(key, '1');
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

let canUseLocalStorage: boolean | null = null;

export function load<T>(key: string, fallback: T): T {
  if (canUseLocalStorage === null) canUseLocalStorage = available();
  try {
    const raw = canUseLocalStorage
      ? window.localStorage.getItem(PREFIX + key)
      : (memoryStore.get(key) ?? null);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  if (canUseLocalStorage === null) canUseLocalStorage = available();
  try {
    const raw = JSON.stringify(value);
    if (canUseLocalStorage) window.localStorage.setItem(PREFIX + key, raw);
    else memoryStore.set(key, raw);
  } catch {
    /* 保存できなくても機能は続行する */
  }
}

/** useState と同じ使い勝手で、値を自動保存する */
export function usePersistentState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => load(key, initial));

  useEffect(() => {
    save(key, state);
  }, [key, state]);

  const set = useCallback((value: T) => setState(value), []);
  return [state, set];
}
