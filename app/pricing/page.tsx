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
  Zap,
  Shield,
  Users,
  ArrowRight,
  HelpCircle,
  Crown,
  Clock,
  Infinity,
  Star,
  MessageSquare,
  Download,
  Github,
} from 'lucide-react';
import Button from '@/components/ui/shadcn/button';
import { SparkableLogo } from '@/components/brand/sparkable-logo';
import { formatTokenAmount, TIERS, type SubscriptionTier } from '@/lib/stripe/stripe';
import { getTierColor } from '@/lib/stripe/subscription-display';

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
    answer: 'The Free tier lets you try Sparkable with 50K tokens per month. No credit card required.',
  },
  {
    question: 'What\'s included in Team plan?',
    answer: 'Team plan includes 10M tokens per month, priority support, and soon, team collaboration features for working together on projects.',
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

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');
  const [hoveredTier, setHoveredTier] = useState<string | null>(null);

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
    <div className="min-h-screen bg-black">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white hover:text-violet-400 transition-colors">
            <SparkableLogo iconClassName="h-[32px] w-[32px]" textClassName="text-white" />
          </Link>
          <div className="flex items-center gap-4">
            {session ? (
              <Link href="/generation">
                <Button variant="tertiary" className="text-gray-300 hover:text-white border border-white/20 hover:border-white/40 hover:bg-white/10 transition-all flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Back to App
                </Button>
              </Link>
            ) : (
              <Link href="/auth/signin">
                <Button variant="tertiary" className="text-gray-300 hover:text-white border border-white/20 hover:border-white/40 hover:bg-white/10 transition-all">
                  Sign In
                </Button>
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Simple, transparent pricing
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Choose your plan
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
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
                isHovered={hoveredTier === tier}
                onHover={() => setHoveredTier(tier)}
                onLeave={() => setHoveredTier(null)}
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
            <h2 className="text-3xl font-bold text-white mb-4">Compare Plans</h2>
            <p className="text-gray-400">Find the perfect plan for your needs</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-gray-400 font-medium">Feature</th>
                  <th className="text-center p-4 text-gray-400 font-medium">Free</th>
                  <th className="text-center p-4 text-violet-400 font-medium">Pro</th>
                  <th className="text-center p-4 text-fuchsia-400 font-medium">Team</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, i) => (
                  <tr key={feature.name} className={i % 2 === 0 ? 'bg-white/5' : ''}>
                    <td className="p-4 text-gray-300">{feature.name}</td>
                    <td className="p-4 text-center">
                      {renderFeatureValue(feature.free)}
                    </td>
                    <td className="p-4 text-center">
                      {renderFeatureValue(feature.pro)}
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
            <h2 className="text-3xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-400">Everything you need to know about our pricing</p>
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
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 p-12">
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to start building?
              </h2>
              <p className="text-gray-300 mb-8 max-w-xl mx-auto">
                Join thousands of developers creating amazing websites with AI-powered generation.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href={session ? '/generation' : '/auth/signin'}>
                  <Button size="large" className="bg-white text-black hover:bg-gray-100">
                    {session ? 'Go to Dashboard' : 'Get Started Free'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="https://github.com" target="_blank">
                  <Button size="large" variant="tertiary" className="border-white/20 text-white hover:bg-white/10">
                    <Github className="w-4 h-4 mr-2" />
                    Star on GitHub
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">© 2024 Sparkable. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/settings" className="text-sm text-gray-400 hover:text-white transition-colors">
              Settings
            </Link>
            <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
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
  isHovered,
  onHover,
  onLeave,
}: {
  tier: SubscriptionTier;
  isCurrent: boolean;
  isLoading: boolean;
  onSubscribe: () => void;
  delay: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const tierData = TIERS[tier];
  const colors = getTierColor(tier);
  const isPopular = tier === 'pro';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`relative rounded-2xl overflow-hidden ${
        isPopular
          ? 'border-2 border-violet-500/50 shadow-2xl shadow-violet-500/20'
          : 'border border-white/10'
      } ${isHovered ? 'scale-[1.02]' : ''} transition-all duration-300`}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute top-0 right-0 bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
          MOST POPULAR
        </div>
      )}

      {/* Card Content */}
      <div className={`p-8 ${colors.bg} h-full flex flex-col`}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            {tier === 'pro' && <Crown className="w-5 h-5 text-violet-400" />}
            {tier === 'team' && <Users className="w-5 h-5 text-fuchsia-400" />}
            <h3 className={`text-2xl font-bold ${colors.text}`}>{tierData.name}</h3>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">${tierData.price}</span>
            <span className="text-gray-400">/month</span>
          </div>
          <p className="text-gray-400 mt-2 text-sm">
            {tier === 'free' && 'Perfect for trying out Sparkable'}
            {tier === 'pro' && 'Best for individual developers'}
            {tier === 'team' && 'For teams and agencies'}
          </p>
          <p className="text-gray-300 mt-3 text-sm font-medium">
            {formatTokenAmount(tierData.tokens)} tokens / month
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8 flex-1">
          {tierData.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check className={`w-5 h-5 flex-shrink-0 ${colors.text}`} />
              <span className="text-gray-300 text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        {isCurrent ? (
          <Button
            disabled
            className="w-full bg-white/10 text-white cursor-default"
          >
            Current Plan
          </Button>
        ) : tier === 'free' ? (
          <Link href="/generation" className="w-full">
            <Button variant="tertiary" className="w-full border-white/20 text-white hover:bg-white/10">
              Get Started
            </Button>
          </Link>
        ) : (
          <Button
            onClick={onSubscribe}
            disabled={isLoading}
            className={`w-full ${
              tier === 'pro'
                ? 'bg-violet-600 hover:bg-violet-500 text-white'
                : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Subscribe
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
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
      className="border border-white/10 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-medium text-white">{question}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
          <ArrowRight className={`w-4 h-4 text-gray-400 transform rotate-90`} />
        </motion.div>
      </button>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 pb-4"
        >
          <p className="text-gray-400">{answer}</p>
        </motion.div>
      )}
    </motion.div>
  );
}

function renderFeatureValue(value: boolean | string) {
  if (value === true) {
    return <Check className="w-5 h-5 text-green-400 mx-auto" />;
  }
  if (value === false) {
    return <span className="text-gray-600">—</span>;
  }
  return <span className="text-gray-300">{value}</span>;
}
