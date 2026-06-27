"use client";

import { useState } from "react";
import Link from "next/link";
import { appConfig } from "@/config/app.config";

interface SidebarInputProps {
  onSubmit: (url: string, style: string, model: string, instructions?: string) => void;
  disabled?: boolean;
}

export default function SidebarInput({ onSubmit, disabled = false }: SidebarInputProps) {
  const [url, setUrl] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<string>("1");
  const [selectedModel, setSelectedModel] = useState<string>(appConfig.ai.defaultModel);
  const [additionalInstructions, setAdditionalInstructions] = useState<string>("");
  const [isValidUrl, setIsValidUrl] = useState<boolean>(false);

  // Simple URL validation - currently unused but keeping for future use
  // const validateUrl = (urlString: string) => {
  //   if (!urlString) return false;
  //   const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  //   return urlPattern.test(urlString.toLowerCase());
  // };

  const styles = [
    { id: "1", name: "Glassmorphism", description: "Frosted glass effect" },
    { id: "2", name: "Neumorphism", description: "Soft 3D shadows" },
    { id: "3", name: "Brutalism", description: "Bold and raw" },
    { id: "4", name: "Minimalist", description: "Clean and simple" },
    { id: "5", name: "Dark Mode", description: "Dark theme design" },
    { id: "6", name: "Gradient Rich", description: "Vibrant gradients" },
    { id: "7", name: "3D Depth", description: "Dimensional layers" },
    { id: "8", name: "Retro Wave", description: "80s inspired" },
  ];

  const models = appConfig.ai.availableModels.map(model => ({
    id: model,
    name: appConfig.ai.modelDisplayNames[model] || model,
  }));

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim() || disabled) return;

    onSubmit(url.trim(), selectedStyle, selectedModel, additionalInstructions || undefined);

    // Reset form
    setUrl("");
    setAdditionalInstructions("");
    setIsValidUrl(false);
  };

  return (
    <div className="w-full p-4 space-y-4">
      {/* URL Input */}
      <div>
        <label className="block text-xs font-medium text-warm-800 mb-2">Website URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setIsValidUrl(e.target.value.trim().length > 0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isValidUrl && !disabled) {
              handleSubmit();
            }
          }}
          disabled={disabled}
          className="w-full rounded-xl border border-warm-750/12 bg-white px-3 py-2.5 text-sm text-warm-800 placeholder:text-warm-500 transition-colors focus:border-brand-orange focus:outline-none"
          placeholder="https://example.com"
        />
      </div>

      {/* Options Section - Show when valid URL */}
      {isValidUrl && (
        <div className="space-y-4">
          {/* Style Selector */}
          <div>
            <label className="block text-xs font-medium text-warm-800 mb-2">Style</label>
            <div className="grid grid-cols-2 gap-1.5">
              {styles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  disabled={disabled}
                  className={`
                    py-2 px-2 rounded-xl text-xs font-medium border transition-all text-center
                    ${selectedStyle === style.id
                      ? 'border-brand-orange bg-brand-orange/5 text-warm-800'
                      : 'border-warm-750/12 hover:border-warm-750/30 bg-warm-025 text-warm-600'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>

          {/* Model Selector */}
          <div>
            <label className="block text-xs font-medium text-warm-800 mb-2">AI Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={disabled}
              className="w-full rounded-xl border border-warm-750/12 bg-white px-3 py-2 text-xs font-medium text-warm-800 focus:border-brand-orange focus:outline-none"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Instructions */}
          <div>
            <label className="block text-xs font-medium text-warm-800 mb-2">Additional Instructions (optional)</label>
            <input
              type="text"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              disabled={disabled}
              className="w-full rounded-xl border border-warm-750/12 bg-white px-3 py-2 text-xs text-warm-800 placeholder:text-warm-500 focus:border-brand-orange focus:outline-none"
              placeholder="e.g., make it more colorful, add animations..."
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={!isValidUrl || disabled}
              className={`
                ol-primary-button w-full py-2.5 px-4 text-sm
                ${(!isValidUrl || disabled) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {disabled ? 'Scraping...' : 'Scrape Site'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}