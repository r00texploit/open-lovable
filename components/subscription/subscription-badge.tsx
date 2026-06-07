'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { SubscriptionTier } from '@/lib/stripe/stripe';
import { getTierDisplayName, getTierColor } from '@/lib/stripe/subscription-display';

interface SubscriptionBadgeProps {
  tier?: SubscriptionTier;
  status?: string;
  showPulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SubscriptionBadge({
  tier = 'free',
  status = 'active',
  showPulse = true,
  size = 'md',
}: SubscriptionBadgeProps) {
  const [mounted, setMounted] = useState(false);
  const colors = getTierColor(tier);
  const displayName = getTierDisplayName(tier);
  const isActive = ['active', 'trialing'].includes(status);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="inline-flex items-center">
        <span className="bg-gray-500/20 text-gray-300 px-2 py-0.5 rounded-full text-xs font-medium">
          Free
        </span>
      </div>
    );
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <Link href="/settings" className="inline-flex items-center group">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative inline-flex items-center gap-2 ${colors.bg} ${colors.text} ${sizeClasses[size]} rounded-full font-medium border ${colors.border} transition-all duration-300 group-hover:scale-105`}
      >
        {/* Pulse indicator for active subscriptions */}
        {showPulse && isActive && tier !== 'free' && (
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colors.text.replace('text-', 'bg-')}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${colors.text.replace('text-', 'bg-')}`}></span>
          </span>
        )}

        <span>{displayName}</span>
      </motion.div>
    </Link>
  );
}

export function SubscriptionBadgeSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-12 h-5',
    md: 'w-16 h-6',
    lg: 'w-20 h-7',
  };

  return (
    <div className={`${sizeClasses[size]} bg-gray-700/50 rounded-full animate-pulse`} />
  );
}
