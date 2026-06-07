"use client";

import {
  motion,
  useScroll,
  useMotionValueEvent,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Play,
  Sparkles,
  Send,
  Command,
  Paperclip,
  Bot,
} from "lucide-react";
import { useSplitText, useTyping } from "@/lib/effects";
import { SparkableLogo } from "@/components/brand/sparkable-logo";

// Spring config for premium feel
const SPRING = { stiffness: 100, damping: 15 };
const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const shouldReduceMotion = useReducedMotion();

  // Spotlight effect state
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50, opacity: 0 });

  // Floating elements with physics
  const floatX = useMotionValue(0);
  const floatY = useMotionValue(0);
  const springX = useSpring(floatX, SPRING);
  const springY = useSpring(floatY, SPRING);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  // Track mouse for spotlight
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || shouldReduceMotion) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSpotlight({ x, y, opacity: 1 });

    // Subtle parallax for floating elements
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    floatX.set((e.clientX - centerX) * 0.02);
    floatY.set((e.clientY - centerY) * 0.02);
  };

  const handleMouseLeave = () => {
    setSpotlight({ x: 50, y: 50, opacity: 0 });
    floatX.set(0);
    floatY.set(0);
  };

  return (
    <section
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-screen bg-[#0A0A0B] text-white overflow-hidden"
    >
      {/* Animated Gradient Mesh Background */}
      <div className="absolute inset-0">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full blur-[120px]"
            style={{
              width: [600, 500, 400, 350][i],
              height: [600, 500, 400, 350][i],
              left: `${10 + i * 20}%`,
              top: `${5 + i * 20}%`,
              background: [
                "rgba(139, 92, 246, 0.15)",
                "rgba(6, 182, 212, 0.12)",
                "rgba(245, 158, 11, 0.12)",
                "rgba(16, 185, 129, 0.1)",
              ][i],
            }}
            animate={
              shouldReduceMotion
                ? undefined
                : {
                    x: [0, 30, -20, 0],
                    y: [0, -20, 30, 0],
                    scale: [1, 1.1, 0.95, 1],
                  }
            }
            transition={{
              duration: [20, 25, 22, 18][i],
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Mouse-tracking Spotlight */}
      <motion.div
        className="absolute pointer-events-none z-10"
        style={{
          left: `${spotlight.x}%`,
          top: `${spotlight.y}%`,
          width: 800,
          height: 800,
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 50%)",
          opacity: spotlight.opacity,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />

      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A0A0B]/90 pointer-events-none z-[5]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0B]/50 via-transparent to-[#0A0A0B]/50 pointer-events-none z-[5]" />

      {/* Navigation - Glass morphism */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <motion.nav
          animate={{
            backgroundColor: isScrolled
              ? "rgba(10, 10, 11, 0.8)"
              : "rgba(10, 10, 11, 0)",
            backdropFilter: isScrolled ? "blur(20px)" : "blur(0px)",
            borderColor: isScrolled
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(255, 255, 255, 0)",
          }}
          transition={{ duration: 0.3 }}
          className="border-b"
        >
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <motion.span
                whileHover={{ scale: 1.04 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <SparkableLogo iconClassName="h-[32px] w-[32px]" textClassName="text-xl text-white" />
              </motion.span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {["Features", "Pricing", "How it Works"].map((item, i) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                  className="relative text-sm text-white/70 hover:text-white transition-colors"
                  whileHover={{ y: -2 }}
                >
                  {item}
                  <motion.span
                    className="absolute -bottom-1 left-0 w-full h-px bg-violet-500"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.a>
              ))}
            </div>

            <Link href="/auth/signin">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white text-black px-5 py-2 rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-white/20 transition-shadow"
              >
                Get Started
              </motion.button>
            </Link>
          </div>
        </motion.nav>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-20 max-w-7xl mx-auto px-6 pt-40 pb-20">
        <div className="max-w-5xl mx-auto">
          {/* Hero Text with Split Animation */}
          <div className="text-center space-y-8 mb-20">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
              className="inline-block"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium backdrop-blur-sm"
              >
                <Sparkles className="w-4 h-4" />
                Powered by GPT-4o & Claude 3.5
              </motion.div>
            </motion.div>

            {/* Split Text Animation Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-[-0.04em]">
              <SplitText text="Build websites" delay={0.2} />
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
                <SplitText text="with AI" delay={0.4} />
              </span>
            </h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: EASE }}
              className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed font-normal"
            >
              Transform any idea into a production-ready React application.
              No coding required. Just describe what you want.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7, ease: EASE }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Link href="/auth/signin">
                <MagneticButton
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  Start building free
                  <ArrowRight className="w-4 h-4" />
                </MagneticButton>
              </Link>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-colors backdrop-blur-sm"
              >
                <Play className="w-4 h-4" />
                Watch demo
              </motion.button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="flex items-center justify-center gap-6 flex-wrap pt-4 text-sm text-white/40"
            >
              {["Free forever plan", "No credit card required"].map((text) => (
                <span key={text} className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-emerald-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {text}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Premium Chat Mockup with Physics */}
          <motion.div
            style={{ x: springX, y: springY }}
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: EASE }}
            className="relative w-full max-w-3xl mx-auto"
          >
            {/* Glow effect behind card */}
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-indigo-500/20 rounded-3xl blur-2xl opacity-50" />

            <div
              className="relative backdrop-blur-2xl bg-white/[0.03] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
              data-cursor="card"
            >
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />

              <div className="relative p-6 space-y-4">
                {/* AI Message */}
                <div className="flex items-start gap-3">
                  <motion.div
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </motion.div>
                  <div className="flex-1 space-y-2 max-w-[80%]">
                    <div className="bg-white/[0.05] rounded-xl p-3 backdrop-blur-sm border border-white/[0.05]">
                      <p className="text-sm text-white/90">
                        Hi! I&apos;m your AI assistant. Describe the website you
                        want to build, and I&apos;ll create it for you.
                      </p>
                    </div>
                  </div>
                </div>

                {/* User Message with Typing Animation */}
                <div className="flex items-start gap-3 justify-end">
                  <div className="flex-1 max-w-[80%] space-y-2">
                    <div className="bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-xl p-3 backdrop-blur-sm border border-white/[0.05]">
                      <TypingText
                        text="Build me a modern SaaS landing page with hero, features, and pricing sections"
                        delay={1500}
                      />
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-white/90">You</span>
                  </div>
                </div>

                {/* AI Generating with Progress */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 3.5, duration: 0.5 }}
                  className="flex items-start gap-3"
                >
                  <motion.div
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Bot className="w-4 h-4 text-white" />
                  </motion.div>
                  <div className="flex-1 space-y-2">
                    <div className="bg-white/[0.05] rounded-xl p-3 backdrop-blur-sm border border-white/[0.05]">
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full"
                        />
                        <p className="text-sm text-white/70">
                          Generating your website...
                        </p>
                      </div>
                      <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          animate={{ width: ["0%", "100%"] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Input Area */}
                <div className="pt-4 border-t border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 text-white/40 hover:text-white/90 rounded-lg transition-colors"
                    >
                      <Paperclip className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 text-white/40 hover:text-white/90 rounded-lg transition-colors"
                    >
                      <Command className="w-4 h-4" />
                    </motion.button>
                    <input
                      type="text"
                      placeholder="Type your message..."
                      className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2.5 bg-white text-black rounded-xl hover:shadow-lg hover:shadow-white/20 transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Floating accent elements with inertia */}
          <motion.div
            style={{ x: springX, y: springY }}
            className="absolute top-1/3 -left-20 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl"
          />
          <motion.div
            style={{ x: useSpring(useMotionValue(0), SPRING), y: useSpring(useMotionValue(0), SPRING) }}
            className="absolute top-1/2 -right-20 w-32 h-32 rounded-full bg-fuchsia-500/10 blur-3xl"
          />
        </div>
      </main>
    </section>
  );
}

// Split Text Animation Component
function SplitText({ text, delay = 0 }: { text: string; delay?: number }) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(" ");

  return (
    <>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden">
          <motion.span
            className="inline-block"
            initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.6,
              delay: delay + i * 0.08,
              ease: EASE,
            }}
          >
            {word}
            {i < words.length - 1 && " "}
          </motion.span>
        </span>
      ))}
    </>
  );
}

// Typing Animation Component
function TypingText({ text, delay = 0 }: { text: string; delay?: number }) {
  const { displayedText, isTyping } = useTyping({ text, speed: 40, delay });

  return (
    <p className="text-sm text-white/90">
      {displayedText}
      {isTyping && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
          className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 align-middle"
        />
      )}
    </p>
  );
}

// Magnetic Button Component
function MagneticButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 150 };
  const xSpring = useSpring(x, springConfig);
  const ySpring = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.2);
    y.set((e.clientY - centerY) * 0.2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      className={className}
      style={{ x: xSpring, y: ySpring }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.button>
  );
}
