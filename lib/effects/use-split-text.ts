"use client";

import { useMemo } from "react";

interface SplitTextResult {
  words: string[];
  getWordProps: (index: number) => {
    initial: { opacity: number; y: number; filter: string };
    animate: { opacity: number; y: number; filter: string };
    transition: { duration: number; delay: number; ease: number[] };
  };
}

export function useSplitText(
  text: string,
  baseDelay: number = 0
): SplitTextResult {
  const words = useMemo(() => text.split(" "), [text]);

  const EASE = [0.25, 0.46, 0.45, 0.94];

  const getWordProps = (index: number) => ({
    initial: { opacity: 0, y: 40, filter: "blur(10px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: {
      duration: 0.6,
      delay: baseDelay + index * 0.08,
      ease: EASE,
    },
  });

  return { words, getWordProps };
}

export function useCharacterAnimation(
  text: string,
  baseDelay: number = 0
): {
  characters: string[];
  getCharProps: (index: number) => {
    initial: { opacity: number; y: number };
    animate: { opacity: number; y: number };
    transition: { duration: number; delay: number };
  };
} {
  const characters = useMemo(() => text.split(""), [text]);

  const getCharProps = (index: number) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.04,
      delay: baseDelay + index * 0.03,
    },
  });

  return { characters, getCharProps };
}
