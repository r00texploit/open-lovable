"use client";

import { motion } from "framer-motion";

interface SpotlightEffectProps {
  x: number;
  y: number;
  opacity: number;
  size?: number;
  color?: string;
}

export function SpotlightEffect({
  x,
  y,
  opacity,
  size = 600,
  color = "rgba(139, 92, 246, 0.15)",
}: SpotlightEffectProps) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity,
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    />
  );
}
