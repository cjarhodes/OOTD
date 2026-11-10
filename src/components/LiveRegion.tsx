"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A polite live region, visually hidden and out of the layout, for saying what
 * just happened. A message is cleared and set again on the next tick, so the
 * same words twice in a row ("Skipped", "Skipped") are still read out.
 */
export function useAnnouncer(): { text: string; say: (message: string) => void } {
  const [text, setText] = useState("");
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  const say = useCallback((message: string) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setText("");
    timer.current = window.setTimeout(() => setText(message), 40);
  }, []);
  return { text, say };
}

export function LiveRegion({ text }: { text: string }) {
  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      {text}
    </p>
  );
}
