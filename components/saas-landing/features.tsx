"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import {
  Sparkles,
  Eye,
  Layers,
  Palette,
  Rocket,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Generation",
    description:
      "Describe your website in natural language. Our AI generates production-ready React code in seconds using GPT-4o and Claude 3.5.",
    gradient: "from-orange-500 to-orange-600",
    size: "large",
  },
  {
    icon: Eye,
    title: "Real-time Preview",
    description:
      "Watch your website come to life instantly with live preview updates as you chat with AI.",
    gradient: "from-blue-500 to-cyan-500",
    size: "small",
  },
  {
    icon: Layers,
    title: "Multi-Model Support",
    description:
      "Choose from GPT-4o, Claude 3.5, Gemini 1.5. Pick the best AI for your needs.",
    gradient: "from-violet-500 to-purple-500",
    size: "small",
  },
  {
    icon: Rocket,
    title: "One-Click Deploy",
    description:
      "Deploy to Vercel, Netlify, or export as clean code. Your website, your way.",
    gradient: "from-pink-500 to-rose-500",
    size: "large",
  },
  {
    icon: Palette,
    title: "Brand Extraction",
    description:
      "Extract colors, fonts, and styles from any URL. Maintain brand consistency automatically.",
    gradient: "from-emerald-500 to-teal-500",
    size: "medium",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Average build time of 2 minutes. From idea to deployment faster than ever before.",
    gradient: "from-amber-500 to-yellow-500",
    size: "small",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const shouldReduceMotion = useReducedMotion();

  const sizeClasses: Record<string, string> = {
    small: "",
    medium: "md:col-span-2",
    large: "md:col-span-2 md:row-span-2",
  };

  return (
    <motion.div
      ref={ref}
      variants={itemVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={`group ${sizeClasses[feature.size]}`}
    >
      <div
        className="card-elevated h-full flex flex-col"
        style={{
          minHeight: feature.size === "large" ? "340px" : "180px",
        }}
      >
        {/* Gradient orb */}
        <div
          className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${feature.gradient} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity duration-500`}
        />

        <div className="relative z-10 flex flex-col h-full">
          {/* Icon */}
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg`}
          >
            <feature.icon className="w-6 h-6 text-white" />
          </div>

          {/* Content */}
          <h3 className="text-xl font-semibold text-white mb-3">
            {feature.title}
          </h3>
          <p className="text-white/60 text-base leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function Features() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="relative bg-black section-lg">
      <div className="container-modern">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white/80 mb-6">
            <Sparkles className="w-4 h-4 text-orange-400" />
            Features
          </span>
          <h2 className="text-headline text-white mb-5">
            Everything you need to build faster
          </h2>
          <p className="text-body text-white/60">
            Powerful AI tools that transform your ideas into production-ready
            websites. No coding required.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
