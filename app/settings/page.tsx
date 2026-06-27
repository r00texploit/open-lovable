'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  CreditCard,
  AlertCircle,
  Zap,
  Clock,
  Crown,
  Check,
  ExternalLink,
  Calendar,
  Shield,
  Sparkles,
  ArrowRight,
  Globe,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { NoeronLogo } from '@/components/brand/noeron-logo';
import {
  getTierDisplayName,
  formatSubscriptionStatus,
} from '@/lib/stripe/subscription-display';
import { formatTokenAmount, TIERS, type SubscriptionTier } from '@/lib/stripe/stripe';

interface SubscriptionData {
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid' | 'paused';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  usage: {
    used: number;
    limit: number;
    unit?: string;
    period?: string;
  };
  isSubscribed: boolean;
  stripeCustomerId?: string | null;
}

const planOrder: SubscriptionTier[] = ['free', 'pro', 'plus'];

const planDescriptions: Record<SubscriptionTier, string> = {
  free: 'Try the builder and validate the flow.',
  pro: 'For regular builders shipping client or product work.',
  plus: 'For power users needing more tokens and API access.',
  team: 'For studios and teams.',
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subscription' | 'usage' | 'billing'>('subscription');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSubscription();
    }
  }, [status]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background-base flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-heat-100 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground-dimmer">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-background-base flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="p-4 bg-heat-8 rounded-2xl inline-flex mb-6">
            <Shield className="w-8 h-8 text-heat-100" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Sign In Required</h1>
          <p className="text-foreground-dimmer mb-6">
            Please sign in to access your subscription settings and billing information.
          </p>
          <Link href="/auth/signin?callbackUrl=/settings">
            <button className="btn btn-primary">
              Sign In
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const tier = subscription?.tier || 'free';
  const usagePercent = Math.round(((subscription?.usage.used || 0) / (subscription?.usage.limit || 1)) * 100);

  return (
    <div className="min-h-screen bg-background-base">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background-lighter/80 backdrop-blur-xl border-b border-border-faint">
        <div className="container-modern">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <NoeronLogo iconClassName="h-7 w-7" textClassName="text-foreground font-semibold" />
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/generation" className="btn btn-ghost">
                Back to App
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="btn btn-secondary-light-light"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container-modern py-10">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-foreground-dimmer mt-1">Manage your subscription, usage, and billing</p>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-1 mb-8 p-1 bg-background-lighter rounded-xl border border-border-muted w-fit"
        >
          {[
            { id: 'subscription', label: 'Subscription', icon: Crown },
            { id: 'usage', label: 'Usage', icon: Zap },
            { id: 'billing', label: 'Billing', icon: CreditCard },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-foreground text-white'
                  : 'text-foreground-dimmer hover:text-foreground hover:bg-background-base'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'subscription' && (
            <motion.div
              key="subscription"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Profile Card */}
              <div className="bg-background-lighter rounded-2xl border border-border-faint p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-heat-100 to-heat-200 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {session?.user?.name || 'User'}
                    </h2>
                    <p className="text-foreground-dimmer">{session?.user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Subscription Card */}
              <div className="bg-background-lighter rounded-2xl border border-border-faint p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">Current Plan</h3>
                    <p className="text-foreground-dimmer text-sm">Your subscription details</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    tier === 'free'
                      ? 'bg-background-base text-foreground-dimmer'
                      : tier === 'pro'
                      ? 'bg-heat-8 text-heat-100'
                      : 'bg-accent-amethyst/10 text-accent-amethyst'
                  }`}>
                    {getTierDisplayName(tier)}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border-faint">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-foreground-dimmer" />
                      <span className="text-foreground-dimmer">Status</span>
                    </div>
                    <span className="font-medium text-foreground capitalize">
                      {formatSubscriptionStatus(subscription?.status || 'active')}
                    </span>
                  </div>

                  {subscription?.currentPeriodEnd && (
                    <div className="flex items-center justify-between py-3 border-b border-border-faint">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-foreground-dimmer" />
                        <span className="text-foreground-dimmer">Current Period Ends</span>
                      </div>
                      <span className="text-foreground">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {subscription?.cancelAtPeriodEnd && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-700 font-medium">Subscription Ending</p>
                        <p className="text-red-600 text-sm">
                          Your subscription will end on{' '}
                          {subscription?.currentPeriodEnd
                            ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                            : 'the next billing date'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {tier === 'free' ? (
                    <Link href="/pricing">
                      <button className="btn btn-primary">
                        Upgrade Plan
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </Link>
                  ) : (
                    <button className="btn btn-secondary-light">
                      Manage Subscription
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Available Plans */}
              {tier !== 'plus' && (
                <div className="bg-background-lighter rounded-2xl border border-border-faint p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Available Plans</h3>
                  <p className="text-foreground-dimmer text-sm mb-6">Choose the plan that works best for you</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {planOrder
                      .filter((t) => t !== tier)
                      .map((planTier) => (
                        <PlanCard key={planTier} tier={planTier} />
                      ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'usage' && (
            <motion.div
              key="usage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Usage Summary */}
              <div className="bg-background-lighter rounded-2xl border border-border-faint p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Monthly Tokens</h3>
                    <p className="text-foreground-dimmer text-sm">Track your token pool</p>
                  </div>
                  <div className="p-3 bg-heat-8 rounded-xl">
                    <Zap className="w-6 h-6 text-heat-100" />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-foreground-dimmer">
                      {formatTokenAmount(subscription?.usage.used || 0)} used
                    </span>
                    <span className="text-foreground font-medium">
                      {formatTokenAmount(subscription?.usage.limit || TIERS.free.tokens)} total
                    </span>
                  </div>
                  <div className="h-2 bg-background-base rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-heat-100 to-heat-200 rounded-full transition-all"
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-foreground-dimmer mt-2">{usagePercent}% used this month</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid sm:grid-cols-3 gap-4">
                <StatCard
                  icon={Zap}
                  label="Monthly Limit"
                  value={formatTokenAmount(subscription?.usage.limit || TIERS.free.tokens)}
                  suffix="tokens"
                />
                <StatCard
                  icon={Check}
                  label="Used This Month"
                  value={formatTokenAmount(subscription?.usage.used || 0)}
                  suffix="tokens"
                />
                <StatCard
                  icon={Clock}
                  label="Monthly Reset"
                  value={getTimeUntilReset()}
                  suffix=""
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'billing' && (
            <motion.div
              key="billing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-background-lighter rounded-2xl border border-border-faint p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Billing History</h3>
                    <p className="text-foreground-dimmer text-sm">View your past invoices</p>
                  </div>
                  <div className="p-3 bg-heat-8 rounded-xl">
                    <CreditCard className="w-6 h-6 text-heat-100" />
                  </div>
                </div>

                {tier === 'free' ? (
                  <div className="text-center py-8 text-foreground-dimmer">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No billing history on the free plan</p>
                    <Link href="/pricing">
                      <button className="mt-4 btn btn-secondary-light">
                        Upgrade to Pro
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-4 rounded-xl bg-background-base p-6">
                    <p className="text-foreground-dimmer">
                      Your invoices and receipts are managed securely by Stripe. Open the
                      billing portal to view, download, or update payment details.
                    </p>
                    <button className="btn btn-secondary-light">
                      View invoices in Stripe
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {tier !== 'free' && (
                <div className="bg-background-lighter rounded-2xl border border-border-faint p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-heat-8 rounded-xl">
                        <CreditCard className="w-6 h-6 text-heat-100" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Payment Method</h3>
                        <p className="text-foreground-dimmer text-sm">Manage your payment details</p>
                      </div>
                    </div>
                    <button className="btn btn-secondary-light">
                      Update
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Helper Components

function PlanCard({ tier }: { tier: SubscriptionTier }) {
  const tierData = TIERS[tier];
  const isPro = tier === 'pro';
  const isPlus = tier === 'plus';

  return (
    <div className="relative p-5 rounded-xl border border-border-muted bg-background-lighter hover:border-heat-40 hover:shadow-lg transition-all">
      {isPlus && (
        <div className="absolute -top-2 left-4 px-2 py-0.5 bg-heat-100 text-white text-xs font-semibold rounded-full">
          Popular
        </div>
      )}

      <div className="mb-4">
        <h4 className="font-semibold text-foreground mb-1">{tierData.name}</h4>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">${tierData.price}</span>
          <span className="text-foreground-dimmer text-sm">/mo</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-heat-100 mb-3">
        <Zap className="w-4 h-4" />
        <span className="font-medium">{formatTokenAmount(tierData.tokens)} tokens</span>
      </div>

      <p className="text-xs text-foreground-dimmer mb-4">{planDescriptions[tier]}</p>

      <ul className="space-y-2 mb-4">
        {tierData.features.slice(0, 3).map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground-dimmer">
            <Check className="w-4 h-4 text-heat-100 flex-shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link href="/pricing" className="block">
        <button className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isPro
            ? 'bg-heat-100 text-white hover:bg-heat-200'
            : 'bg-background-base text-foreground hover:bg-border-faint'
        }`}>
          Select Plan
        </button>
      </Link>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, suffix }: { icon: typeof Zap; label: string; value: number | string; suffix: string }) {
  return (
    <div className="bg-background-lighter rounded-2xl border border-border-faint p-6 text-center">
      <div className="p-3 bg-heat-8 rounded-xl inline-flex mb-3">
        <Icon className="w-5 h-5 text-heat-100" />
      </div>
      <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
      <p className="text-foreground-dimmer text-sm">{label}</p>
      {suffix && <p className="text-foreground-dimmer text-xs mt-1">{suffix}</p>}
    </div>
  );
}

function getTimeUntilReset(): string {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const diff = nextMonth.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}
