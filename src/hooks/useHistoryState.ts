"use client";

import { useCallback, useState } from "react";

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistoryState<T>(initialPresent: T) {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    setState((current) => {
      if (current.past.length === 0) return current;
      const previous = current.past[current.past.length - 1];
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      if (current.future.length === 0) return current;
      const next = current.future[0];
      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1),
      };
    });
  }, []);

  const set = useCallback(
    (updater: T | ((prev: T) => T), overwrite = false) => {
      setState((current) => {
        const nextPresent =
          typeof updater === "function"
            ? (updater as (prev: T) => T)(current.present)
            : updater;

        if (!overwrite && nextPresent === current.present) return current;

        if (overwrite) {
          return { past: [], present: nextPresent, future: [] };
        }

        const nextPast = [...current.past, current.present];
        if (nextPast.length > 50) nextPast.shift();

        return {
          past: nextPast,
          present: nextPresent,
          future: [],
        };
      });
    },
    [],
  );

  return { state: state.present, set, undo, redo, canUndo, canRedo };
}
