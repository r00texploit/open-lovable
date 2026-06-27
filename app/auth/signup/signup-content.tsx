'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthForm, AuthFormItem } from '@/components/auth/auth-form';
import { SocialButton } from '@/components/auth/social-button';
import { PasswordInput } from '@/components/auth/password-input';
import { Mail, User, ArrowRight, Loader2, Check } from 'lucide-react';

export function SignUpContent() {
  const callbackUrl = '/generation';
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

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

    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const email = formData.email.trim().toLowerCase();

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          terms: acceptedTerms,
        }),
      });

      if (response.ok) {
        // Auto sign in after registration
        console.log('[SignUp] Registration successful, calling signIn with callbackUrl:', callbackUrl);
        await signIn('credentials', {
          email,
          password: formData.password,
          callbackUrl,
          redirect: true,
        });
      } else {
        const data = await response.json();
        const field = typeof data.field === 'string' ? data.field : 'form';
        setErrors({ [field]: data.error || 'Failed to create account' });
        setLoading(false);
      }
    } catch {
      setErrors({ form: 'An error occurred. Please try again.' });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    console.log('[SignUp] Google signIn clicked, callbackUrl:', callbackUrl);
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
          className="mb-6 flex h-12 w-12 items-center justify-center rounded-[18px] bg-brand-orange text-warm-800"
        >
          <User className="h-6 w-6" />
        </motion.div>

        <h1 className="text-4xl font-black tracking-[-0.055em] text-warm-100 sm:text-5xl">
          Create your account
        </h1>
        <p className="mt-3 text-sm leading-6 text-warm-300">
          Start with a URL, prompt your edits, and keep the React files.
        </p>
      </div>

      <AuthForm onSubmit={handleSubmit}>
        {errors.form && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[18px] border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-200"
          >
            {errors.form}
          </motion.div>
        )}

        <AuthFormItem>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-warm-200">
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-warm-200/60" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Maya Chen"
                className={`
                  ol-input pl-12 pr-4 py-3.5
                  ${errors.name
                    ? '!border-red-400/70 focus:!border-red-400'
                    : ''
                  }
                `}
              />
            </div>
            {errors.name && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-sm text-red-300"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-300" />
                {errors.name}
              </motion.p>
            )}
          </div>
        </AuthFormItem>

        <AuthFormItem>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-warm-200">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-warm-200/60" />
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
            placeholder="Create a strong password"
            error={errors.password}
            showStrength
          />
        </AuthFormItem>

        <AuthFormItem>
          <PasswordInput
            label="Confirm password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="Confirm your password"
            error={errors.confirmPassword}
          />
        </AuthFormItem>

        <AuthFormItem>
          <motion.button
            type="button"
            onClick={() => setAcceptedTerms(!acceptedTerms)}
            className={`
              flex w-full items-start gap-3 rounded-[18px] p-3 text-left
              transition-colors duration-300
              ${acceptedTerms ? 'bg-brand-orange/8' : 'bg-warm-100/4'}
              ${errors.terms ? 'border border-red-400/60' : 'border border-warm-100/7'}
            `}
          >
            <div
              className={`
                flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border
                transition-all duration-300
                ${acceptedTerms
                  ? 'border-brand-orange bg-brand-orange text-warm-800'
                  : 'border-warm-100/30 hover:border-warm-100/60'
                }
              `}
            >
              {acceptedTerms && <Check className="h-3.5 w-3.5" />}
            </div>
            <span className="text-sm leading-6 text-warm-300">
              I agree to the{' '}
              <Link href="/terms" className="font-semibold text-brand-orange-light transition-colors hover:text-brand-orange-lighter">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="font-semibold text-brand-orange-light transition-colors hover:text-brand-orange-lighter">
                Privacy Policy
              </Link>
            </span>
          </motion.button>
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
                Create account
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
          <div className="w-full border-t border-warm-100/10" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-warm-900 px-3 text-warm-300/60">
            Or sign up with
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

      {/* Sign in link */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 text-center text-sm text-warm-300"
      >
        Already have an account?{' '}
        <Link
          href="/auth/signin"
          className="font-semibold text-brand-orange-light transition-colors hover:text-brand-orange-lighter"
        >
          Sign in
        </Link>
      </motion.p>
    </AuthCard>
  );
}
