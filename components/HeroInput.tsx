"use client";

import Image from "next/image";
import { useState, KeyboardEvent, useEffect, useRef, ChangeEvent, DragEvent } from "react";
import { ChevronDown, ChevronUp, ImageIcon, Send, X } from "lucide-react";

export type UploadedImageRole =
  | "Logo"
  | "Hero"
  | "Product"
  | "Gallery"
  | "Icon"
  | "Avatar"
  | "Background"
  | "Reference";

export interface ImageData {
  id: string;
  base64: string;
  type: string;
  name: string;
  label: string;
  role: UploadedImageRole;
  notes: string;
  preview: string;
  size: number;
}

interface HeroInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
  showSearchFeatures?: boolean;
  onImageUpload?: (images: ImageData[] | null) => void;
  maxImages?: number;
}

function isURL(str: string): boolean {
  const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
  return urlPattern.test(str.trim());
}

const IMAGE_ROLES: UploadedImageRole[] = [
  "Logo",
  "Hero",
  "Product",
  "Gallery",
  "Icon",
  "Avatar",
  "Background",
  "Reference",
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function getDefaultLabel(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
  const spaced = withoutExtension
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  if (!spaced) return "Uploaded image";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function createImageId(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID?.() || Date.now()}`;
}

export default function HeroInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Describe what you want to build...",
  className = "",
  showSearchFeatures = true,
  onImageUpload,
  maxImages = 10
}: HeroInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showTiles, setShowTiles] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<ImageData[]>([]);
  const [assetBoardOpen, setAssetBoardOpen] = useState(false);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
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

  useEffect(() => {
    resizeTextarea();
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

  const commitImages = (nextImages: ImageData[]) => {
    setUploadedImages(nextImages);
    onImageUpload?.(nextImages.length > 0 ? nextImages : null);
  };

  const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    await addImageFiles(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addImageFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const skipped: string[] = [];
    const remainingSlots = maxImages - uploadedImages.length;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        skipped.push(`${file.name} is not an image`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        skipped.push(`${file.name} is larger than 5 MB`);
        continue;
      }
      if (validFiles.length >= remainingSlots) {
        skipped.push(`Only ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'} can be added`);
        break;
      }
      validFiles.push(file);
    }

    if (remainingSlots <= 0) {
      setUploadFeedback(`Max ${maxImages} images allowed`);
      return;
    }

    const processedImages = (await Promise.all(validFiles.map(processImageFile))).filter(Boolean) as ImageData[];
    if (processedImages.length > 0) {
      const nextImages = [...uploadedImages, ...processedImages];
      commitImages(nextImages);
      if (nextImages.length > 1) setAssetBoardOpen(true);
    }

    setUploadFeedback(skipped.length > 0 ? skipped[0] : null);
  };

  const processImageFile = (file: File): Promise<ImageData | null> => {
    if (!file.type.startsWith('image/')) return Promise.resolve(null);
    if (file.size > MAX_IMAGE_SIZE) return Promise.resolve(null);

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Full = e.target?.result as string;
        const base64 = base64Full.split(',')[1];
        resolve({
          id: createImageId(file),
          size: file.size,
          preview: base64Full,
          base64,
          type: file.type,
          name: file.name,
          label: getDefaultLabel(file.name),
          role: "Reference",
          notes: "",
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    commitImages(newImages);
    if (newImages.length === 0) {
      setAssetBoardOpen(false);
      setUploadFeedback(null);
    }
  };

  const updateImage = (index: number, updates: Partial<Pick<ImageData, "label" | "role" | "notes">>) => {
    const newImages = uploadedImages.map((image, i) => (
      i === index ? { ...image, ...updates } : image
    ));
    commitImages(newImages);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= uploadedImages.length) return;

    const newImages = [...uploadedImages];
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
    commitImages(newImages);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingImages(false);
    await addImageFiles(Array.from(e.dataTransfer.files || []));
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingImages(true);
  };

  const handleSubmit = () => {
    if (!value.trim() && uploadedImages.length === 0) return;
    onSubmit();
    if (uploadedImages.length > 0) {
      commitImages([]);
      setAssetBoardOpen(false);
      setUploadFeedback(null);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDraggingImages(false)}
        className={`
          rounded-2xl border transition-all duration-200
          ${isFocused
            ? 'border-brand-orange/50 bg-white shadow-[0_4px_20px_rgba(250,93,25,0.08)]'
            : 'border-warm-750/12 bg-white hover:border-warm-750/25'
          }
          ${isDraggingImages ? 'border-brand-orange bg-brand-orange/5' : ''}
        `}
      >
        {/* Textarea */}
        <div className="flex items-start gap-3 px-4 pt-4">
          <div className="mt-1 flex-shrink-0 text-warm-500">
            {showSearchFeatures ? (
              isURLInput ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              )
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
            )}
          </div>

          <textarea
            ref={textareaRef}
            className="w-full flex-1 bg-transparent text-sm text-foreground placeholder:text-warm-500 resize-none outline-none min-h-[24px] max-h-[220px] leading-6 pr-2 scrollbar-hide"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            rows={1}
            style={{ height: 'auto', overflowY: 'hidden' }}
            onInput={resizeTextarea}
          />
        </div>

        {/* Image asset board */}
        {uploadedImages.length > 0 && (
          <div className="px-4 pb-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setAssetBoardOpen(prev => !prev)}
                className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground transition-colors hover:text-brand-orange"
              >
                {assetBoardOpen ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                <span className="truncate">
                  {assetBoardOpen ? 'Hide asset board' : 'Manage assets'}
                </span>
              </button>
              <span className="shrink-0 text-[10px] text-foreground-dimmer">
                {uploadedImages.length}/{maxImages}
              </span>
            </div>

            {!assetBoardOpen ? (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {uploadedImages.map((image, index) => (
                  <div key={image.id} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-warm-750/10 bg-warm-100">
                    <Image src={image.preview} alt={image.label || image.name} fill sizes="48px" unoptimized className="object-cover" />
                    <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-1 text-[9px] text-white">{index + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex max-h-[280px] flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin">
                {uploadedImages.map((image, index) => (
                  <div key={image.id} className="rounded-lg border border-warm-750/8 bg-warm-100/70 p-2">
                    <div className="flex items-start gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-warm-750/10">
                        <Image src={image.preview} alt={image.label || image.name} fill sizes="48px" unoptimized className="object-cover" />
                        <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-1 text-[9px] text-white">{index + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            value={image.label}
                            onChange={(e) => updateImage(index, { label: e.target.value })}
                            className="min-w-0 flex-1 rounded-md border border-warm-750/10 bg-white px-2 py-1 text-xs font-medium text-foreground outline-none transition-colors focus:border-brand-orange/50"
                            aria-label={`Label for ${image.name}`}
                            placeholder="Asset label"
                          />
                          <select
                            value={image.role}
                            onChange={(e) => updateImage(index, { role: e.target.value as UploadedImageRole })}
                            className="h-7 rounded-md border border-warm-750/10 bg-white px-2 text-[11px] text-foreground outline-none transition-colors focus:border-brand-orange/50"
                            aria-label={`Role for ${image.name}`}
                          >
                            {IMAGE_ROLES.map(role => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                        </div>
                        <input
                          value={image.notes}
                          onChange={(e) => updateImage(index, { notes: e.target.value })}
                          className="w-full rounded-md border border-warm-750/10 bg-white px-2 py-1 text-[11px] text-foreground outline-none transition-colors placeholder:text-warm-400 focus:border-brand-orange/50"
                          aria-label={`Notes for ${image.name}`}
                          placeholder="Optional placement note"
                        />
                        <p className="truncate text-[10px] text-foreground-dimmer">
                          {image.name} · {(image.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => moveImage(index, -1)}
                          disabled={index === 0}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-warm-500 transition-colors hover:text-warm-800 disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(index, 1)}
                          disabled={index === uploadedImages.length - 1}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-warm-500 transition-colors hover:text-warm-800 disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-warm-500 transition-colors hover:text-red-600"
                          title="Remove image"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(uploadedImages.length >= maxImages || uploadFeedback) && (
              <p className="mt-2 text-center text-xs text-brand-orange">
                {uploadFeedback || `Max ${maxImages} images allowed`}
              </p>
            )}
          </div>
        )}

        {/* Footer: image upload + send */}
        <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadedImages.length >= maxImages}
            className={`
              flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors
              ${uploadedImages.length > 0
                ? 'bg-brand-orange/10 text-brand-orange'
                : 'bg-warm-100 text-warm-600 hover:bg-warm-150 hover:text-warm-800'
              }
              ${uploadedImages.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">
              {uploadedImages.length > 0 ? `${uploadedImages.length} image${uploadedImages.length > 1 ? 's' : ''} added` : 'Add image'}
            </span>
            <span className="sm:hidden">{uploadedImages.length > 0 ? `${uploadedImages.length}` : 'Image'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />

          <button
            onClick={handleSubmit}
            disabled={!value.trim() && uploadedImages.length === 0}
            className={`
              inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all
              ${value.trim() || uploadedImages.length > 0
                ? 'bg-brand-orange text-black shadow-[0_2px_8px_rgba(250,93,25,0.25)] hover:bg-brand-orange-hover hover:translate-y-[-1px] active:translate-y-0'
                : 'bg-warm-100 text-warm-400 cursor-not-allowed'
              }
            `}
          >
            <span>Send</span>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Animated tiles for search results */}
      {showTiles && (
        <div className="mt-4 grid grid-cols-3 gap-3 px-4">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="tile-animation relative aspect-[4/3] bg-warm-100 rounded-xl overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-warm-100 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-warm-200 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes tileSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tile-animation {
          animation: tileSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
