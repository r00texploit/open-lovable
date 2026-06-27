"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Play } from "lucide-react";
import { HeroGlow, GridPattern, NoiseTexture } from "@/components/ui/abstract-shapes";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      ref={ref}
      className="relative min-h-screen bg-black text-white overflow-hidden"
    >
      {/* Custom abstract background - NOT stock imagery */}
      <HeroGlow />
      <GridPattern />
      <NoiseTexture />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />

      {/* Main Content - Better spacing with section-lg */}
      <div className="relative z-10 container-modern min-h-screen flex flex-col items-center justify-center section-lg">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge - Using glass effect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="mb-8"
          >
            <span className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white/80">
              <Sparkles className="w-4 h-4 text-orange-400" />
              Powered by GPT-4o & Claude 3.5
            </span>
          </motion.div>

          {/* Headline - Using text-hero for proper scale */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
            className="text-hero mb-6"
          >
            Build websites
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500">
              with AI
            </span>
          </motion.h1>

          {/* Subheadline - Using text-body with proper line-height */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
            className="text-body text-white/60 max-w-2xl mx-auto mb-10"
          >
            Transform any idea into a production-ready React application.
            No coding required. Just describe what you want.
          </motion.p>

          {/* CTA Buttons - Using proper button classes */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/auth/signin" className="btn-primary text-base">
              <Sparkles className="w-5 h-5" />
              Start building free
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              className="btn-secondary"
              onClick={() => {
                const preview = document.getElementById("hero-preview");
                preview?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              <Play className="w-4 h-4" />
              Watch demo
            </button>
          </motion.div>

          {/* Trust badges - Better spacing */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex items-center justify-center gap-8 mt-12 text-sm text-white/40"
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Free forever plan
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              No credit card required
            </span>
          </motion.div>
        </div>

        {/* Preview Card - Using card-elevated */}
        <motion.div
          id="hero-preview"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: EASE }}
          className="w-full max-w-3xl mx-auto mt-16"
        >
          <div className="card-elevated">
            {/* Chat Messages */}
            <div className="space-y-4">
              {/* AI Message */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/[0.05] rounded-xl rounded-tl-sm p-4 max-w-[80%]">
                  <p className="text-sm text-white/90">
                    Hi! I'm your AI assistant. Describe the website you want to build, and I'll create it for you.
                  </p>
                </div>
              </div>

              {/* User Message */}
              <div className="flex items-start gap-3 justify-end">
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl rounded-tr-sm p-4 max-w-[80%] border border-orange-500/10">
                  <p className="text-sm text-white/90">
                    Build me a modern SaaS landing page with hero, features, and pricing sections
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-white/90">You</span>
                </div>
              </div>

              {/* AI Response - Generating */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/[0.05] rounded-xl rounded-tl-sm p-4">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    Building your website...
                  </div>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="mt-6 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <input
                  type="text"
                  placeholder="Describe your website or upload an image..."
                  className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/40 focus:outline-none"
                  readOnly
                />
                <div className="flex items-center gap-2">
                  <Link
                    href="/auth/signin"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] text-white/70 hover:bg-white/[0.1] hover:text-white transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="hidden sm:inline">Add image</span>
                  </Link>
                  <Link
                    href="/auth/signin"
                    className="p-2 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
                    aria-label="Start building"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
