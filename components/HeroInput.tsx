"use client";

import { useState, KeyboardEvent, useEffect, useRef, ChangeEvent } from "react";
import { ImageIcon, X } from "lucide-react";

interface HeroInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
  showSearchFeatures?: boolean;
  onImageUpload?: (image: { base64: string; type: string; name: string } | null) => void;
}

function isURL(str: string): boolean {
  // Check if string contains a dot and looks like a URL
  const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
  return urlPattern.test(str.trim());
}

export default function HeroInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Describe what you want to build...",
  className = "",
  showSearchFeatures = true,
  onImageUpload
}: HeroInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showTiles, setShowTiles] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{ base64: string; type: string; name: string; preview: string; size: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isURLInput = showSearchFeatures ? isURL(value) : false;
  const maxTextareaHeight = 220;

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, maxTextareaHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxTextareaHeight ? 'auto' : 'hidden';
  };

  // Reset textarea height when value changes (especially when cleared)
  useEffect(() => {
    resizeTextarea();
    
    // Show tiles animation for search terms (only if search features are enabled)
    if (showSearchFeatures && value.trim() && !isURL(value) && isFocused) {
      setShowTiles(true);
    } else {
      setShowTiles(false);
    }
  }, [value, isFocused, showSearchFeatures]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Full = e.target?.result as string;
      const base64 = base64Full.split(',')[1];
      const imageData = {
        size: file.size,
        preview: base64Full,
        base64,
        type: file.type,
        name: file.name
      };
      setUploadedImage(imageData);
      onImageUpload?.({ base64, type: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setUploadedImage(null);
    onImageUpload?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    if (!value.trim() && !uploadedImage) return;

    onSubmit();

    if (uploadedImage) {
      removeImage();
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
            {showSearchFeatures ? (
              isURLInput ? (
                // Link icon for URLs
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 20 20" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="opacity-40"
                >
                  <path d="M9 11L11 9M11 9L15 5M11 9L5 15M15 5L13 3M15 5L17 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 13L5 15L3 13" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13 7L15 5L17 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                // Search icon for search terms
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 20 20" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="opacity-40"
                >
                  <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M12.5 12.5L16.5 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )
            ) : (
              // Default globe icon for generation page
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
            )}
          </div>

          <textarea
            ref={textareaRef}
            className="w-full bg-transparent text-body-input text-accent-black placeholder:text-black-alpha-48 resize-none outline-none min-h-[24px] max-h-[220px] leading-6 pr-2 scrollbar-thin scrollbar-thumb-black-alpha-12 scrollbar-track-transparent"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            rows={1}
            style={{
              height: 'auto',
              overflowY: 'hidden'
            }}
            onInput={resizeTextarea}
          />
        </label>

        {/* Image Preview */}
        {uploadedImage && (
          <div className="px-16 pb-10">
            <div className="flex items-center gap-3 rounded-12 bg-black-alpha-4 p-10">
              <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedImage.preview}
                  alt="Uploaded"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-accent-black">
                  {uploadedImage.name}
                </p>
                <p className="text-xs text-black-alpha-48">
                  {(uploadedImage.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={removeImage}
                className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-black-alpha-4 text-black-alpha-48 transition-colors hover:bg-black-alpha-8 hover:text-accent-black"
              >
                <X className="h-16 w-16" />
              </button>
            </div>
          </div>
        )}

        <div className="p-10 flex justify-between items-center relative bg-white/80 backdrop-blur-sm">
          {/* Image Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-6 rounded-10 px-8 py-8 text-label-medium font-medium transition-colors ${
              uploadedImage
                ? 'bg-orange-50 text-orange-600'
                : 'bg-black-alpha-4 text-black-alpha-48 hover:bg-black-alpha-8 hover:text-accent-black'
            }`}
          >
            <ImageIcon className="h-16 w-16" />
            <span className="hidden sm:inline">{uploadedImage ? 'Image added' : 'Add image'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          <button
            onClick={handleSubmit}
            disabled={!value.trim() && !uploadedImage}
            className={`
              button relative rounded-10 px-8 py-8 text-label-medium font-medium
              flex items-center justify-center gap-6
              ${value.trim() || uploadedImage
                ? 'button-primary text-accent-white active:scale-[0.995]'
                : 'bg-black-alpha-4 text-black-alpha-24 cursor-not-allowed'
              }
            `}
          >
            {(value.trim() || uploadedImage) && <div className="button-background absolute inset-0 rounded-10 pointer-events-none" />}
            {value.trim() || uploadedImage ? (
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

      {/* Animated tiles for search results */}
      {showTiles && (
        <div className="mt-16 grid grid-cols-3 gap-12 px-16">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="tile-animation relative aspect-[4/3] bg-black-alpha-4 rounded-12 overflow-hidden"
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-black-alpha-4 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-black-alpha-8 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes tileSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tile-animation {
          animation: tileSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
