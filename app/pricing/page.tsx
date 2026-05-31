'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { TIERS } from '@/lib/stripe/stripe';

const STRIPE_PRICE_IDS = {
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO!,
  team: process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM!,
};

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: string) => {
    if (!session) {
      router.push('/auth/signin?callbackUrl=/pricing');
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
        body: JSON.stringify({
          priceId: STRIPE_PRICE_IDS[tier as keyof typeof STRIPE_PRICE_IDS],
          tier,
        }),
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
    <div className="min-h-screen bg-gray-900 py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">Simple Pricing</h1>
          <p className="text-xl text-gray-400">Start free, upgrade when ready</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {Object.entries(TIERS).map(([key, tier]) => (
            <div
              key={key}
              className={`rounded-2xl p-8 ${
                key === 'pro'
                  ? 'bg-blue-600 border-2 border-blue-400'
                  : 'bg-gray-800 border border-gray-700'
              }`}
            >
              <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">${tier.price}</span>
                <span className="text-gray-400">/month</span>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-gray-300">
                    <Check className="w-5 h-5 mr-2 text-green-400" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(key)}
                disabled={loading === key}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  key === 'pro'
                    ? 'bg-white text-blue-600 hover:bg-gray-100'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                } disabled:opacity-50`}
              >
                {loading === key ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : key === 'free' ? (
                  'Get Started'
                ) : (
                  'Subscribe'
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
