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
  Users,
  Check,
  ExternalLink,
  Loader2,
  Calendar,
  Shield,
  Sparkles,
  ArrowRight,
  Settings,
  Globe,
  LogOut,
} from 'lucide-react';
import { NoeronLogo } from '@/components/brand/noeron-logo';
import { UsageBar } from '@/components/subscription/usage-bar';
import { ManageSubscriptionButton } from '@/components/subscription/manage-button';
import { SiteSettingsPanel } from '@/components/site/site-settings-panel';
import {
  getTierDisplayName,
  getTierColor,
  getStatusColor,
  formatSubscriptionStatus,
} from '@/lib/stripe/subscription-display';
import { formatTokenAmount, TIERS, type SubscriptionTier } from '@/lib/stripe/stripe';

interface BillingHistoryItem {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  description: string;
}

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

const mockBillingHistory: BillingHistoryItem[] = [
  {
    id: 'inv_001',
    date: '2024-01-15',
    amount: 29,
    status: 'paid',
    description: 'Pro Plan - Monthly',
  },
  {
    id: 'inv_002',
    date: '2023-12-15',
    amount: 29,
    status: 'paid',
    description: 'Pro Plan - Monthly',
  },
];

const planOrder: SubscriptionTier[] = ['free', 'pro', 'plus', 'team'];

