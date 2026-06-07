"use client";

import { useState, useRef } from "react";
import {
  motion,
  useReducedMotion,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import Link from "next/link";
import { Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIERS } from "@/lib/stripe/stripe";

const tiers = [
  {
    key: "free",
    ...TIERS.free,
    popular: false,
    cta: "Get Started",
    href: "/auth/signin?callbackUrl=/generation",
    description: "For hobby projects",
    monthlyPrice: TIERS.free.price,
  },
  {
    key: "pro",
    ...TIERS.pro,
    popular: true,
    cta: "Subscribe",
    href: null,
    description: "For professionals",
    monthlyPrice: TIERS.pro.price,
  },
];

// 3D Tilt Pricing Card
function PricingCard({
  tier,
  index,
  isYearly,
}: {
  tier: (typeof tiers)[0];
  index: number;
  isYearly: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [isHovered, setIsHovered] = useState(false);

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

    const maxTilt = 8;
    rotateX.set((mouseY / (rect.height / 2)) * -maxTilt);
    rotateY.set((mouseX / (rect.width / 2)) * maxTilt);
  };

  const handleMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    setIsHovered(false);
  };

  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (tier.key === "free") return;
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tier.key }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const displayPrice = isYearly ? tier.monthlyPrice * 10 : tier.monthlyPrice;
  const priceSuffix = isYearly ? "/year" : "/month";
  const yearlySavings = tier.monthlyPrice > 0 ? tier.monthlyPrice * 2 : 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={() => setIsHovered(true)}
      className="relative"
      style={{ perspective: 1000 }}
    >
      <motion.div
        className={`relative h-full rounded-2xl border p-6 transition-colors duration-300 ${
          tier.popular
            ? "border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10"
            : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]"
        }`}
        style={{
          rotateX: rotateXSpring,
          rotateY: rotateYSpring,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Most Popular badge with shimmer */}
        {tier.popular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <motion.div
              className="relative overflow-hidden bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-medium px-4 py-1.5 rounded-full"
              whileHover={{ scale: 1.05 }}
            >
              <span className="relative z-10 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Most Popular
              </span>
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: "linear",
                }}
              />
            </motion.div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-1">{tier.name}</h3>
          <p
            className={`text-sm ${
              tier.popular ? "text-white/70" : "text-white/50"
            }`}
          >
            {tier.description}
          </p>
        </div>

        {/* Price with smooth animation */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">
              <AnimatePresence mode="wait">
                <motion.span
                  key={isYearly ? "yearly" : "monthly"}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  ${displayPrice}
                </motion.span>
              </AnimatePresence>
            </span>
            <span
              className={`text-sm ${
                tier.popular ? "text-white/60" : "text-white/40"
              }`}
            >
              {priceSuffix}
            </span>
          </div>

          {/* Yearly savings badge */}
          <AnimatePresence>
            {isYearly && tier.monthlyPrice > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
              >
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                  Save ${yearlySavings}/year
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ul className="space-y-3 mb-6">
          {tier.features.map((feature: string) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  tier.popular ? "text-violet-300" : "text-violet-400"
                }`}
              />
              <span
                className={
                  tier.popular ? "text-white/80" : "text-white/70"
                }
              >
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {tier.href ? (
          <Link href={tier.href} className="block">
            <Button
              variant={tier.popular ? "secondary" : "default"}
              className={`w-full ${
                tier.popular
                  ? "bg-white text-violet-600 hover:bg-white/90"
                  : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
              }`}
              size="sm"
            >
              {tier.cta}
            </Button>
          </Link>
        ) : (
          <Button
            variant={tier.popular ? "secondary" : "default"}
            className={`w-full ${
              tier.popular
                ? "bg-white text-violet-600 hover:bg-white/90"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
            }`}
            size="sm"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              tier.cta
            )}
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="pricing" className="py-24 relative bg-[#0A0A0B] overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-3xl"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, 30, 0],
                  y: [0, -20, 0],
                }
          }
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-fuchsia-500/5 rounded-full blur-3xl"
          animate={
            shouldReduceMotion
              ? undefined
              : {
                  x: [0, -20, 0],
                  y: [0, 30, 0],
                }
          }
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm font-medium text-violet-300 mb-6"
          >
            <Sparkles className="w-4 h-4" />
            Simple Pricing
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4"
          >
            Start free. Upgrade when you need more.
          </motion.h2>

          {/* Billing toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center gap-4"
          >
            <span
              className={`text-sm ${
                !isYearly ? "text-white" : "text-white/50"
              }`}
            >
              Monthly
            </span>

            <motion.button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative w-14 h-7 rounded-full p-1 transition-colors ${
                isYearly ? "bg-violet-500" : "bg-white/10"
              }`}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="w-5 h-5 bg-white rounded-full shadow-sm"
                animate={{ x: isYearly ? 26 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </motion.button>

            <span
              className={`text-sm ${
                isYearly ? "text-white" : "text-white/50"
              }`}
            >
              Yearly
            </span>

            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="ml-1 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full"
            >
              Save 17%
            </motion.span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto"
        >
          {tiers.map((tier, index) => (
            <PricingCard
              key={tier.key}
              tier={tier}
              index={index}
              isYearly={isYearly}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
