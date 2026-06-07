'use client';

import { FormEvent, useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ImageIcon, X, Upload } from 'lucide-react';

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

interface UploadedImage {
  file: File;
  preview: string;
  base64: string;
}

export function BuildLauncher() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setUploadedImage({
        file,
        preview: base64,
        base64: base64.split(',')[1], // Remove data URL prefix
      });
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // If we have an uploaded image but no URL, that's valid too
    if (!value.trim() && !uploadedImage) {
      setError('Enter a website URL or upload an image');
      return;
    }

    // Only validate URL if one is provided
    if (value.trim()) {
      const normalized = normalizeUrl(value);
      try {
        const url = new URL(normalized);
        if (!url.hostname.includes('.')) {
          throw new Error('missing domain');
        }
        sessionStorage.setItem('targetUrl', normalized);
      } catch {
        setError('Enter a full website URL, like example.com');
        return;
      }
    }

    // Store image data if uploaded
    if (uploadedImage) {
      sessionStorage.setItem('uploadedImageBase64', uploadedImage.base64);
      sessionStorage.setItem('uploadedImageType', uploadedImage.file.type);
      sessionStorage.setItem('uploadedImageName', uploadedImage.file.name);
    }

    sessionStorage.setItem('selectedStyle', 'modern');
    sessionStorage.setItem('autoStart', 'true');
    router.push('/generation');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-[34px] max-w-[620px] rounded-[28px] border border-[#2d21151a] bg-[#fff9efb8] p-[8px] shadow-[inset_0_1px_0_rgba(255,255,255,0.62),0_18px_44px_rgba(75,51,24,0.12)]"
    >
      <div className="flex flex-col gap-[8px]">
        {/* URL Input Row */}
        <div className="flex flex-col gap-[8px] sm:flex-row">
          <label className="sr-only" htmlFor="landing-url">
            Website URL or Description
          </label>
          <input
            id="landing-url"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError('');
            }}
            placeholder="Paste a website URL or describe what you want to build"
            className="min-h-[54px] flex-1 rounded-[22px] border border-transparent bg-[#17130f0a] px-[20px] text-base font-semibold text-[#17130f] placeholder:text-[#6f6250] transition-colors duration-300 focus:border-[#ff6728] focus:bg-[#fffdf8] focus:outline-none"
          />

          {/* Image Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`flex min-h-[54px] shrink-0 items-center justify-center gap-2 rounded-[22px] border-2 border-dashed px-[16px] transition-all duration-300 ${
              uploadedImage
                ? 'border-[#ff6728] bg-[#ff6728]/10 text-[#ff6728]'
                : isDragging
                  ? 'border-[#ff6728] bg-[#ff6728]/5 text-[#ff6728]'
                  : 'border-[#2d21151a] bg-[#17130f0a] text-[#6f6250] hover:border-[#ff6728] hover:text-[#ff6728]'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {uploadedImage ? (
              <>
                <ImageIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Image added</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span className="text-sm font-medium hidden sm:inline">Add Image</span>
                <span className="text-sm font-medium sm:hidden">Image</span>
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />

          <button type="submit" className="ol-primary-button group min-h-[54px] shrink-0 whitespace-nowrap px-[24px]">
            {uploadedImage && !value.trim() ? 'Build from Image' : 'Build from URL'}
            <span className="ml-[4px] flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#25170e] text-[#fff7e8] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-[4px]">
              -&gt;
            </span>
          </button>
        </div>

        {/* Image Preview */}
        {uploadedImage && (
          <div className="relative mx-[12px] mb-[4px]">
            <div className="flex items-center gap-3 rounded-[16px] bg-[#17130f0a] p-[12px]">
              {/* Thumbnail */}
              <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[12px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedImage.preview}
                  alt="Uploaded"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* File Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#17130f]">
                  {uploadedImage.file.name}
                </p>
                <p className="text-xs text-[#6f6250]">
                  {(uploadedImage.file.size / 1024 / 1024).toFixed(2)} MB • {uploadedImage.file.type.split('/')[1].toUpperCase()}
                </p>
                <p className="mt-1 text-xs text-[#8c4b26]">
                  This image will guide the AI generation
                </p>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={removeImage}
                className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full bg-[#17130f0a] text-[#6f6250] transition-colors hover:bg-[#ff6728]/10 hover:text-[#ff6728]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Helper Text */}
      <div className="flex flex-col gap-[8px] px-[12px] pb-[4px] pt-[12px] text-sm text-[#655847] sm:flex-row sm:items-center sm:justify-between">
        <p>Scrape a URL, upload an image, or describe your idea.</p>
        {error && <p className="font-semibold text-[#a2431c]">{error}</p>}
      </div>
    </form>
  );
}
