"use client";

import { motion, useInView, useReducedMotion, Variants } from "framer-motion";
import { useRef } from "react";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "Noeron saved us weeks of development time. We built our entire landing page in under 10 minutes. The AI truly understands design patterns.",
    author: "Sarah Chen",
    role: "CEO at TechStart",
    initials: "SC",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    quote:
      "The AI-generated code is surprisingly clean and production-ready. Best developer tool I've used this year. It's become essential for our workflow.",
    author: "Michael Rodriguez",
    role: "Senior Developer at Vercel",
    initials: "MR",
    color: "from-cyan-500 to-blue-500",
  },
  {
    quote:
      "We migrated our entire marketing site in a day. The multi-model support is a game changer. Being able to choose between GPT-4o and Claude is incredible.",
    author: "Emily Watson",
    role: "Head of Design at Stripe",
    initials: "EW",
    color: "from-amber-500 to-orange-500",
  },
];

const logos = [
  { name: "Vercel", width: "w-20" },
  { name: "Stripe", width: "w-16" },
  { name: "Notion", width: "w-20" },
  { name: "Linear", width: "w-20" },
  { name: "Figma", width: "w-16" },
  { name: "Slack", width: "w-20" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export function Testimonials() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  return (
    <section ref={ref} className="py-32 relative bg-black overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <motion.div
          animate={shouldReduceMotion ? undefined : { scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm font-medium text-violet-300 mb-6"
          >
            <Star className="w-4 h-4" />
            Loved by developers
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6"
          >
            Trusted by{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              thousands
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg text-white/60 max-w-2xl mx-auto"
          >
            See what developers and teams are saying about building with AI.
          </motion.p>
        </motion.div>

        {/* Testimonials */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-3 gap-6 mb-20"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              variants={itemVariants}
              whileHover={
                shouldReduceMotion ? undefined : { y: -8, scale: 1.02, transition: { duration: 0.3 } }
              }
              className="group relative"
            >
              <div className="relative p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 h-full">
                {/* Quote icon */}
                <div
                  className={`absolute -top-4 -right-4 w-10 h-10 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center shadow-lg`}
                >
                  <Quote className="w-5 h-5 text-white" />
                </div>

                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>

                <p className="text-white/70 text-base leading-relaxed mb-6">"{testimonial.quote}"</p>

                <div className="flex items-center gap-4 mt-auto">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-sm font-bold text-white shadow-md`}
                  >
                    {testimonial.initials}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-white">{testimonial.author}</div>
                    <div className="text-sm text-white/50">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Logos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center"
        >
          <p className="text-sm text-white/50 uppercase tracking-wider mb-10">Trusted by teams at</p>
          <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-8">
            {logos.map((logo, index) => (
              <motion.div
                key={logo.name}
                initial={{ opacity: 0, y: 10 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                whileHover={{ scale: 1.08, y: -3 }}
                className={`${logo.width} opacity-60 hover:opacity-100 transition-all duration-300`}
              >
                <div className="text-xl font-bold bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent drop-shadow-[0_0_12px_color-mix(in_srgb,var(--accent-white)_30%,transparent)]">
                  {logo.name}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
