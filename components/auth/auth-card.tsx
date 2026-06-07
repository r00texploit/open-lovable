'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AuthCardProps {
  children: ReactNode;
  className?: string;
}

export function AuthCard({ children, className = '' }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`
        relative w-full
        ol-auth-card
        rounded-[30px]
        p-6 sm:p-8
        overflow-hidden
        ${className}
      `}
    >
      <div
        className="absolute inset-0 rounded-[30px] opacity-70"
        style={{
          background: 'radial-gradient(circle at 12% 0%, rgba(255,103,40,0.18), transparent 32%)',
        }}
      />

      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
