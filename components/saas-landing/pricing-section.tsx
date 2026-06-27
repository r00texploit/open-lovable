"use client";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { Check, Loader2, Sparkles } from "lucide-react";
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
  {
    key: "plus",
    ...TIERS.plus,
    popular: false,
    cta: "Subscribe",
    href: null,
    description: "For power users",
    monthlyPrice: TIERS.plus.price,
  },
  {
    key: "team",
    ...TIERS.team,
    popular: false,
    cta: "Subscribe",
    href: null,
    description: "For teams",
    monthlyPrice: TIERS.team.price,
  },
];

function PricingCard({
  tier,
  index,
  isYearly,
}: {
  tier: (typeof tiers)[0];
  index: number;
  isYearly: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayPrice = isYearly ? tier.monthlyPrice * 10 : tier.monthlyPrice;
  const priceSuffix = isYearly ? "/year" : "/month";
  const yearlySavings = tier.monthlyPrice > 0 ? tier.monthlyPrice * 2 : 0;

  const handleSubscribe = async () => {
    if (tier.key === "free") return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tier.key,
          billingCycle: isYearly ? 'yearly' : 'monthly',
        }),
      });

      if (response.status === 401) {
        window.location.href = "/auth/signin";
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      if (data.url) window.location.href = data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      }}
      className="relative"
    >
      <div
        className={`card-elevated h-full ${
          tier.popular
            ? "border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-orange-600/5"
            : ""
        }`}
      >
        {/* Most Popular badge */}
        {tier.popular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-flex items-center gap-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-medium px-4 py-1.5 rounded-full shadow-lg shadow-orange-500/25">
              <Sparkles className="w-3 h-3" />
              Most Popular
            </span>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-1">{tier.name}</h3>
          <p className="text-sm text-white/50">{tier.description}</p>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">
              {tier.key === 'free' ? 'Free' : `$${displayPrice}`}
            </span>
            <span className="text-sm text-white/40">{tier.key === 'free' ? '' : priceSuffix}</span>
          </div>

          {/* Yearly savings - hide for free plan */}
          {isYearly && tier.monthlyPrice > 0 && tier.key !== 'free' && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                Save ${yearlySavings}/year
              </span>
            </div>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8">
          {tier.features.map((feature: string) => (
            <li key={feature} className="flex items-start gap-3 text-sm">
              <Check className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <span className="text-white/70">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        {tier.href ? (
          <Link href={tier.href} className="block">
            <button
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                tier.popular
                  ? "btn-primary"
                  : "btn-secondary"
              }`}
            >
              {tier.cta}
            </button>
          </Link>
        ) : (
          <>
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                tier.popular ? "btn-primary" : "btn-secondary"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Loading...
                </>
              ) : (
                tier.cta
              )}
            </button>
            {error && (
              <p className="mt-3 text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

export function PricingSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="relative bg-black section-lg">
      <div className="container-modern">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white/80 mb-6">
            <Sparkles className="w-4 h-4 text-orange-400" />
            Pricing
          </span>
          <h2 className="text-headline text-white mb-5">
            Simple, transparent pricing
          </h2>
          <p className="text-body text-white/60">
            Start free, upgrade when you need more power.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <span
            className={`text-sm ${!isYearly ? "text-white" : "text-white/50"}`}
          >
            Monthly
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            aria-label="Switch to yearly billing"
            aria-pressed={isYearly}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
              isYearly ? "bg-orange-500" : "bg-white/10"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${
                isYearly ? "translate-x-7" : ""
              }`}
            />
          </button>
          <span
            className={`text-sm ${isYearly ? "text-white" : "text-white/50"}`}
          >
            Yearly
          </span>
          {isYearly && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
              Save 17%
            </span>
          )}
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <PricingCard
              key={tier.key}
              tier={tier}
              index={index}
              isYearly={isYearly}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
