"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny external store for the command palette open state (no extra deps).
 * The palette UI itself is implemented in M6; M1 only needs the open/close API
 * so the topbar buttons compile and wire up.
 */

type Mode = "search" | "new";

interface PaletteState {
  isOpen: boolean;
  mode: Mode;
}

let state: PaletteState = { isOpen: false, mode: "search" };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const paletteStore = {
  open(mode: Mode = "search") {
    state = { isOpen: true, mode };
    emit();
  },
  close() {
    state = { ...state, isOpen: false };
    emit();
  },
  toggle() {
    state = { ...state, isOpen: !state.isOpen };
    emit();
  },
  get() {
    return state;
  },
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

export function useCommandPalette<T>(selector: (s: typeof paletteStore & PaletteState) => T): T {
  const snapshot = useSyncExternalStore(
    paletteStore.subscribe,
    () => state,
    () => state,
  );
  return selector({ ...paletteStore, ...snapshot });
}
