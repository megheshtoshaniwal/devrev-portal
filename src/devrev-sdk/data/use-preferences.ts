"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "../hooks/use-session";
import type { PreferencesSchema } from "./types";

interface UsePreferencesOptions {
  /** Namespace for this set of preferences (e.g., "tickets", "conversations") */
  namespace: string;
  /** Default values if nothing is stored */
  defaults?: Partial<PreferencesSchema>;
  /** Debounce delay for writes in ms (default: 500) */
  debounceMs?: number;
}

interface UsePreferencesReturn {
  /** Current preferences (merged defaults + stored) */
  preferences: PreferencesSchema;
  /** Whether initial load from storage is complete */
  loaded: boolean;
  /** Update a single preference key */
  set: <K extends keyof PreferencesSchema>(key: K, value: PreferencesSchema[K]) => void;
  /** Update multiple keys at once */
  merge: (partial: Partial<PreferencesSchema>) => void;
  /** Clear all stored preferences for this namespace */
  clear: () => void;
}

function storageKey(userId: string, namespace: string): string {
  return `devrev:prefs:${userId}:${namespace}`;
}

function readStorage(key: string): PreferencesSchema | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as PreferencesSchema;
  } catch {
    return null;
  }
}

function writeStorage(key: string, data: PreferencesSchema): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently degrade
  }
}

export function usePreferences({
  namespace,
  defaults = {},
  debounceMs = 500,
}: UsePreferencesOptions): UsePreferencesReturn {
  const { user } = useSession();
  const userId = user?.id || "anon";
  const key = storageKey(userId, namespace);

  const [preferences, setPreferences] = useState<PreferencesSchema>(
    () => ({ ...defaults })
  );
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyRef = useRef(key);
  keyRef.current = key;

  // Load from storage on mount / when user changes
  useEffect(() => {
    const stored = readStorage(key);
    if (stored) {
      setPreferences((prev) => ({ ...defaults, ...stored }));
    } else {
      setPreferences({ ...defaults });
    }
    setLoaded(true);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced persist
  const persist = useCallback(
    (data: PreferencesSchema) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        writeStorage(keyRef.current, data);
      }, debounceMs);
    },
    [debounceMs]
  );

  const set = useCallback(
    <K extends keyof PreferencesSchema>(k: K, value: PreferencesSchema[K]) => {
      setPreferences((prev) => {
        const next = { ...prev, [k]: value };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const merge = useCallback(
    (partial: Partial<PreferencesSchema>) => {
      setPreferences((prev) => {
        const next = { ...prev, ...partial };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(keyRef.current);
    } catch {
      // ignore
    }
    setPreferences({ ...defaults });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { preferences, loaded, set, merge, clear };
}
