'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getNextResetTime } from '@/lib/stripe/subscription-display';
import { Zap, AlertCircle } from 'lucide-react';

interface UsageBarProps {
  used: number;
  limit: number;
  showLabel?: boolean;
  showTimer?: boolean;
  showRemaining?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'card';
}

function formatTokens(value: number) {
  return new Intl.NumberFormat('en', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

export function UsageBar({
  used,
  limit,
  showLabel = true,
  showTimer = true,
  showRemaining = false,
  size = 'md',
  variant = 'default',
}: UsageBarProps) {
  const [mounted, setMounted] = useState(false);
  const [resetTime, setResetTime] = useState(getNextResetTime());
  const percentage = Math.min((used / limit) * 100, 100);
  const remaining = Math.max(0, limit - used);
  const isNearLimit = percentage >= 80;
  const isAtLimit = used >= limit;

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setResetTime(getNextResetTime());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full">
        <div className="h-2 bg-warm-800/10 rounded-full animate-pulse" />
      </div>
    );
  }

  const sizeClasses = {
    sm: { bar: 'h-1.5', text: 'text-xs' },
    md: { bar: 'h-2', text: 'text-sm' },
    lg: { bar: 'h-3', text: 'base' },
  };

  const getBarColor = () => {
    if (isAtLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-heat-100';
    return 'bg-gradient-to-r from-warm-600 to-heat-100';
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${isAtLimit ? 'text-red-500' : 'text-brand-orange'}`} />
          <span className={`text-sm font-medium ${isAtLimit ? 'text-red-500' : 'text-foreground'}`}>
            {formatTokens(used)}/{formatTokens(limit)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <div className={`w-24 ${sizeClasses[size].bar} bg-warm-800/10 rounded-full overflow-hidden`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full ${getBarColor()} rounded-full`}
            />
          </div>
          {showRemaining && (
            <span className="text-[10px] text-warm-500">
              {isAtLimit ? 'Limit reached' : `${formatTokens(remaining)} tokens left`}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="bg-white border border-warm-750/12 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className={`w-5 h-5 ${isAtLimit ? 'text-red-500' : 'text-warm-600'}`} />
            <span className="text-warm-800 font-medium">Monthly Tokens</span>
          </div>
          <span className={`text-lg font-bold ${isAtLimit ? 'text-red-500' : 'text-warm-800'}`}>
            {formatTokens(used)}/{formatTokens(limit)}
          </span>
        </div>

        <div className={`${sizeClasses[size].bar} bg-warm-800/10 rounded-full overflow-hidden mb-3`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full ${getBarColor()} rounded-full`}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-warm-500">
            {remaining > 0 ? `${formatTokens(remaining)} tokens remaining` : 'Token limit reached'}
          </span>
          {showTimer && (
            <span className="text-warm-500/70">Monthly reset in {resetTime}</span>
          )}
        </div>

        {isAtLimit && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600">
              Monthly token limit reached. Upgrade for more tokens.
            </span>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${isAtLimit ? 'text-red-500' : 'text-warm-600'}`} />
            <span className={`${sizeClasses[size].text} text-warm-500`}>Monthly Tokens</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`${sizeClasses[size].text} font-medium ${isAtLimit ? 'text-red-500' : 'text-warm-800'}`}>
              {formatTokens(used)}/{formatTokens(limit)}
            </span>
            {showTimer && (
              <span className="text-xs text-warm-500/70">({resetTime})</span>
            )}
          </div>
        </div>
      )}

      <div className={`${sizeClasses[size].bar} bg-warm-800/10 rounded-full overflow-hidden`}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full ${getBarColor()} rounded-full`}
        />
      </div>

      {isAtLimit && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-xs text-red-500 flex items-center gap-1"
        >
          <AlertCircle className="w-3 h-3" />
          Monthly token limit reached
        </motion.div>
      )}
    </div>
  );
}
