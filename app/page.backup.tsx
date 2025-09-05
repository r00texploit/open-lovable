"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { appConfig } from '@/config/app.config';
import { toast } from "sonner";

// Import shared components
import { Connector } from "@/components/shared/layout/curvy-rect";
import HeroFlame from "@/components/shared/effects/flame/hero-flame";
import AsciiExplosion from "@/components/shared/effects/flame/ascii-explosion";
import { HeaderProvider } from "@/components/shared/header/HeaderContext";

// Import hero section components
import HomeHeroBackground from "@/components/app/(home)/sections/hero/Background/Background";
import { BackgroundOuterPiece } from "@/components/app/(home)/sections/hero/Background/BackgroundOuterPiece";
import HomeHeroBadge from "@/components/app/(home)/sections/hero/Badge/Badge";
import HomeHeroPixi from "@/components/app/(home)/sections/hero/Pixi/Pixi";
import HomeHeroTitle from "@/components/app/(home)/sections/hero/Title/Title";
import HeroInputSubmitButton from "@/components/app/(home)/sections/hero-input/Button/Button";
import Globe from "@/components/app/(home)/sections/hero-input/_svg/Globe";

// Import header components
import HeaderBrandKit from "@/components/shared/header/BrandKit/BrandKit";
import HeaderWrapper from "@/components/shared/header/Wrapper/Wrapper";
import HeaderDropdownWrapper from "@/components/shared/header/Dropdown/Wrapper/Wrapper";
import GithubIcon from "@/components/shared/header/Github/_svg/GithubIcon";
import ButtonUI from "@/components/ui/shadcn/button"

