'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const AISandboxPage = dynamic(
  () => import('./page-content'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>
  }
);

export default function GenerationClient() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <AISandboxPage />
    </Suspense>
  );
}