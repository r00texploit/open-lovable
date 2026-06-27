"use client";

import { motion, useInView, useSpring, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { TrendingUp, Users, Zap, Clock } from "lucide-react";

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const startTime = Date.now();
      const endValue = value;

      const animate = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(easeOut * endValue);
        setDisplayValue(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [isInView, value]);

  return (
    <span ref={ref}>
      {displayValue.toLocaleString()}{suffix}
    </span>
  );
}

const stats = [
  {
    icon: TrendingUp,
    value: 50000,
    suffix: "+",
    label: "Websites Generated",
    sublabel: "And counting",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Clock,
    value: 2,
    suffix: "min",
    label: "Average Build Time",
    sublabel: "Lightning fast",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Users,
    value: 10000,
    suffix: "+",
    label: "Active Developers",
    sublabel: "Building daily",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: Zap,
    value: 99,
    suffix: "%",
    label: "Uptime SLA",
    sublabel: "Enterprise ready",
    color: "from-emerald-500 to-teal-500",
  },
];

export function AnimatedStats() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/5 rounded-full blur-[200px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-4">
            Trusted at{" "}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              scale
            </span>
          </h2>
          <p className="text-lg text-white/60 max-w-xl mx-auto">
            Numbers that speak for themselves
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative group"
            >
              <div className="bg-white/[0.06] border border-white/[0.1] rounded-2xl p-6 lg:p-8 text-center hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300">
                {/* Icon */}
                <div className={`w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>

                {/* Animated Number */}
                <div className="text-4xl lg:text-5xl font-bold text-white mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>

                {/* Label */}
                <div className="text-white/80 font-medium mb-1">{stat.label}</div>
                <div className="text-white/40 text-sm">{stat.sublabel}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
