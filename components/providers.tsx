'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { MotionProvider } from '@/components/motion/motion-provider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <MotionProvider>
        {children}
      </MotionProvider>
    </SessionProvider>
  );
}
