"use client";

import { useRef, useState, useCallback, RefObject } from "react";

interface TiltOptions {
  maxTilt?: number;
  scale?: number;
  speed?: number;
  glare?: boolean;
  maxGlare?: number;
}

interface TiltState {
  x: number;
  y: number;
  glareX: number;
  glareY: number;
  glareOpacity: number;
}

export function useTilt<T extends HTMLElement>(
  options: TiltOptions = {}
): {
  ref: RefObject<T | null>;
  tilt: TiltState;
  handlers: {
    onMouseMove: (e: React.MouseEvent<T>) => void;
    onMouseLeave: () => void;
    onMouseEnter: () => void;
  };
  style: React.CSSProperties;
} {
  const {
    maxTilt = 15,
    scale = 1.02,
    glare = true,
    maxGlare = 0.3,
  } = options;

  const ref = useRef<T>(null);
  const [tilt, setTilt] = useState<TiltState>({
    x: 0,
    y: 0,
    glareX: 50,
    glareY: 50,
    glareOpacity: 0,
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<T>) => {
      if (!ref.current) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;

      const rotateX = (mouseY / (rect.height / 2)) * -maxTilt;
      const rotateY = (mouseX / (rect.width / 2)) * maxTilt;

      const glareX = ((e.clientX - rect.left) / rect.width) * 100;
      const glareY = ((e.clientY - rect.top) / rect.height) * 100;

      setTilt({
        x: rotateX,
        y: rotateY,
        glareX,
        glareY,
        glareOpacity: glare ? maxGlare : 0,
      });
    },
    [maxTilt, glare, maxGlare]
  );

  const handleMouseLeave = useCallback(() => {
    setTilt({
      x: 0,
      y: 0,
      glareX: 50,
      glareY: 50,
      glareOpacity: 0,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    // Could add entry animation here
  }, []);

  const style: React.CSSProperties = {
    transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${scale}, ${scale}, ${scale})`,
    transformStyle: "preserve-3d",
    transition: "transform 0.1s ease-out",
  };

  return {
    ref,
    tilt,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
      onMouseEnter: handleMouseEnter,
    },
    style,
  };
}
