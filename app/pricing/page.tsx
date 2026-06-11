'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check,
  Loader2,
  Sparkles,
  Users,
  ArrowRight,
  Crown,
} from 'lucide-react';
import { NoeronLogo } from '@/components/brand/noeron-logo';
import { formatTokenAmount, TIERS, type SubscriptionTier } from '@/lib/stripe/stripe';

const faqs = [
  {
    question: 'What happens when I use all my tokens?',
    answer: 'When your monthly token pool is used up, you can upgrade to a higher tier for more tokens.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can cancel your subscription at any time. You\'ll continue to have access until the end of your current billing period.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards through Stripe, our secure payment processor.',
  },
  {
    question: 'Is Free available without a card?',
    answer: 'The Free tier lets you try Noeron with 50K tokens per month. No credit card required.',
  },
  {
    question: 'What\'s included in Team plan?',
    answer: 'Team plan includes 5M tokens per month, priority support, and soon, team collaboration features for working together on projects.',
  },
];

const features = [
  { name: 'Monthly Tokens', free: '50K', pro: '500K', plus: '1.5M', team: '5M' },
  { name: 'Export Code', free: false, pro: true, plus: true, team: true },
  { name: 'Priority Support', free: false, pro: true, plus: true, team: true },
  { name: 'API Access', free: false, pro: false, plus: true, team: true },
  { name: 'Team Collaboration', free: false, pro: false, plus: false, team: true },
  { name: 'All Styles', free: 'Basic', pro: true, plus: true, team: true },
  { name: 'Custom Integrations', free: false, pro: false, plus: false, team: true },
];

