"use client";

import { useState, useEffect, useCallback } from "react";

interface UseTypingOptions {
  text: string;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
}

export function useTyping({
  text,
  speed = 50,
  delay = 0,
  onComplete,
}: UseTypingOptions): {
  displayedText: string;
  isTyping: boolean;
  reset: () => void;
} {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (hasStarted) return;

    const startTimeout = setTimeout(() => {
      setHasStarted(true);
      setIsTyping(true);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [delay, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    if (displayedText.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(text.slice(0, displayedText.length + 1));
      }, speed);

      return () => clearTimeout(timeout);
    } else {
      setIsTyping(false);
      onComplete?.();
    }
  }, [displayedText, text, speed, hasStarted, onComplete]);

  const reset = useCallback(() => {
    setDisplayedText("");
    setIsTyping(false);
    setHasStarted(false);
  }, []);

  return { displayedText, isTyping, reset };
}
