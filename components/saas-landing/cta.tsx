"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Star } from "lucide-react";

// Magnetic Button Component
function MagneticButton({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
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
    const strength = 0.3;
    x.set((e.clientX - centerX) * strength);
    y.set((e.clientY - centerY) * strength);
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
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.button>
  );
}

export function CTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  return (
    <section ref={ref} className="py-24 relative overflow-hidden bg-[#0A0A0B]">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/20 to-orange-500/20" />

      {/* Animated background orbs with parallax */}
      <motion.div
        animate={
          shouldReduceMotion
            ? undefined
            : {
                x: [0, 100, 0],
                y: [0, 50, 0],
                scale: [1, 1.2, 1],
              }
        }
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-20 -right-20 w-[600px] h-[600px] rounded-full bg-violet-500/10 blur-3xl"
      />
      <motion.div
        animate={
          shouldReduceMotion
            ? undefined
            : {
                x: [0, -50, 0],
                y: [0, 100, 0],
                scale: [1, 1.3, 1],
              }
        }
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full bg-fuchsia-500/10 blur-3xl"
      />
      <motion.div
        animate={
          shouldReduceMotion
            ? undefined
            : {
                x: [0, 30, 0],
                y: [0, -30, 0],
              }
        }
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-cyan-500/5 blur-3xl"
      />

      <div className="max-w-4xl mx-auto px-6 lg:px-8 relative z-10 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium"
          >
            <Star className="w-4 h-4 fill-current" />
            Start building for free
          </motion.div>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight"
        >
          Ready to build your
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
            next website?
          </span>
        </motion.h2>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Join thousands of creators building with AI. No credit card required.
          Get started in seconds.
        </motion.p>

        {/* Magnetic CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/auth/signin">
            <MagneticButton
              className="flex items-center gap-2 bg-gradient-to-r from-white to-white/95 text-violet-700 px-8 py-4 rounded-xl font-bold shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-violet-500/30 hover:from-white hover:to-white transition-all text-lg border border-white/50 hover:border-white"
            >
              <Sparkles className="w-5 h-5" />
              Start building free
              <ArrowRight className="w-4 h-4" />
            </MagneticButton>
          </Link>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-6 text-white/50 text-sm"
        >
          {["Free forever plan", "No credit card required", "Cancel anytime"].map(
            (text) => (
              <span key={text} className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {text}
              </span>
            )
          )}
        </motion.div>
      </div>
    </section>
  );
}
