'use client';

import { motion } from 'framer-motion';
import { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  showStrength?: boolean;
  value?: string;
}

function calculateStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 5);
}

const strengthLabels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
const strengthColors = [
  'bg-red-500',
  'bg-red-400',
  'bg-[#c9a557]',
  'bg-[#d7b35d]',
  'bg-[#8f9b5b]',
  'bg-[#768548]',
];

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, label, showStrength = false, value = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const strength = calculateStrength(value);

    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-semibold text-[#ead7b8]">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            className={cn(
              `
                ol-input
                px-4 py-3.5 pr-12
                ${error
                  ? '!border-red-400/70 focus:!border-red-400'
                  : ''
                }
                ${isFocused ? 'bg-[#fff7e81c]' : ''}
              `,
              className
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="
              absolute right-3 top-1/2 -translate-y-1/2
              rounded-full p-2
              text-[#ead7b899] hover:text-[#fff7e8]
              hover:bg-[#fff7e814]
              transition-colors duration-300
            "
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Strength indicator */}
        {showStrength && value && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            <div className="flex gap-1 h-1">
              {[0, 1, 2, 3, 4].map((index) => (
                <motion.div
                  key={index}
                  className={cn(
                    'flex-1 rounded-full transition-colors duration-300',
                    index < strength ? strengthColors[strength - 1] : 'bg-white/10'
                  )}
                />
              ))}
            </div>
            <p className={cn(
              'text-xs',
              strength < 2 ? 'text-red-400' :
              strength < 4 ? 'text-[#d7b35d]' : 'text-[#a9b56a]'
            )}>
              {strengthLabels[strength]}
            </p>
          </motion.div>
        )}

        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-sm text-red-300"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-300" />
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
