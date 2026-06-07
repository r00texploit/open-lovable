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
import {
  Sparkles,
  Eye,
  Layers,
  Palette,
  Rocket,
  Zap,
  Code2,
  Github,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Generation",
    description:
      "Describe your website in natural language. Our AI generates production-ready React code in seconds using GPT-4o and Claude 3.5.",
    color: "from-violet-500 to-fuchsia-500",
    col: "lg:col-span-2",
    row: "lg:row-span-2",
    hasPreview: true,
  },
  {
    icon: Eye,
    title: "Real-time Preview",
    description:
      "Watch your website come to life instantly with live preview updates as you chat with AI.",
    color: "from-cyan-500 to-blue-500",
    col: "lg:col-span-1",
    row: "lg:row-span-1",
    hasPreview: false,
  },
  {
    icon: Layers,
    title: "Multi-Model Support",
    description:
      "Choose from GPT-4o, Claude 3.5, Gemini 1.5. Pick the best AI for your needs.",
    color: "from-amber-500 to-orange-500",
    col: "lg:col-span-1",
    row: "lg:row-span-1",
    hasPreview: false,
  },
  {
    icon: Rocket,
    title: "One-Click Deploy",
    description:
      "Deploy to Vercel, Netlify, or export as clean code. Your website, your way.",
    color: "from-pink-500 to-rose-500",
    col: "lg:col-span-1",
    row: "lg:row-span-2",
    hasPreview: true,
  },
  {
    icon: Palette,
    title: "Brand Extraction",
    description:
      "Extract colors, fonts, and styles from any URL. Maintain brand consistency automatically.",
    color: "from-emerald-500 to-teal-500",
    col: "lg:col-span-2",
    row: "lg:row-span-1",
    hasPreview: true,
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Average build time of 2 minutes. From idea to deployment faster than ever before.",
    color: "from-yellow-500 to-amber-500",
    col: "lg:col-span-1",
    row: "lg:row-span-1",
    hasPreview: false,
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

// 3D Tilt Card Component
function TiltCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const shouldReduceMotion = useReducedMotion();

  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 300 };
  const rotateXSpring = useSpring(rotateX, springConfig);
  const rotateYSpring = useSpring(rotateY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || shouldReduceMotion) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const maxTilt = 10;
    const rotateXValue = (mouseY / (rect.height / 2)) * -maxTilt;
    const rotateYValue = (mouseX / (rect.width / 2)) * maxTilt;

    rotateX.set(rotateXValue);
    rotateY.set(rotateYValue);

    // Glare position
    const glareX = ((e.clientX - rect.left) / rect.width) * 100;
    const glareY = ((e.clientY - rect.top) / rect.height) * 100;
    setGlarePos({ x: glareX, y: glareY });
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    setIsHovered(false);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  return (
    <motion.div
      ref={ref}
      variants={itemVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={`group relative ${feature.col} ${feature.row} ${
        feature.row === "lg:row-span-2" ? "min-h-[420px]" : "min-h-[200px]"
      }`}
      style={{
        perspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      <motion.div
        className="relative h-full p-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm overflow-hidden transition-colors duration-300 hover:border-white/[0.15] hover:bg-white/[0.04]"
        style={{
          rotateX: rotateXSpring,
          rotateY: rotateYSpring,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Glass shimmer effect on hover */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isHovered
              ? `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.08) 0%, transparent 50%)`
              : "none",
            opacity: isHovered ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Animated gradient orb */}
        <motion.div
          className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${feature.color} opacity-10 blur-3xl`}
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  scale: [1, 1.2, 1],
                  opacity: isHovered ? [0.1, 0.2, 0.1] : [0.1, 0.15, 0.1],
                }
          }
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 h-full flex flex-col">
          {/* Icon with 3D depth */}
          <motion.div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
            style={{ transform: "translateZ(20px)" }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <feature.icon className="w-6 h-6 text-white" />
          </motion.div>

          {/* Content */}
          <h3
            className="text-xl font-bold text-white mb-2"
            style={{ transform: "translateZ(10px)" }}
          >
            {feature.title}
          </h3>
          <p
            className="text-white/60 text-sm leading-relaxed"
            style={{ transform: "translateZ(5px)" }}
          >
            {feature.description}
          </p>

          {/* Preview mockup for larger cards */}
          {feature.hasPreview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-auto pt-6"
            >
              {feature.title === "AI-Powered Generation" && (
                <div className="bg-white/[0.05] rounded-xl p-3 border border-white/[0.08] hover:border-white/[0.12] transition-colors">
                  <div className="flex items-center gap-2 text-xs text-white/40 mb-2">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>App.jsx</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2 bg-white/10 rounded w-3/4" />
                    <div className="h-2 bg-white/10 rounded w-full" />
                    <div className="h-2 bg-gradient-to-r from-violet-500/50 to-fuchsia-500/50 rounded w-1/2" />
                  </div>
                </div>
              )}

              {feature.title === "Brand Extraction" && (
                <div className="flex gap-2">
                  {["#8B5CF6", "#D946EF", "#F97316", "#10B981"].map(
                    (color, i) => (
                      <motion.div
                        key={color}
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                        whileHover={{
                          scale: 1.2,
                          rotate: 10,
                          y: -5,
                        }}
                        className="w-10 h-10 rounded-lg shadow-sm cursor-pointer transition-transform"
                        style={{ backgroundColor: color }}
                      />
                    )
                  )}
                </div>
              )}

              {feature.title === "One-Click Deploy" && (
                <div className="bg-white/[0.05] rounded-xl p-3 border border-white/[0.08] hover:border-white/[0.12] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <Github className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-xs">
                        <p className="font-medium text-white">Deploying...</p>
                        <p className="text-white/50">to production</p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="w-5 h-5 border-2 border-white/20 border-t-violet-500 rounded-full"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="features"
      ref={ref}
      className="py-32 relative bg-[#0A0A0B] overflow-hidden"
    >
      {/* Parallax background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/5 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl"
          animate={{
            x: [0, -30, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm font-medium text-violet-300 mb-6"
          >
            <Sparkles className="w-4 h-4" />
            Powerful Features
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6"
          >
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              ship faster
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg text-white/60 max-w-2xl mx-auto"
          >
            Complete toolkit for building modern websites without writing code.
            From idea to deployment in minutes, not days.
          </motion.p>
        </motion.div>

        {/* Bento Grid with 3D Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
        >
          {features.map((feature, index) => (
            <TiltCard key={feature.title} feature={feature} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
