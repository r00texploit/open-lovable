'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Chrome } from 'lucide-react';

export default function SignIn() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signIn('google', { callbackUrl });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Sign in to Open Lovable</h2>
          <p className="mt-2 text-gray-400">Start building AI-generated websites</p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-700 rounded-lg text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <Chrome className="w-5 h-5" />
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="text-center text-sm text-gray-500 mt-4">
            <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </div>
      </div>
    </div>
  );
}
