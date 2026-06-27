"use client";

import Link from "next/link";
import { useState, useRef, ChangeEvent } from "react";
import { ImageIcon, X } from "lucide-react";

import Globe from "./_svg/Globe";
import HeroInputSubmitButton from "./Button/Button";
import HeroInputTabsMobile from "./Tabs/Mobile/Mobile";
import HeroInputTabs from "./Tabs/Tabs";
import AsciiExplosion from "@/components/shared/effects/flame/ascii-explosion";
import { Endpoint } from "@/components/shared/Playground/Context/types";

export default function HeroInput() {
  const [tab, setTab] = useState<Endpoint>(Endpoint.Scrape);
  const [url, setUrl] = useState<string>("");
  const [uploadedImage, setUploadedImage] = useState<{ base64: string; type: string; name: string; preview: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Full = e.target?.result as string;
      const base64 = base64Full.split(',')[1];
      setUploadedImage({
        size: file.size,
        preview: base64Full,
        base64,
        type: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const buildHref = () => {
    const params = new URLSearchParams();
    params.set('endpoint', tab);
    params.set('url', url);
    params.set('autorun', 'true');
    if (uploadedImage) {
      params.set('image', uploadedImage.preview);
    }
    return `/playground?${params.toString()}`;
  };

  return (
    <div className="max-w-552 mx-auto w-full z-[11] lg:z-[2] rounded-20 lg:-mt-76">
      <div
        className="overlay bg-accent-white"
        style={{
          boxShadow:
            "0px 0px 44px 0px rgba(0, 0, 0, 0.02), 0px 88px 56px -20px rgba(0, 0, 0, 0.03), 0px 56px 56px -20px rgba(0, 0, 0, 0.02), 0px 32px 32px -20px rgba(0, 0, 0, 0.03), 0px 16px 24px -12px rgba(0, 0, 0, 0.03), 0px 0px 0px 1px rgba(0, 0, 0, 0.05), 0px 0px 0px 10px #F9F9F9",
        }}
      />

      <label className="p-16 flex gap-8 items-center w-full relative border-b border-black-alpha-5">
        <Globe />

        <input
          className="w-full bg-transparent text-body-input text-accent-black placeholder:text-black-alpha-48"
          placeholder="https://example.com"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (
                document.querySelector(
                  ".hero-input-button",
                ) as HTMLButtonElement
              )?.click();
            }
          }}
        />
      </label>

      {/* Image Preview */}
      {uploadedImage && (
        <div className="px-16 pb-2">
          <div className="flex items-center gap-3 rounded-xl bg-warm-100 p-2.5">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
              <img
                src={uploadedImage.preview}
                alt="Uploaded"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {uploadedImage.name}
              </p>
              <p className="text-xs text-foreground-dimmer">
                {(uploadedImage.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={removeImage}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warm-150 text-warm-600 transition-colors hover:bg-warm-200 hover:text-warm-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="p-10 flex justify-between items-center relative">
        <div className="flex items-center gap-2">
          <HeroInputTabs
            setTab={setTab}
            tab={tab}
            allowedModes={[
              Endpoint.Scrape,
              Endpoint.Search,
              Endpoint.Map,
              Endpoint.Crawl,
            ]}
          />

          <HeroInputTabsMobile
            setTab={setTab}
            tab={tab}
            allowedModes={[
              Endpoint.Scrape,
              Endpoint.Search,
              Endpoint.Map,
              Endpoint.Crawl,
            ]}
          />

          {/* Add Image Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors
              ${uploadedImage
                ? 'bg-brand-orange/10 text-brand-orange'
                : 'bg-warm-100 text-warm-600 hover:bg-warm-150 hover:text-warm-800'
              }
            `}
          >
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{uploadedImage ? 'Image added' : 'Add image'}</span>
            <span className="sm:hidden">Image</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        <Link
          className="contents"
          href={buildHref()}
        >
          <HeroInputSubmitButton dirty={url.length > 0 || !!uploadedImage} />
        </Link>
      </div>

      <div className="h-248 top-84 cw-768 pointer-events-none absolute overflow-clip -z-10">
        <AsciiExplosion className="-top-200" />
      </div>
    </div>
  );
}