export default function HomePage() {
  const [url, setUrl] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<string>("modern");
  const [selectedModel, setSelectedModel] = useState<string>(appConfig.ai.defaultModel);
  const router = useRouter();

  const styles = [
    { id: "modern", name: "Modern", description: "Clean and minimalist" },
    { id: "playful", name: "Playful", description: "Fun and colorful" },
    { id: "professional", name: "Professional", description: "Corporate and sleek" },
    { id: "artistic", name: "Artistic", description: "Creative and unique" },
  ];

  const models = appConfig.ai.availableModels.map(model => ({
    id: model,
    name: model.includes('claude') ? `Claude ${model.split('-')[2]}` : 
          model.includes('gpt') ? `GPT-${model.split('-')[1]}` : model,
  }));

  const handleSubmit = () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    
    // Store the configuration in sessionStorage
    sessionStorage.setItem('targetUrl', url);
    sessionStorage.setItem('selectedStyle', selectedStyle);
    sessionStorage.setItem('selectedModel', selectedModel);
    
    // Redirect to the generation interface
    router.push('/generation');
  };

  return (
    <HeaderProvider>
      <div className="min-h-screen bg-background-base">
        {/* Header/Navigation Section */}
        <HeaderDropdownWrapper />

        <div className="sticky top-0 left-0 w-full z-[101] bg-background-base header">
          <div className="absolute top-0 cmw-container border-x border-border-faint h-full pointer-events-none" />
          <div className="h-1 bg-border-faint w-full left-0 -bottom-1 absolute" />
          <div className="cmw-container absolute h-full pointer-events-none top-0">
            <Connector className="absolute -left-[10.5px] -bottom-11" />
            <Connector className="absolute -right-[10.5px] -bottom-11" />
          </div>

          <HeaderWrapper>
            <div className="max-w-[900px] mx-auto w-full flex justify-between items-center">
              <div className="flex gap-24 items-center">
                <HeaderBrandKit />
              </div>
              <div className="flex gap-8">
                <a
                  className="contents"
                  href="https://github.com/mendableai/open-lovable"
                  target="_blank"
                >
                  <ButtonUI variant="tertiary">
                    <GithubIcon />
                    Use this Template
                  </ButtonUI>
                </a>
              </div>
            </div>
          </HeaderWrapper>
        </div>

        {/* Hero Section */}
        <section className="overflow-x-clip" id="home-hero">
          <div className="pt-28 lg:pt-254 lg:-mt-100 pb-115 relative" id="hero-content">
            <HomeHeroPixi />
            <HeroFlame />
            <BackgroundOuterPiece />
            <HomeHeroBackground />

            <div className="relative container px-16">
              <HomeHeroBadge />
              <HomeHeroTitle />
              <p className="text-center text-body-large">
                Re-imagine any website, in seconds.
              </p>
              <Link
                className="bg-black-alpha-4 hover:bg-black-alpha-6 rounded-6 px-8 lg:px-6 text-label-large h-30 lg:h-24 block mt-8 mx-auto w-max gap-4 transition-all"
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                Powered by Firecrawl.
              </Link>
            </div>
          </div>

          {/* Mini Playground Input */}
          <div className="container lg:contents !p-16 relative -mt-90">
            <div className="absolute top-0 left-[calc(50%-50vw)] w-screen h-1 bg-border-faint lg:hidden" />
            <div className="absolute bottom-0 left-[calc(50%-50vw)] w-screen h-1 bg-border-faint lg:hidden" />
            <Connector className="-top-10 -left-[10.5px] lg:hidden" />
            <Connector className="-top-10 -right-[10.5px] lg:hidden" />
            <Connector className="-bottom-10 -left-[10.5px] lg:hidden" />
            <Connector className="-bottom-10 -right-[10.5px] lg:hidden" />

            {/* Hero Input Component */}
            <div className="max-w-552 mx-auto w-full z-[11] lg:z-[2]">
              <div className="rounded-20 -mt-30 lg:-mt-30">
                <div
                  className="overlay bg-accent-white rounded-20"
                  style={{
                    boxShadow:
                      "0px 0px 44px 0px rgba(0, 0, 0, 0.02), 0px 88px 56px -20px rgba(0, 0, 0, 0.03), 0px 56px 56px -20px rgba(0, 0, 0, 0.02), 0px 32px 32px -20px rgba(0, 0, 0, 0.03), 0px 16px 24px -12px rgba(0, 0, 0, 0.03), 0px 0px 0px 1px rgba(0, 0, 0, 0.05), 0px 0px 0px 10px #F9F9F9",
                  }}
                />

                <div className="p-16 flex gap-12 items-center w-full relative">
                  <Globe />
                  <input
                    className="flex-1 bg-transparent text-body-input text-accent-black placeholder:text-black-alpha-48 focus:outline-none focus:ring-0 focus:border-transparent"
                    placeholder="example.com"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                  >
                    <HeroInputSubmitButton dirty={url.length > 0} />
                  </div>
                </div>

                {/* Options Section */}
                {url.length > 0 && (
                  <div className="px-16 pb-16">
                    {/* Model Selector */}
                    <div className="mb-12">
                      <label className="text-label-small text-black-alpha-56 mb-6 block">AI Model</label>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                        {models.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className={`
                              p-8 rounded-8 border transition-all text-left
                              ${selectedModel === model.id 
                                ? 'border-heat-100 bg-heat-4' 
                                : 'border-border-faint hover:border-black-alpha-24 bg-white'
                              }
                            `}
                          >
                            <div className="text-label-small font-medium text-accent-black">
                              {model.name}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Style Selector */}
                    <div>
                      <label className="text-label-small text-black-alpha-56 mb-6 block">Style</label>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                        {styles.map((style) => (
                          <button
                            key={style.id}
                            onClick={() => setSelectedStyle(style.id)}
                            className={`
                              p-12 rounded-10 border transition-all text-left
                              ${selectedStyle === style.id 
                                ? 'border-heat-100 bg-heat-4' 
                                : 'border-border-faint hover:border-black-alpha-24 bg-white'
                              }
                            `}
                          >
                            <div className="text-label-medium font-medium text-accent-black">
                              {style.name}
                            </div>
                            <div className="text-caption text-black-alpha-56 mt-2">
                              {style.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="h-248 top-84 cw-768 pointer-events-none absolute overflow-clip -z-10">
                  <AsciiExplosion className="-top-200" />
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </HeaderProvider>
  );
}