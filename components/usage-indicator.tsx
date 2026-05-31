'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface UsageData {
  used: number;
  limit: number;
  tier: string;
}

export function UsageIndicator() {
  const { data: session } = useSession();
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchUsage();
    }
  }, [session]);

  const fetchUsage = async () => {
    try {
      const res = await fetch('/api/usage');
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  };

  if (!usage) return null;

  const percentage = Math.min((usage.used / usage.limit) * 100, 100);
  const remaining = usage.limit - usage.used;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-400">Daily Usage</span>
        <span className="text-sm font-medium text-white">
          {usage.tier === 'free' ? 'Free Plan' : `${usage.tier.charAt(0).toUpperCase() + usage.tier.slice(1)} Plan`}
        </span>
      </div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-2xl font-bold text-white">{usage.used}</span>
        <span className="text-sm text-gray-400">/ {usage.limit} generations</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            percentage > 80 ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {remaining === 0 && usage.tier === 'free' && (
        <p className="text-xs text-red-400 mt-2">
          Daily limit reached. Upgrade to Pro for more generations.
        </p>
      )}
    </div>
  );
}