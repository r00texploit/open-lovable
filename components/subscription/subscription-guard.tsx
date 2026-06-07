'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AlertCircle, Lock } from 'lucide-react';
import Button from '@/components/ui/shadcn/button';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiredTier?: 'free' | 'pro' | 'team';
}

interface SubscriptionData {
  tier: 'free' | 'pro' | 'team';
  isSubscribed: boolean;
  usage: {
    used: number;
    limit: number;
  };
}

export function SubscriptionGuard({
  children,
  fallback,
  requiredTier = 'pro',
}: SubscriptionGuardProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchSubscription();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-gray-800/50 rounded-lg" />
      </div>
    );
  }

  const hasAccess = subscription && checkTierAccess(subscription.tier, requiredTier);
  const isAtLimit = (subscription?.usage.used ?? 0) >= (subscription?.usage.limit ?? 0);

  if (!hasAccess || isAtLimit) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <UpgradePrompt
        currentTier={subscription?.tier || 'free'}
        requiredTier={requiredTier}
        isAtLimit={isAtLimit}
      />
    );
  }

  return <>{children}</>;
}

function checkTierAccess(currentTier: string, requiredTier: string): boolean {
  const tierLevels: Record<string, number> = {
    free: 0,
    pro: 1,
    team: 2,
  };

  return tierLevels[currentTier] >= tierLevels[requiredTier];
}

interface UpgradePromptProps {
  currentTier: string;
  requiredTier: string;
  isAtLimit?: boolean;
}

function UpgradePrompt({ currentTier, requiredTier, isAtLimit }: UpgradePromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10" />

      <div className="relative">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-violet-500/20 rounded-xl">
            {isAtLimit ? (
              <AlertCircle className="w-6 h-6 text-violet-400" />
            ) : (
              <Lock className="w-6 h-6 text-violet-400" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">
              {isAtLimit ? 'Monthly Token Limit Reached' : 'Upgrade Required'}
            </h3>
            <p className="text-gray-400 mb-4">
              {isAtLimit
                ? "You've used your monthly token pool. Upgrade to Pro for more tokens."
                : `This feature requires a ${requiredTier} subscription. Upgrade to unlock.`}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/pricing">
                <Button className="bg-violet-600 hover:bg-violet-500 text-white">
                  {isAtLimit ? 'Upgrade to Pro' : 'View Pricing'}
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="tertiary" className="border-white/20 text-white hover:bg-white/10"
                >
                  Manage Subscription
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchSubscription();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Failed to refresh subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return { subscription, loading, refresh };
}