const planDescriptions: Record<SubscriptionTier, string> = {
  free: 'Try the builder and validate the flow.',
  pro: 'For regular builders shipping client or product work.',
  plus: 'For power users needing more tokens and API access.',
  team: 'A larger token pool for studios and small teams.',
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subscription' | 'usage' | 'billing' | 'sites'>('subscription');

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
      <div className="min-h-screen bg-[#fff7e8] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#8c4b26] mx-auto mb-4" />
          <p className="text-[#5f5343]">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#fff7e8] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="p-4 bg-[#8c4b26]/10 rounded-full inline-flex mb-6">
            <Shield className="w-8 h-8 text-[#8c4b26]" />
          </div>
          <h1 className="text-2xl font-bold text-[#17130f] mb-2">Sign In Required</h1>
          <p className="text-[#5f5343] mb-6">
            Please sign in to access your subscription settings and billing information.
          </p>
          <Link href="/auth/signin?callbackUrl=/settings">
            <button className="ol-primary-button group px-6 py-3">
              Sign In
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const tier = subscription?.tier || 'free';

  return (
    <div className="min-h-screen bg-[#fff7e8]">
      {/* Header */}
      <header className="border-b border-[#261e151f] bg-[#fff7e8]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#17130f] hover:text-[#8c4b26] transition-colors">
            <NoeronLogo iconClassName="h-[32px] w-[32px]" textClassName="text-[#17130f]" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/generation">
              <button className="px-4 py-2 text-sm text-[#5f5343] hover:text-[#17130f] transition-colors">
                Back to App
              </button>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex items-center gap-2 rounded-lg border border-[#261e151f] px-4 py-2 text-sm text-[#5f5343] transition-colors hover:bg-[#17130f]/5 hover:text-[#17130f]"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 py-10">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black tracking-[-0.035em] text-[#17130f] mb-2">Settings</h1>
          <p className="text-[#5f5343]">Manage your subscription, usage, and billing</p>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-1 mb-8 p-1 bg-[#17130f]/5 rounded-xl border border-[#261e151f] w-fit"
        >
          {[
            { id: 'subscription', label: 'Subscription', icon: Crown },
            { id: 'usage', label: 'Usage', icon: Zap },
            { id: 'billing', label: 'Billing', icon: CreditCard },
            { id: 'sites', label: 'Sites', icon: Globe },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#17130f] text-[#fff7e8]'
                  : 'text-[#5f5343] hover:text-[#17130f] hover:bg-[#17130f]/5'
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
              <FireCard>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#8c4b26] to-[#fa5d19] flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[#17130f]">
                      {session?.user?.name || 'User'}
                    </h2>
                    <p className="text-[#5f5343]">{session?.user?.email}</p>
                  </div>
                </div>
              </FireCard>

              {/* Subscription Card */}
              <FireCard>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[#17130f] mb-1">Current Plan</h3>
                    <p className="text-[#5f5343]">Your subscription details</p>
                  </div>
                  <TierBadge tier={tier} />
                </div>

                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center justify-between py-3 border-b border-[#261e151f]">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-[#5f5343]" />
                      <span className="text-[#5f5343]">Status</span>
                    </div>
                    <span className={`font-medium ${getStatusColor(subscription?.status || 'active')} capitalize`}>
                      {formatSubscriptionStatus(subscription?.status || 'active')}
                    </span>
                  </div>

                  {/* Current Period End */}
                  {subscription?.currentPeriodEnd && (
                    <div className="flex items-center justify-between py-3 border-b border-[#261e151f]">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-[#5f5343]" />
                        <span className="text-[#5f5343]">Current Period Ends</span>
                      </div>
                      <span className="text-[#17130f]">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {/* Cancel At Period End */}
                  {subscription?.cancelAtPeriodEnd && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-[#fa5d19]/10 border border-[#fa5d19]/20 rounded-lg flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-[#8c4b26] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[#8c4b26] font-medium">Subscription Ending</p>
                        <p className="text-[#8c4b26]/80 text-sm">
                          Your subscription will end on{' '}
                          {subscription?.currentPeriodEnd
                            ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                            : 'the next billing date'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-wrap gap-3">
                  {tier !== 'free' ? (
                    <ManageSubscriptionButton size="md">
                      Manage Subscription
                    </ManageSubscriptionButton>
                  ) : (
                    <Link href="/pricing">
                      <button className="ol-primary-button group px-6 py-3">
                        Upgrade Plan
                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                      </button>
                    </Link>
                  )}
                </div>
              </FireCard>

              {/* Available Plans */}
              {tier !== 'team' && (
                <FireCard>
                  <h3 className="text-lg font-semibold text-[#17130f] mb-2">Available Plans</h3>
                  <p className="text-[#5f5343] text-sm mb-6">Choose the plan that works best for you</p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {planOrder
                      .filter((t) => t !== tier)
                      .map((planTier) => (
                        <PlanCard
                          key={planTier}
                          tier={planTier}
                          isCurrent={false}
                          onSelect={() => (window.location.href = '/pricing')}
                        />
                      ))}
                  </div>
                </FireCard>
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
              <FireCard>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[#17130f]">Monthly Tokens</h3>
                    <p className="text-[#5f5343]">Track your token pool</p>
                  </div>
                  <div className="p-3 bg-[#8c4b26]/10 rounded-xl">
                    <Zap className="w-6 h-6 text-[#8c4b26]" />
                  </div>
                </div>

                <UsageBar
                  used={subscription?.usage.used || 0}
                  limit={subscription?.usage.limit || TIERS.free.tokens}
                  variant="card"
                  size="lg"
                />
              </FireCard>

              {/* Usage Stats */}
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
              {/* Billing History */}
              <FireCard>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[#17130f]">Billing History</h3>
                    <p className="text-[#5f5343]">View your past invoices</p>
                  </div>
                  <div className="p-3 bg-[#8c4b26]/10 rounded-xl">
                    <CreditCard className="w-6 h-6 text-[#8c4b26]" />
                  </div>
                </div>

                {tier === 'free' ? (
                  <div className="text-center py-8 text-[#5f5343]">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No billing history on the free plan</p>
                    <Link href="/pricing">
                      <button className="mt-4 px-4 py-2 border border-[#261e151f] text-[#17130f] rounded-lg hover:bg-[#17130f]/5 transition-colors">
                        Upgrade to Pro
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mockBillingHistory.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 bg-[#17130f]/5 rounded-lg hover:bg-[#17130f]/10 transition-colors"
                      >
                        <div>
                          <p className="text-[#17130f] font-medium">{invoice.description}</p>
                          <p className="text-[#5f5343] text-sm">{invoice.date}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[#17130f] font-medium">${invoice.amount}</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            invoice.status === 'paid'
                              ? 'bg-green-500/20 text-green-700'
                              : invoice.status === 'failed'
                              ? 'bg-red-500/20 text-red-700'
                              : 'bg-yellow-500/20 text-yellow-700'
                          }`}>
                            {invoice.status}
                          </span>
                          <ExternalLink className="w-4 h-4 text-[#5f5343] cursor-pointer hover:text-[#17130f]" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </FireCard>

              {/* Payment Method */}
              {tier !== 'free' && (
                <FireCard>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#8c4b26]/10 rounded-xl">
                        <CreditCard className="w-6 h-6 text-[#8c4b26]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[#17130f]">Payment Method</h3>
                        <p className="text-[#5f5343]">Manage your payment details</p>
                      </div>
                    </div>
                    <ManageSubscriptionButton variant="outline">
                      Update
                    </ManageSubscriptionButton>
                  </div>
                </FireCard>
              )}
            </motion.div>
          )}

          {activeTab === 'sites' && (
            <motion.div
              key="sites"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <SiteSettingsPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Helper Components

function FireCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border border-[#261e151f] bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </motion.div>
  );
}

function TierBadge({ tier }: { tier: SubscriptionTier }) {
  const isFree = tier === 'free';
  const isPro = tier === 'pro';
  const isPlus = tier === 'plus';
  const isTeam = tier === 'team';

  return (
    <div
      className={`px-4 py-2 rounded-full font-medium border ${
        isFree
          ? 'bg-gray-100 text-gray-700 border-gray-200'
          : isPro
          ? 'bg-[#8c4b26]/10 text-[#8c4b26] border-[#8c4b26]/20'
          : isPlus
          ? 'bg-[#fa5d19]/10 text-[#fa5d19] border-[#fa5d19]/20'
          : 'bg-[#9061ff]/10 text-[#9061ff] border-[#9061ff]/20'
      }`}
    >
      {getTierDisplayName(tier)}
    </div>
  );
}

function PlanCard({ tier, isCurrent, onSelect }: { tier: SubscriptionTier; isCurrent: boolean; onSelect: () => void }) {
  const tierData = TIERS[tier];
  const isFree = tier === 'free';
  const isPro = tier === 'pro';
  const isPlus = tier === 'plus';
  const isTeam = tier === 'team';

  const accentColor = isPro ? '#8c4b26' : isPlus ? '#fa5d19' : isTeam ? '#9061ff' : '#17130f';

  return (
    <div
      className={`relative p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
        isCurrent
          ? 'border-[#8c4b26] bg-gradient-to-br from-[#8c4b26]/5 to-white'
          : isPro
          ? 'border-[#8c4b26]/30 bg-gradient-to-br from-[#8c4b26]/5 to-white hover:border-[#8c4b26]/50'
          : isPlus
          ? 'border-[#fa5d19]/30 bg-gradient-to-br from-[#fa5d19]/5 to-white hover:border-[#fa5d19]/50'
          : isTeam
          ? 'border-[#9061ff]/30 bg-gradient-to-br from-[#9061ff]/5 to-white hover:border-[#9061ff]/50'
          : 'border-[#261e151f] bg-white hover:border-[#8c4b26]/30'
      }`}
    >
      {/* Popular badge for Plus */}
      {isPlus && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#fa5d19] text-white text-xs font-bold rounded-full shadow-lg">
          POPULAR
        </div>
      )}

      <div className="flex items-start justify-between mb-5">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-bold text-lg text-[#17130f]">{tierData.name}</h4>
            {isPlus && <Sparkles className="w-4 h-4 text-[#fa5d19]" />}
            {isTeam && <Users className="w-4 h-4 text-[#9061ff]" />}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-[#17130f]">${tierData.price}</span>
            <span className="text-[#5f5343] font-medium">/mo</span>
          </div>
        </div>
      </div>

      <div className="mb-4 p-3 rounded-lg bg-[#fff7e8]/50 border border-[#261e151f]/10">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" style={{ color: accentColor }} />
          <span className="font-semibold text-[#17130f]">{formatTokenAmount(tierData.tokens)} tokens</span>
        </div>
        <p className="text-xs text-[#5f5343] mt-1">per month</p>
      </div>

      <p className="text-sm text-[#5f5343] mb-5 leading-relaxed">{planDescriptions[tier]}</p>

      <ul className="space-y-3 mb-6">
        {tierData.features.slice(0, 3).map((feature, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                 style={{ backgroundColor: `${accentColor}15` }}>
              <Check className="w-3 h-3" style={{ color: accentColor }} />
            </div>
            <span className="text-[#5f5343]">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrent}
        className={`w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
          isCurrent
            ? 'bg-[#17130f]/10 text-[#5f5343] cursor-default'
            : isFree
            ? 'bg-white text-[#17130f] border-2 border-[#261e151f] hover:border-[#8c4b26] hover:bg-[#fff7e8]'
            : 'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
        }`}
        style={
          !isCurrent && !isFree
            ? { backgroundColor: accentColor, boxShadow: `0 4px 14px ${accentColor}40` }
            : undefined
        }
      >
        {isCurrent ? 'Current Plan' : 'Select Plan'}
      </button>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, suffix }: { icon: typeof Zap; label: string; value: number | string; suffix: string }) {
  return (
    <FireCard className="text-center">
      <div className="p-3 bg-[#8c4b26]/10 rounded-xl inline-flex mb-3">
        <Icon className="w-5 h-5 text-[#8c4b26]" />
      </div>
      <p className="text-3xl font-bold text-[#17130f] mb-1">{value}</p>
      <p className="text-[#5f5343] text-sm">{label}</p>
      {suffix && <p className="text-[#5f5343]/70 text-xs mt-1">{suffix}</p>}
    </FireCard>
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
