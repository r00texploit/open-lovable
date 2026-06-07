"use client";

import {
  motion,
  useInView,
  useReducedMotion,
  useMotionValue,
  useSpring,
  Variants,
} from "framer-motion";
import { useRef, useState } from "react";
import { MessageSquare, Wand2, Eye, Rocket } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    title: "Describe your vision",
    description:
      "Tell our AI what you want to build. Use natural language - no technical jargon needed.",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Wand2,
    title: "AI generates code",
    description:
      "Our AI builds a complete React application with Tailwind CSS in seconds.",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: Eye,
    title: "Preview instantly",
    description:
      "Watch your website come to life with real-time preview as the AI builds it.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Rocket,
    title: "Deploy & share",
    description:
      "Deploy to Vercel, Netlify, or export clean code. Share your creation with the world.",
    color: "from-emerald-500 to-teal-500",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
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
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

// 3D Tilt Step Card
function StepCard({
  step,
  index,
  isInView,
}: {
  step: (typeof steps)[0];
  index: number;
  isInView: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 300 };
  const rotateXSpring = useSpring(rotateX, springConfig);
  const rotateYSpring = useSpring(rotateY, springConfig);

  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || shouldReduceMotion) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const maxTilt = 8;
    rotateX.set((mouseY / (rect.height / 2)) * -maxTilt);
    rotateY.set((mouseX / (rect.width / 2)) * maxTilt);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    setIsHovered(false);
  };

  return (
    <motion.div
      ref={ref}
      variants={itemVariants}
      className="relative group"
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovered(true)}
    >
      {/* Step number badge with pulse */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={
          isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }
        }
        transition={{
          delay: 0.5 + index * 0.15,
          type: "spring",
          stiffness: 200,
        }}
        className="absolute -top-4 -left-2 w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm font-bold flex items-center justify-center shadow-lg z-20"
      >
        <span className="relative">
          {index + 1}
          {/* Pulse ring */}
          <motion.span
            className="absolute inset-0 rounded-full bg-violet-500/50"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </span>
      </motion.div>

      <div className="relative pt-6">
        {/* 3D Card */}
        <motion.div
          className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300"
          style={{
            rotateX: rotateXSpring,
            rotateY: rotateYSpring,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Icon with 3D depth */}
          <motion.div
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 shadow-lg`}
            style={{ transform: "translateZ(20px)" }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <step.icon className="w-7 h-7 text-white" />
          </motion.div>

          {/* Content with depth */}
          <h3
            className="text-xl font-bold text-white mb-2"
            style={{ transform: "translateZ(10px)" }}
          >
            {step.title}
          </h3>
          <p
            className="text-white/60 text-sm leading-relaxed"
            style={{ transform: "translateZ(5px)" }}
          >
            {step.description}
          </p>
        </motion.div>

        {/* Animated connector line */}
        {index < steps.length - 1 && (
          <div className="hidden lg:block absolute top-1/2 -right-6 w-12 h-px overflow-visible">
            <motion.div
              initial={{ pathLength: 0, opacity: 0 }}
              animate={
                isInView
                  ? { pathLength: 1, opacity: 1 }
                  : { pathLength: 0, opacity: 0 }
              }
              transition={{
                delay: 0.7 + index * 0.15,
                duration: 0.6,
                ease: "easeOut",
              }}
              className="relative w-full h-full"
            >
              {/* Line */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-white/30 to-white/10"
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                transition={{
                  delay: 0.7 + index * 0.15,
                  duration: 0.6,
                  ease: "easeOut",
                }}
                style={{ originX: 0 }}
              />

              {/* Arrow head */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                transition={{
                  delay: 1 + index * 0.15,
                  duration: 0.3,
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t border-r border-white/40 rotate-45"
              />
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="py-32 relative bg-[#0A0A0B] overflow-hidden"
    >
      {/* Background decorations with parallax */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Animated gradient orbs */}
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, 50, 0],
                  y: [0, 30, 0],
                }
          }
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, -30, 0],
                  y: [0, -20, 0],
                }
          }
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={
              isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }
            }
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.1] text-sm font-medium text-white/80 mb-6"
          >
            <Wand2 className="w-4 h-4" />
            Simple Process
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6"
          >
            How it{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              works
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg text-white/60 max-w-2xl mx-auto"
          >
            From idea to deployed website in four simple steps. No coding
            required.
          </motion.p>
        </motion.div>

        {/* Steps with animated connectors */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {steps.map((step, index) => (
            <StepCard
              key={step.title}
              step={step}
              index={index}
              isInView={isInView}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
