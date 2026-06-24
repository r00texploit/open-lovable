"use client";

import { animate, cubicBezier } from "motion";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { NoeronLogo } from "@/components/brand/noeron-logo";
import { useHeaderContext } from "@/components/shared/header/HeaderContext";
import { cn } from "@/lib/utils";

import Download from "./_svg/Download";
import Guidelines from "./_svg/Guidelines";
import Icon from "./_svg/Icon";

export default function HeaderBrandKit() {
  const [open, setOpen] = useState(false);
  const { dropdownContent, clearDropdown } = useHeaderContext();

  useEffect(() => {
    document.addEventListener("click", () => {
      setOpen(false);
    });
  }, [open]);

  useEffect(() => {
    if (dropdownContent) {
      setOpen(false);
    }
  }, [dropdownContent]);

  return (
    <div className="relative">
      <Link
        className="flex items-center gap-2 relative brand-kit-menu"
        href="/"
        onContextMenu={(e) => {
          e.preventDefault();
          setOpen(!open);

          if (!open) {
            clearDropdown(true);
          }
        }}
      >
        <NoeronLogo
          iconClassName="h-[34px] w-[34px] rounded-[10px]"
          textClassName="text-[19px] font-bold text-[#14100c]"
        />
      </Link>

      <AnimatePresence initial={false} mode="popLayout">
        {open && <Menu setOpen={setOpen} />}
      </AnimatePresence>
    </div>
  );
}

const Menu = ({ setOpen }: { setOpen: (open: boolean) => void }) => {
  const backgroundRef = useRef<HTMLDivElement>(null);

  const timeoutRef = useRef<number | null>(null);

  const onMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const t = e.target as HTMLElement;

    const target =
      t instanceof HTMLButtonElement
        ? t
        : (t.closest("button") as HTMLButtonElement);

    if (backgroundRef.current) {
      animate(backgroundRef.current, { scale: 0.98, opacity: 1 }).then(() => {
        if (backgroundRef.current) {
          animate(backgroundRef.current!, { scale: 1 });
        }
      });

      animate(
        backgroundRef.current,
        {
          y: target.offsetTop - 4,
        },
        {
          ease: cubicBezier(0.1, 0.1, 0.25, 1),
          duration: 0.2,
        },
      );
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      if (backgroundRef.current) {
        animate(backgroundRef.current, { scale: 1, opacity: 0 });
      }
    }, 100);
  }, []);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      className="absolute w-220 whitespace-nowrap rounded-16 p-4 bg-white left-0 top-[calc(100%+8px)] z-[2000] border border-border-faint"
      exit={{ opacity: 0, y: 8, scale: 0.98, filter: "blur(1px)" }}
      initial={{ opacity: 0, y: -6, filter: "blur(1px)" }}
      style={{
        boxShadow:
          "0px 12px 24px rgba(0, 0, 0, 0.08), 0px 4px 8px rgba(0, 0, 0, 0.04)",
      }}
      transition={{
        ease: cubicBezier(0.1, 0.1, 0.25, 1),
        duration: 0.2,
      }}
    >
      <div
        className="absolute top-4 opacity-0 z-[2] pointer-events-none inset-x-4 bg-black-alpha-4 rounded-8 h-32"
        ref={backgroundRef}
      />

      <Button
        onClick={() => {
          window.open("/", "_blank");
          setOpen(false);
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <svg
          className="w-16 h-16"
          fill="none"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4.5V12.5C12 13.0523 11.5523 13.5 11 13.5H4C3.44772 13.5 3 13.0523 3 12.5V4.5C3 3.94772 3.44772 3.5 4 3.5H7.5M10.5 2.5H13.5M13.5 2.5V5.5M13.5 2.5L8.5 7.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.25"
          />
        </svg>
        Open in new tab
      </Button>

      <div className="px-8 py-4">
        <div className="h-1 w-full bg-black-alpha-5" />
      </div>

      <Button
        onClick={async () => {
          await navigator.clipboard.writeText(`<svg fill="none" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="22" fill="#0a1628"/>
  <path d="M 22 38 A 32 32 0 0 1 78 38" stroke="#4a7fd4" stroke-width="4" stroke-linecap="round" fill="none"/>
  <path d="M50 18 L53 44 L76 50 L53 56 L50 82 L47 56 L24 50 L47 44 Z" fill="url(#g)"/>
  <circle cx="50" cy="50" r="5" fill="white" opacity="0.9"/>
  <path d="M36 56 L44 50 L36 44 L30 50 Z" fill="#1a3060" opacity="0.85"/>
  <path d="M64 44 L56 50 L64 56 L70 50 Z" fill="#1a3060" opacity="0.85"/>
  <defs>
    <linearGradient id="g" x1="50" y1="18" x2="50" y2="82" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2a6dd9"/>
      <stop offset="50%" stop-color="#4a90f5"/>
      <stop offset="100%" stop-color="#1a3060"/>
    </linearGradient>
  </defs>
</svg>`);

          setOpen(false);
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Icon />
        Copy logo as SVG
      </Button>

      <Button
        onClick={() => {
          setOpen(false);
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Download />
        Download brand assets
      </Button>

      <div className="px-8 py-4">
        <div className="h-1 w-full bg-black-alpha-5" />
      </div>

      <Button
        onClick={() => {
          setOpen(false);
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Guidelines />
        Visit brand guidelines
      </Button>
    </motion.div>
  );
};

const Button = (attributes: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      {...attributes}
      className={cn(
        "flex gap-8 w-full items-center text-label-small group text-accent-black p-6",
        attributes.className,
      )}
    >
      {attributes.children}
    </button>
  );
};
