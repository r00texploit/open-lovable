"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function CTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="section-lg relative overflow-hidden bg-black">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 via-violet-600/10 to-orange-500/10" />

      {/* Background orbs */}
      <div className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full bg-orange-500/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-3xl" />

      <div className="container-modern relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <span className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white/80">
              <Sparkles className="w-4 h-4 text-orange-400" />
              Start building for free
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-display text-white mb-6"
          >
            Ready to build your
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500">
              next website?
            </span>
          </motion.h2>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-body text-white/60 mb-10 max-w-xl mx-auto"
          >
            Join thousands of creators building with AI. No credit card required.
            Get started in seconds.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link href="/auth/signin" className="btn-primary text-base inline-flex">
              <Sparkles className="w-5 h-5" />
              Start building free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-6 text-white/50 text-sm"
          >
            {["Free forever plan", "No credit card required", "Cancel anytime"].map(
              (text) => (
                <span key={text} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
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
      </div>
    </section>
  );
}