const tierDescriptions: Record<SubscriptionTier, string> = {
  free: 'Perfect for trying out Noeron',
  pro: 'Best for individual developers',
  plus: 'For power users and heavy builds',
  team: 'For teams and agencies',
};

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');

  useEffect(() => {
    if (session?.user?.subscription?.tier) {
      setCurrentTier(session.user.subscription.tier as SubscriptionTier);
    }
  }, [session]);

  const handleSubscribe = async (tier: string) => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (tier === 'free') {
      return;
    }

    setLoading(tier);

    try {
      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen ol-shell">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#ff6728]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#8c4b26]/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[#261e151f] bg-[#fff7e8]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#17130f] hover:text-[#8c4b26] transition-colors">
            <NoeronLogo iconClassName="h-[32px] w-[32px]" textClassName="text-[#17130f]" />
          </Link>
          <div className="flex items-center gap-4">
            {session ? (
              <Link
                href="/generation"
                className="flex items-center gap-2 rounded-full border border-[#261e151f] px-4 py-2 text-sm text-[#5f5343] transition-colors hover:bg-[#17130f]/5 hover:text-[#17130f]"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to App
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className="rounded-full border border-[#261e151f] px-4 py-2 text-sm text-[#5f5343] transition-colors hover:bg-[#17130f]/5 hover:text-[#17130f]"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6728]/10 border border-[#ff6728]/30 text-[#8c4b26] text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Simple, transparent pricing
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.045em] text-[#17130f] mb-6">
              Choose your plan
            </h1>
            <p className="text-xl text-[#5f5343] max-w-2xl mx-auto">
              Start with a monthly token pool and upgrade when your builds need more room. No hidden fees, cancel anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {(['free', 'pro', 'plus', 'team'] as SubscriptionTier[]).map((tier, index) => (
              <PricingCard
                key={tier}
                tier={tier}
                isCurrent={currentTier === tier}
                isLoading={loading === tier}
                onSubscribe={() => handleSubscribe(tier)}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-black tracking-[-0.035em] text-[#17130f] mb-4">Compare Plans</h2>
            <p className="text-[#5f5343]">Find the perfect plan for your needs</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="overflow-hidden rounded-2xl ol-bezel"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#261e151f]">
                  <th className="text-left p-4 text-[#5f5343] font-medium">Feature</th>
                  <th className="text-center p-4 text-[#5f5343] font-medium">Free</th>
                  <th className="text-center p-4 text-[#ff6728] font-semibold">Pro</th>
                  <th className="text-center p-4 text-[#8c4b26] font-semibold">Plus</th>
                  <th className="text-center p-4 text-[#17130f] font-semibold">Team</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, i) => (
                  <tr key={feature.name} className={i % 2 === 0 ? 'bg-[#17130f]/[0.03]' : ''}>
                    <td className="p-4 text-[#17130f]">{feature.name}</td>
                    <td className="p-4 text-center">
                      {renderFeatureValue(feature.free)}
                    </td>
                    <td className="p-4 text-center">
                      {renderFeatureValue(feature.pro)}
                    </td>
                    <td className="p-4 text-center">
                      {renderFeatureValue(feature.plus)}
                    </td>
                    <td className="p-4 text-center">
                      {renderFeatureValue(feature.team)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-black tracking-[-0.035em] text-[#17130f] mb-4">Frequently Asked Questions</h2>
            <p className="text-[#5f5343]">Everything you need to know about our pricing</p>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="relative overflow-hidden rounded-3xl ol-ink-panel p-12">
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-black tracking-[-0.035em] text-[#fff7e8] mb-4">
                Ready to start building?
              </h2>
              <p className="text-[#d8c5a8] mb-8 max-w-xl mx-auto">
                Scrape a site or describe an idea, and shape a working React app in the live sandbox.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href={session ? '/generation' : '/auth/signin'} className="ol-primary-button px-6 py-3 text-sm">
                  {session ? 'Go to Dashboard' : 'Get Started Free'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-[#261e151f] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#5f5343]">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">© {new Date().getFullYear()} Noeron. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/settings" className="text-sm text-[#5f5343] hover:text-[#17130f] transition-colors">
              Settings
            </Link>
            <Link href="#" className="text-sm text-[#5f5343] hover:text-[#17130f] transition-colors">
              Privacy
            </Link>
            <Link href="#" className="text-sm text-[#5f5343] hover:text-[#17130f] transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper Components

function PricingCard({
  tier,
  isCurrent,
  isLoading,
  onSubscribe,
  delay,
}: {
  tier: SubscriptionTier;
  isCurrent: boolean;
  isLoading: boolean;
  onSubscribe: () => void;
  delay: number;
}) {
  const tierData = TIERS[tier];
  const isPopular = tier === 'pro';

  // The popular tier sits on a dark ink card; the rest use the light bezel
  const headingColor = isPopular ? 'text-[#fff7e8]' : 'text-[#17130f]';
  const bodyColor = isPopular ? 'text-[#d8c5a8]' : 'text-[#5f5343]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className={`relative rounded-3xl overflow-hidden transition-transform duration-300 hover:-translate-y-1 ${
        isPopular ? 'border-2 border-[#ff6728] shadow-[0_24px_60px_rgba(255,103,40,0.22)]' : 'ol-bezel'
      }`}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute top-0 right-0 bg-[#ff6728] text-[#20130a] text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
          MOST POPULAR
        </div>
      )}

      {/* Card Content */}
      <div className={`p-8 h-full flex flex-col ${isPopular ? 'ol-ink-panel' : ''}`}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            {tier === 'pro' && <Crown className="w-5 h-5 text-[#ff6728]" />}
            {tier === 'team' && <Users className="w-5 h-5 text-[#8c4b26]" />}
            <h3 className={`text-2xl font-bold ${headingColor}`}>{tierData.name}</h3>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-black ${headingColor}`}>${tierData.price}</span>
            <span className={bodyColor}>/month</span>
          </div>
          <p className={`mt-2 text-sm ${bodyColor}`}>
            {tierDescriptions[tier]}
          </p>
          <p className={`mt-3 text-sm font-semibold ${isPopular ? 'text-[#ffb07f]' : 'text-[#8c4b26]'}`}>
            {formatTokenAmount(tierData.tokens)} tokens / month
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8 flex-1">
          {tierData.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check className="w-5 h-5 flex-shrink-0 text-[#ff6728]" />
              <span className={`text-sm ${bodyColor}`}>{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        {isCurrent ? (
          <div className={`flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold ${
            isPopular
              ? 'bg-[#fff7e8]/10 text-[#fff7e8]'
              : 'bg-[#17130f]/5 text-[#5f5343]'
          }`}>
            Current Plan
          </div>
        ) : tier === 'free' ? (
          <Link href="/generation" className="ol-secondary-button w-full px-4 py-2.5 text-sm">
            Get Started
          </Link>
        ) : (
          <button
            onClick={onSubscribe}
            disabled={isLoading}
            className={`flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${
              isPopular
                ? 'ol-primary-button'
                : 'rounded-full bg-[#17130f] font-semibold text-[#fff7e8] transition-colors hover:bg-[#2a221a]'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Subscribe
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function FAQItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="rounded-xl overflow-hidden ol-bezel"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-[#17130f]/[0.03]"
      >
        <span className="font-semibold text-[#17130f]">{question}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ArrowRight className="w-4 h-4 text-[#8c4b26] transform rotate-90" />
        </motion.div>
      </button>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 pb-4"
        >
          <p className="text-[#5f5343]">{answer}</p>
        </motion.div>
      )}
    </motion.div>
  );
}

function renderFeatureValue(value: boolean | string) {
  if (value === true) {
    return <Check className="w-5 h-5 text-[#ff6728] mx-auto" />;
  }
  if (value === false) {
    return <span className="text-[#5f534366]">—</span>;
  }
  return <span className="text-[#5f5343]">{value}</span>;
}
