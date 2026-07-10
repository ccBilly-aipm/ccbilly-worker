"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Minimal polling fetch hook (avoids pulling in SWR). Fetches `url` on mount and
 * every `intervalMs`. Returns { data, error, loading, refresh }.
 */
export default function usePoll<T>(url: string, intervalMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as T;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    let active = true;
    void load();
    if (intervalMs > 0) {
      const id = setInterval(() => {
        if (active) void load();
      }, intervalMs);
      return () => {
        active = false;
        clearInterval(id);
      };
    }
    return () => {
      active = false;
    };
  }, [load, intervalMs]);

  return { data, error, loading, refresh: load };
}
