'use client';

import { Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthForm, AuthFormItem } from '@/components/auth/auth-form';
import { SocialButton } from '@/components/auth/social-button';
import { PasswordInput } from '@/components/auth/password-input';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = '/generation';
  const error = searchParams.get('error');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    await signIn('credentials', {
      email: formData.email,
      password: formData.password,
      callbackUrl,
      redirect: true,
    });
  };

  const handleGoogleSignIn = async () => {
    console.log('[SignIn] Google signIn clicked, callbackUrl:', callbackUrl);
    setLoading(true);
    await signIn('google', { callbackUrl, redirect: true });
  };

  return (
    <AuthCard>
      <div className="mb-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#ff6728] text-[#211409]"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </motion.div>

        <h1 className="text-4xl font-black tracking-[-0.055em] text-[#fff7e8] sm:text-5xl">
          Welcome back
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#d8c5a8]">
          Continue to your sandbox, generated files, and live preview.
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-[18px] border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-200"
        >
          {error === 'CredentialsSignin'
            ? 'Invalid email or password'
            : 'An error occurred. Please try again.'}
        </motion.div>
      )}

      <AuthForm onSubmit={handleSubmit}>
        <AuthFormItem>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#ead7b8]">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#ead7b899]" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className={`
                  ol-input pl-12 pr-4 py-3.5
                  ${errors.email
                    ? '!border-red-400/70 focus:!border-red-400'
                    : ''
                  }
                `}
              />
            </div>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-sm text-red-300"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-300" />
                {errors.email}
              </motion.p>
            )}
          </div>
        </AuthFormItem>

        <AuthFormItem>
          <PasswordInput
            label="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter your password"
            error={errors.password}
          />
        </AuthFormItem>

        <AuthFormItem>
          <div className="flex items-center justify-between">
            <Link
              href="/auth/forgot-password"
              className="text-sm font-semibold text-[#ffb07f] transition-colors hover:text-[#ffd0ad]"
            >
              Forgot password?
            </Link>
          </div>
        </AuthFormItem>

        <AuthFormItem>
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="ol-primary-button group relative w-full px-4 py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </motion.button>
        </AuthFormItem>
      </AuthForm>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative my-6"
      >
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#fff7e81a]" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[#11100d] px-3 text-[#d8c5a899]">
            Or continue with
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <SocialButton
          provider="google"
          onClick={handleGoogleSignIn}
          loading={loading}
        />
      </motion.div>

      {/* Sign up link */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 text-center text-sm text-[#d8c5a8]"
      >
        Don't have an account?{' '}
        <Link
          href="/auth/signup"
          className="font-semibold text-[#ffb07f] transition-colors hover:text-[#ffd0ad]"
        >
          Sign up
        </Link>
      </motion.p>
    </AuthCard>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#fff7e81a] rounded w-3/4 mx-auto" />
          <div className="h-4 bg-[#fff7e81a] rounded w-1/2 mx-auto" />
          <div className="space-y-2 pt-4">
            <div className="h-12 bg-[#fff7e81a] rounded" />
            <div className="h-12 bg-[#fff7e81a] rounded" />
          </div>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
