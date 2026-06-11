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
    default: 'bg-[#ff6728] hover:bg-[#ff7b3d] text-[#20130a]',
    outline: 'bg-transparent border border-[#261e151f] text-[#5f5343] hover:bg-[#17130f]/5 hover:text-[#17130f]',
    ghost: 'bg-transparent text-[#8c4b26] hover:text-[#17130f] hover:bg-[#17130f]/5',
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
