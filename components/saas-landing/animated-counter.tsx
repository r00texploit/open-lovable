"use client";

import { motion, useSpring, useTransform, useInView } from "framer-motion";
import { useRef, useEffect } from "react";

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  duration = 2,
  className = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const spring = useSpring(0, {
    duration: duration * 1000,
    bounce: 0,
  });

  const display = useTransform(spring, (current) =>
    Math.floor(current).toLocaleString()
  );

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, spring, value]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}

interface AnimatedStatProps {
  value: number;
  suffix?: string;
  label: string;
  sublabel: string;
  delay?: number;
}

export function AnimatedStat({
  value,
  suffix = "",
  label,
  sublabel,
  delay = 0,
}: AnimatedStatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const spring = useSpring(0, {
    duration: 2000,
    bounce: 0,
  });

  const display = useTransform(spring, (current) =>
    Math.floor(current).toLocaleString()
  );

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        spring.set(value);
      }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [isInView, spring, value, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="text-left group"
    >
      <div className="text-3xl sm:text-4xl font-semibold bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent group-hover:from-violet-300 group-hover:to-fuchsia-300 transition-all duration-500">
        <motion.span>{display}</motion.span>
        {suffix}
      </div>
      <div className="text-sm text-white/70 font-medium mt-1">{label}</div>
      <div className="text-xs text-white/40 mt-0.5">{sublabel}</div>
    </motion.div>
  );
}
