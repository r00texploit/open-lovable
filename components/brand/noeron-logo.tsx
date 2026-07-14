"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type NoeronLogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  variant?: "light" | "dark";
};

/**
 * Tailwind v3 default spacing scale for `h-*` utility classes.
 * Values are in px (assuming 1rem = 16px). Dynamic values (h-full, h-screen,
 * h-auto, etc.) fall back to the default 40px.
 */
const TAILWIND_HEIGHT_PX: Record<string, number> = {
  "h-0": 0,
  "h-0.5": 2,
  "h-1": 4,
  "h-1.5": 6,
  "h-2": 8,
  "h-2.5": 10,
  "h-3": 12,
  "h-3.5": 14,
  "h-4": 16,
  "h-5": 20,
  "h-6": 24,
  "h-7": 28,
  "h-8": 32,
  "h-9": 36,
  "h-10": 40,
  "h-11": 44,
  "h-12": 48,
  "h-14": 56,
  "h-16": 64,
  "h-20": 80,
  "h-24": 96,
  "h-28": 112,
  "h-32": 128,
  "h-36": 144,
  "h-40": 160,
  "h-44": 176,
  "h-48": 192,
  "h-52": 208,
  "h-56": 224,
  "h-60": 240,
  "h-64": 256,
  "h-72": 288,
  "h-80": 320,
  "h-96": 384,
  "h-px": 1,
};

function parseHeight(className: string): number {
  const pxMatch = className.match(/h-\[(\d+(?:\.\d+)?)px\]/);
  if (pxMatch) return parseFloat(pxMatch[1]);

  const remMatch = className.match(/h-\[(\d+(?:\.\d+)?)rem\]/);
  if (remMatch) return parseFloat(remMatch[1]) * 16;

  const tailwindMatch = className.match(/h-(\d+(?:\.\d+)?)\b/);
  if (tailwindMatch) {
    const key = `h-${tailwindMatch[1]}`;
    const mapped = TAILWIND_HEIGHT_PX[key];
    if (mapped !== undefined) return mapped;
  }

  return 40;
}

export function NoeronLogo({
  className = "",
  iconClassName = "h-[40px] w-[40px]",
  showText = true,
  variant = "dark",
}: NoeronLogoProps) {
  const height = parseHeight(iconClassName);
  const src = variant === "light" ? "/brand/logo-light.png" : "/brand/logo-dark.png";

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Image
        src={src}
        alt="Noeron"
        width={height}
        height={height}
        className={cn("shrink-0", iconClassName)}
        priority
      />
      {showText ? (
        <span className={cn("font-semibold tracking-[-0.02em]")}>Noeron</span>
      ) : null}
    </span>
  );
}
