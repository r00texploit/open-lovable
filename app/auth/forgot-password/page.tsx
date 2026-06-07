'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthForm, AuthFormItem } from '@/components/auth/auth-form';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        setError('Failed to send reset link. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthCard>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="py-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#8f9b5b] text-[#11100d]"
          >
            <CheckCircle2 className="h-8 w-8" />
          </motion.div>

          <h2 className="mb-3 text-3xl font-black tracking-[-0.045em] text-[#fff7e8]">
            Check your email
          </h2>
          <p className="mb-6 text-[#d8c5a8]">
            We've sent a password reset link to{' '}
            <span className="font-semibold text-[#fff7e8]">{email}</span>
          </p>

          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 rounded-full border border-[#fff7e824] bg-[#fff7e812] px-6 py-3 font-semibold text-[#fff7e8] transition-colors duration-300 hover:bg-[#fff7e81c]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </motion.div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#d8c5a8] transition-colors hover:text-[#fff7e8]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </motion.div>

      <div className="mb-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#ff6728] text-[#211409]"
        >
          <Mail className="h-6 w-6" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-3 text-4xl font-black tracking-[-0.055em] text-[#fff7e8] sm:text-5xl"
        >
          Reset your password
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-sm leading-6 text-[#d8c5a8]"
        >
          Enter your email and we'll send a reset link if the account exists.
        </motion.p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-[18px] border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-200"
        >
          {error}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="ol-input py-3.5 pl-12 pr-4"
              />
            </div>
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
                Send reset link
                <ArrowLeft className="h-4 w-4 rotate-[135deg]" />
              </>
            )}
          </motion.button>
        </AuthFormItem>
      </AuthForm>
    </AuthCard>
  );
}
