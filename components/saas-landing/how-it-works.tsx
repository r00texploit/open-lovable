"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { MessageSquare, Wand2, Eye, Rocket, Sparkles } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    title: "Describe your vision",
    description:
      "Tell our AI what you want to build. Use natural language - no technical jargon needed.",
    gradient: "from-violet-500 to-purple-500",
    step: "01",
  },
  {
    icon: Wand2,
    title: "AI generates code",
    description:
      "Our AI builds a complete React application with Tailwind CSS in seconds.",
    gradient: "from-blue-500 to-cyan-500",
    step: "02",
  },
  {
    icon: Eye,
    title: "Preview instantly",
    description:
      "Watch your website come to life with real-time preview as the AI builds it.",
    gradient: "from-orange-500 to-amber-500",
    step: "03",
  },
  {
    icon: Rocket,
    title: "Deploy & share",
    description:
      "Deploy to Vercel, Netlify, or export clean code. Share your creation with the world.",
    gradient: "from-emerald-500 to-teal-500",
    step: "04",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
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

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="relative bg-black section-lg">
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
            How it works
          </span>
          <h2 className="text-headline text-white mb-5">
            From idea to website in minutes
          </h2>
          <p className="text-body text-white/60">
            Four simple steps to transform your vision into a production-ready
            website.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {steps.map((step, index) => (
            <motion.div key={step.title} variants={itemVariants}>
              <div className="card-elevated h-full flex flex-col relative overflow-hidden">
                {/* Step Number */}
                <span className="absolute top-4 right-4 text-5xl font-bold text-white/[0.03]">
                  {step.step}
                </span>

                {/* Gradient orb */}
                <div
                  className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${step.gradient} opacity-10 blur-2xl`}
                />

                <div className="relative z-10 flex flex-col h-full">
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-5 shadow-lg`}
                  >
                    <step.icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-white/60 text-base leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Connector line (except for last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-white/10 to-transparent" />
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
