"use client";

import { useState, KeyboardEvent, useEffect, useRef } from "react";

interface HeroInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
}

export default function HeroInput({ 
  value, 
  onChange, 
  onSubmit, 
  placeholder = "Describe what you want to build...",
  className = ""
}: HeroInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset textarea height when value changes (especially when cleared)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={`max-w-552 mx-auto w-full relative z-[11] rounded-20 ${className}`}>
      <div
        className=""
      />

      <div className="relative">
        <label className="p-16 flex gap-8 items-start w-full relative border-b border-black-alpha-5">
          <div className="mt-2 flex-shrink-0">
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 20 20" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-40"
            >
              <circle cx="10" cy="10" r="9.5" stroke="currentColor"/>
              <path d="M10 2C10 5.5 10 14.5 10 18" stroke="currentColor" strokeLinecap="round"/>
              <path d="M2 10C5.5 10 14.5 10 18 10" stroke="currentColor" strokeLinecap="round"/>
              <ellipse cx="10" cy="10" rx="3.5" ry="9.5" stroke="currentColor"/>
              <ellipse cx="10" cy="10" rx="6" ry="9.5" stroke="currentColor"/>
            </svg>
          </div>

          <textarea
            ref={textareaRef}
            className="w-full bg-transparent text-body-input text-accent-black placeholder:text-black-alpha-48 resize-none outline-none min-h-[24px] leading-6"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            rows={1}
            style={{
              height: 'auto',
              overflow: 'hidden'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />
        </label>

        <div className="p-10 flex justify-end items-center relative">
          <button
            onClick={onSubmit}
            disabled={!value.trim()}
            className={`
              button relative rounded-10 px-8 py-8 text-label-medium font-medium
              flex items-center justify-center gap-6
              ${value.trim() 
                ? 'button-primary text-accent-white active:scale-[0.995]' 
                : 'bg-black-alpha-4 text-black-alpha-24 cursor-not-allowed'
              }
            `}
          >
            {value.trim() && <div className="button-background absolute inset-0 rounded-10 pointer-events-none" />}
            {value.trim() ? (
              <>
                <span className="px-6 relative">Re-imagine Site</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.5 3.5L13 8L8.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </>
            ) : (
              <div className="w-60 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.5 3.5L13 8L8.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}