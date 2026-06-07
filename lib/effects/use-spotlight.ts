"use client";

import { useRef, useState, useCallback, RefObject } from "react";

interface SpotlightState {
  x: number;
  y: number;
  opacity: number;
}

export function useSpotlight<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  spotlight: SpotlightState;
  handlers: {
    onMouseMove: (e: React.MouseEvent<T>) => void;
    onMouseLeave: () => void;
    onMouseEnter: () => void;
  };
} {
  const ref = useRef<T>(null);
  const [spotlight, setSpotlight] = useState<SpotlightState>({
    x: 50,
    y: 50,
    opacity: 0,
  });

  const handleMouseMove = useCallback((e: React.MouseEvent<T>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setSpotlight((prev) => ({
      ...prev,
      x,
      y,
    }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setSpotlight((prev) => ({
      ...prev,
      opacity: 0,
    }));
  }, []);

  const handleMouseEnter = useCallback(() => {
    setSpotlight((prev) => ({
      ...prev,
      opacity: 1,
    }));
  }, []);

  return {
    ref,
    spotlight,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
      onMouseEnter: handleMouseEnter,
    },
  };
}
