'use client';

import { useEffect, useRef, useState } from 'react';

export interface BrandSelectOption {
  value: string;
  label: string;
}

interface BrandSelectProps {
  value: string;
  options: BrandSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Brand-styled replacement for native <select>: warm palette, rounded
// popover, check mark on the active option
export default function BrandSelect({
  value,
  options,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  className = '',
}: BrandSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#261e151f] bg-[#fffcf4]/80 px-3 py-2 text-sm text-[#17130f] transition-colors hover:border-[#ff672866] focus:outline-none focus-visible:border-[#ff6728] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={`truncate ${selected ? '' : 'text-[#5f534399]'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className={`shrink-0 text-[#5f5343] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-50 mt-2 max-h-72 w-full min-w-[220px] overflow-auto rounded-2xl border border-[#261e151f] bg-[#fffcf4] p-1.5 shadow-[0_24px_60px_rgba(74,54,28,0.18)]"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? 'bg-[#17130f]/5 font-medium text-[#17130f]'
                      : 'text-[#5f5343] hover:bg-[#17130f]/5 hover:text-[#17130f]'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6728" className="shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
