'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthForm, AuthFormItem } from '@/components/auth/auth-form';
import { PasswordInput } from '@/components/auth/password-input';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) {
      setStatus('error');
    }
  }, [token]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[A-Z])(?=.*[0-9])/.test(formData.password)) {
      newErrors.password = 'Password must contain at least 1 uppercase letter and 1 number';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: formData.password }),
      });

      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'error' && !token) {
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
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[24px] bg-red-300 text-[#22100d]"
          >
            <AlertCircle className="h-8 w-8" />
          </motion.div>

          <h2 className="mb-3 text-3xl font-black tracking-[-0.045em] text-[#fff7e8]">
            Invalid or expired link
          </h2>
          <p className="mb-6 text-[#d8c5a8]">
            The password reset link is invalid or has expired. Please request a new one.
          </p>

          <Link
            href="/auth/forgot-password"
            className="ol-primary-button inline-flex px-6 py-3"
          >
            Request new link
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </AuthCard>
    );
  }

  if (status === 'success') {
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
            Password reset complete
          </h2>
          <p className="mb-6 text-[#d8c5a8]">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>

          <Link
            href="/auth/signin"
            className="ol-primary-button inline-flex px-6 py-3"
          >
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </AuthCard>
    );
  }

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-3 text-4xl font-black tracking-[-0.055em] text-[#fff7e8] sm:text-5xl"
        >
          Create new password
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-sm leading-6 text-[#d8c5a8]"
        >
          Enter your new password below
        </motion.p>
      </div>

      <AuthForm onSubmit={handleSubmit}>
        <AuthFormItem>
          <PasswordInput
            label="New password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Create a strong password"
            error={errors.password}
            showStrength
          />
        </AuthFormItem>

        <AuthFormItem>
          <PasswordInput
            label="Confirm new password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="Confirm your password"
            error={errors.confirmPassword}
          />
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
                Reset password
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </motion.button>
        </AuthFormItem>
      </AuthForm>
    </AuthCard>
  );
}
