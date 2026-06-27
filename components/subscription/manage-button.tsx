'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ExternalLink, CreditCard } from 'lucide-react';

interface ManageSubscriptionButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

export function ManageSubscriptionButton({
  variant = 'default',
  size = 'md',
  children = 'Manage Subscription',
}: ManageSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleManage = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Failed to create portal session');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses = {
    default: 'bg-brand-orange hover:bg-brand-orange-hover text-warm-900',
    outline: 'bg-transparent border border-warm-750/12 text-warm-500 hover:bg-warm-800/5 hover:text-warm-800',
    ghost: 'bg-transparent text-warm-600 hover:text-warm-800 hover:bg-warm-800/5',
  };

  return (
    <motion.button
      whileHover={{ scale: loading ? 1 : 1.02 }}
      whileTap={{ scale: loading ? 1 : 0.98 }}
      onClick={handleManage}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <CreditCard className="w-4 h-4" />
          {children}
          <ExternalLink className="w-3 h-3 opacity-50" />
        </>
      )}
    </motion.button>
  );
}
