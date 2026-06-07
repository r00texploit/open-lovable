'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AuthFormProps {
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

export function AuthForm({ children, onSubmit, className = '' }: AuthFormProps) {
  return (
    <motion.form
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      onSubmit={onSubmit}
      className={`space-y-5 ${className}`}
    >
      {children}
    </motion.form>
  );
}

export function AuthFormItem({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={itemVariants}>
      {children}
    </motion.div>
  );
}

// Hook to use item variants outside this component
export { itemVariants };
